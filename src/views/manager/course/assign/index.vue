<template>
  <!-- P035 课程分配：列表 + 分配抽屉（同名同路径重写）
       旧页无四态、分配详情只能悬浮看；这里补齐加载/错误/空态，详情可点开也可键盘聚焦 -->
  <div class="asg">
    <div v-if="loadError" class="asg__err" role="alert">
      <span>{{ loadError }}</span>
      <a-button size="small" @click="getList">{{ t('重试') }}</a-button>
    </div>

    <div class="asg__tool">
      <a-select v-model:value="query.classify" :options="classifyOptions" :placeholder="t('课程类型')"
                style="width: 132px" @change="handleQuery" />
      <a-input v-model:value="query.courseName" :placeholder="t('请输入课程名称关键字')" allow-clear
               style="width: 232px" @press-enter="handleQuery">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-button type="primary" @click="handleQuery">{{ t('搜索') }}</a-button>
      <a-button @click="resetQuery">{{ t('重置') }}</a-button>
      <span class="asg__spacer" />
      <span class="asg__hint">{{ t('分配决定哪些班级与教师可以使用这门课教学') }}</span>
    </div>

    <div class="asg__body">
      <a-spin :spinning="loading" :tip="t('正在加载数据中...')">
        <a-table v-show="loading || rows.length" :columns="columns" :data-source="rows" :pagination="false" row-key="courseId"
                 size="middle" :scroll="{ x: 900 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'cover'">
              <CourseTable :course="record" :label-list="labelList" />
            </template>

            <template v-else-if="column.key === 'assignDetail'">
              <div v-if="assignOf(record).length" class="asg__sum">
                <a-popover :trigger="['hover']" placement="leftTop" :overlay-style="{ maxWidth: '540px' }"
                           :open="popOpenKey === record.courseId"
                           @open-change="(v) => { popOpenKey = v ? record.courseId : '' }">
                  <template #title>
                    <span class="asg__pop-t">{{ t('《{name}》分配详情', { name: record.courseName }) }}</span>
                  </template>
                  <template #content>
                    <div class="asg__pop">
                      <div class="asg__pop-hd">
                        <span>{{ t('教师') }}</span><span>{{ t('班级') }}</span><span>{{ t('类型') }}</span>
                      </div>
                      <div v-for="(d, i) in assignOf(record)" :key="d.assignId || i" class="asg__pop-row">
                        <a-tag color="warning" class="asg__pop-tag">{{ teacherName(d.teacherId) }}</a-tag>
                        <a-tag color="processing" class="asg__pop-tag">{{ classesName(d.classesId) }}</a-tag>
                        <a-tag :color="Number(d.assignType) === 1 ? 'red' : 'green'" class="asg__pop-tag">
                          {{ Number(d.assignType) === 1 ? t('协作') : t('教学') }}
                        </a-tag>
                      </div>
                    </div>
                  </template>
                  <button type="button" class="asg__sum-btn"
                          :aria-expanded="popOpenKey === record.courseId"
                          :aria-label="t('查看《{name}》的 {n} 条分配详情', { name: record.courseName, n: assignOf(record).length })"
                          @click="popOpenKey = popOpenKey === record.courseId ? '' : record.courseId">
                    <b>{{ assignOf(record).length }}</b>
                    <span>{{ t('个分配') }}</span>
                  </button>
                </a-popover>

                <div class="asg__chips">
                  <a-tag v-for="(d, i) in assignOf(record).slice(0, 2)" :key="i" class="asg__chip">
                    {{ teacherName(d.teacherId) }} · {{ classesName(d.classesId) || t('未选班级') }}
                  </a-tag>
                  <span v-if="assignOf(record).length > 2" class="asg__more">
                    {{ t('另有 {n} 条', { n: assignOf(record).length - 2 }) }}
                  </span>
                </div>
              </div>
              <a-tag v-else class="asg__none-tag">{{ t('暂未分配') }}</a-tag>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-button type="primary" ghost size="small" @click="handleAssign(record)">
                <template #icon><TeamOutlined /></template>
                {{ t('分配管理') }}
              </a-button>
            </template>
          </template>
        </a-table>

        <div v-if="!loading && !rows.length" class="asg__empty" role="status">
          <div class="asg__empty-t">{{ loadError ? t('课程列表接口没有返回数据') : t('没有匹配的课程') }}</div>
          <div class="asg__empty-d">{{ t('调整课程类型或名称关键字后重新搜索。') }}</div>
          <a-button size="small" @click="resetQuery">{{ t('重置查询条件') }}</a-button>
        </div>
      </a-spin>

      <Pagination :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize"
                  @pagination="getList" />
    </div>

    <!-- 分配抽屉 -->
    <a-drawer v-model:open="open" :title="drawerTitle" :width="drawerWidth" :mask-closable="false" @close="cancel">
      <a-alert type="info" show-icon class="asg__note"
               :message="t('分配类型说明')"
               :description="t('教学分配：分配的人员仅可用于教学；协作分配：分配的人员可编辑课程并用于教学。修改已有分配的类型会立即保存。')" />

      <section class="asg__sec">
        <header class="asg__sec-hd">
          <span class="asg__sec-t">{{ t('已有分配') }}</span>
          <a-tag class="asg__sec-n">{{ historyList.length }}</a-tag>
        </header>
        <p v-if="!historyList.length" class="asg__sec-empty">{{ t('该课程还没有分配记录') }}</p>
        <div v-for="(h, i) in historyList" :key="h.assignId || `h${i}`" class="asg__row">
          <div class="asg__who">
            <UserOutlined class="asg__who-ico" aria-hidden="true" />
            <span :title="teacherName(h.teacherId)">{{ teacherName(h.teacherId) || t('未知用户') }}</span>
          </div>
          <div class="asg__cls">{{ classesName(h.classesId) || t('未选班级') }}</div>
          <a-radio-group :value="Number(h.assignType)" size="small" class="asg__type"
                         @change="(e) => changeAssignType(h, e.target.value)">
            <a-radio-button :value="0">{{ t('教学') }}</a-radio-button>
            <a-radio-button :value="1">{{ t('协作') }}</a-radio-button>
          </a-radio-group>
          <a-tooltip :title="canDelete(h) ? t('删除这条分配') : t('该班级教师已开启学习，暂不可删除此分配')">
            <a-button danger size="small" :disabled="!canDelete(h)" @click="deleteAssign(h, i)">
              {{ t('删除') }}
            </a-button>
          </a-tooltip>
        </div>
      </section>

      <section class="asg__sec">
        <header class="asg__sec-hd">
          <span class="asg__sec-t">{{ t('本次新增') }}</span>
          <a-tag class="asg__sec-n">{{ form.assignList.length }}</a-tag>
          <span class="asg__spacer" />
          <a-button type="primary" ghost size="small" @click="toChooseUser">
            <template #icon><PlusOutlined /></template>
            {{ t('选择分配用户') }}
          </a-button>
        </header>
        <p v-if="!form.assignList.length" class="asg__sec-empty">
          {{ t('点「选择分配用户」挑教师；新增的分配需要先选好班级才能提交。') }}
        </p>
        <div v-for="(a, i) in form.assignList" :key="a.uid" class="asg__row">
          <div class="asg__who">
            <UserOutlined class="asg__who-ico" aria-hidden="true" />
            <span :title="a.teacherName">{{ a.teacherName || t('未命名用户') }}</span>
          </div>
          <a-select v-if="Number(a.type) === 0" v-model:value="a.classesId" :options="classOptions"
                    :placeholder="t('请选择班级')" size="small" class="asg__cls-sel" show-search
                    :filter-option="filterClass" />
          <div v-else class="asg__cls">{{ t('协作分配无需选班级') }}</div>
          <a-radio-group v-model:value="a.assignType" size="small" class="asg__type">
            <a-radio-button :value="0">{{ t('教学') }}</a-radio-button>
            <a-radio-button :value="1">{{ t('协作') }}</a-radio-button>
          </a-radio-group>
          <a-button danger size="small" @click="removeAssign(i)">{{ t('移除') }}</a-button>
        </div>
      </section>

      <template #footer>
        <div class="asg__ft">
          <span class="asg__ft-n">
            {{ t('分配总数：{n} 个', { n: historyList.length + form.assignList.length }) }}
          </span>
          <a-button @click="cancel">{{ t('取消') }}</a-button>
          <a-button type="primary" :loading="saving" @click="submitForm">{{ t('确定') }}</a-button>
        </div>
      </template>
    </a-drawer>

    <!-- 选择用户 -->
    <a-modal v-model:open="userDialog" :title="userDialogTitle" width="1000px"
             :footer="null" :mask-closable="false" destroy-on-close>
      <ChooseUserList v-if="userDialog" :history-list="chooserHistory"
                      :callback-choose-list="backChooseList" :callback-choose-one="backChooseOne" />
    </a-modal>
  </div>
</template>

<script setup name="CourseAssign">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { SearchOutlined, PlusOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { listCourse } from '@/api/course/course'
import { findListAssign, addAssignData, updateAssign, delAssign } from '@/api/course/assign'
import { listAllClasses, findSimpleUserList } from '@/api/system/clazz/teacherStudent'
import { findListLabel } from '@/api/system/label.js'
import Pagination from '@/components/Pagination/index.vue'
import CourseTable from './courseTable/index.vue'
import ChooseUserList from '@/views/common/choose-user-list/index.vue'

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const labelList = ref([])
const classList = ref([])
const userList = ref([])
const open = ref(false)
const popOpenKey = ref('')
const drawerTitle = ref('')
const userDialog = ref(false)
const userDialogTitle = ref('')
const drawerWidth = ref(Math.min(820, Math.max(560, window.innerWidth * 0.62)))

// 已有分配（保存过的）与本次新增（未提交）分开维护：旧页也是两段渲染，只是没有表头
const historyList = ref([])
const pickedUsers = ref([])
const form = reactive({ courseId: '', courseName: '', assignList: [] })

const query = reactive({
  pageNum: 1, pageSize: 10, orderByColumn: 'sort', isAsc: 'asc',
  classify: 1, courseName: undefined, courseCode: undefined,
  type: undefined, difficulty: undefined, state: undefined, sort: undefined
})

const classifyOptions = computed(() => [
  { label: t('项目案例'), value: 1 },
  { label: t('实践课程'), value: 0 }
])

const classOptions = computed(() => (classList.value || [])
  .map(c => ({ label: c.deptName, value: String(c.deptId) })))
const filterClass = (input, option) => String(option.label).toLowerCase().includes(String(input).toLowerCase())

const columns = computed(() => [
  { title: t('课程信息'), dataIndex: 'cover', key: 'cover' },
  { title: t('创建人'), dataIndex: 'createByName', key: 'createByName', width: 110 },
  { title: t('分配详情'), dataIndex: 'assignDetail', key: 'assignDetail', width: 340 },
  { title: t('操作'), key: 'action', width: 130, align: 'center' }
])

const assignOf = (record) => record.assignList || []
// 选择用户时「已选择」的判定集合：已分配的教师（避免重复分配）+ 本次已勾选的
const chooserHistory = computed(() => [
  ...historyList.value.map(h => ({ userId: h.teacherId })),
  ...pickedUsers.value.map(u => ({ userId: u.userId }))
])
const teacherName = (id) => (userList.value.find(u => String(u.userId) === String(id))?.nickName) || ''
const classesName = (id) => (classList.value.find(c => String(c.deptId) === String(id))?.deptName) || ''
const canDelete = (h) => Number(h.learningStatus) === 0 && Number(h.trainingStatus) === 0

async function getList() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listCourse({ ...query })
    rows.value = res.rows || []
    total.value = res.total || 0
    await fillAssign()
  } catch (e) {
    rows.value = []; total.value = 0
    loadError.value = t('课程列表接口没有返回数据')
  } finally { loading.value = false }
}

// 旧页逐行串行拉分配；这里并发拉一次，条数一致但少等几个往返
async function fillAssign() {
  await Promise.all(rows.value.map(async (row) => {
    try {
      const res = await findListAssign({ courseId: row.courseId })
      row.assignList = res.rows || []
    } catch (e) { row.assignList = [] }
  }))
}

async function getLabelList() {
  try { const res = await findListLabel({ type: 1 }); labelList.value = res.rows || [] } catch (e) { labelList.value = [] }
}
async function getClassList() {
  try { const res = await listAllClasses(); classList.value = res.rows || [] } catch (e) { classList.value = [] }
}
async function getUserList() {
  try { const res = await findSimpleUserList(); userList.value = res.data || [] } catch (e) { userList.value = [] }
}

function handleQuery() { query.pageNum = 1; getList() }
function resetQuery() {
  query.classify = 1; query.courseName = undefined
  handleQuery()
}

function handleAssign(row) {
  form.courseId = row.courseId
  form.courseName = row.courseName
  form.assignList = []
  historyList.value = (row.assignList || []).map(a => ({ ...a }))
  pickedUsers.value = []
  drawerTitle.value = t('课程分配 · 《{name}》', { name: row.courseName })
  popOpenKey.value = ''
  popOpenKey.value = ''
  open.value = true
}

function cancel() { open.value = false; resetForm() }
function resetForm() {
  form.courseId = ''; form.courseName = ''; form.assignList = []
  historyList.value = []; pickedUsers.value = []
}

let uidSeed = 0
function rebuildFromPicked() {
  form.assignList = pickedUsers.value.map(u => ({
    uid: `u${++uidSeed}`,
    teacherId: u.userId,
    teacherName: u.nickName,
    classesId: '',
    assignType: 0,
    type: 0,
    courseId: form.courseId
  }))
}

function toChooseUser() {
  userDialogTitle.value = t('选择分配用户（已选 {n} 个）', { n: pickedUsers.value.length })
  userDialog.value = true
}

function backChooseList(list) {
  const merged = new Map(pickedUsers.value.map(u => [String(u.userId), u]))
  ;(list || []).forEach(u => merged.set(String(u.userId), u))
  pickedUsers.value = [...merged.values()]
  userDialogTitle.value = t('选择分配用户（已选 {n} 个）', { n: pickedUsers.value.length })
  rebuildFromPicked()
}

function backChooseOne(user) {
  if (!pickedUsers.value.some(u => String(u.userId) === String(user.userId))) pickedUsers.value.push(user)
  userDialogTitle.value = t('选择分配用户（已选 {n} 个）', { n: pickedUsers.value.length })
  rebuildFromPicked()
}

function removeAssign(index) {
  form.assignList.splice(index, 1)
  // 旧页按同下标同步 toBeSelectList，删过一条就会错位；这里按 teacherId 对齐
  const ids = new Set(form.assignList.map(a => String(a.teacherId)))
  pickedUsers.value = pickedUsers.value.filter(u => ids.has(String(u.userId)))
}

function changeAssignType(row, value) {
  const prev = Number(row.assignType)
  updateAssign({ ...row, assignType: value }).then(() => {
    row.assignType = value
    message.success(t('修改成功'))
  }).catch(() => { row.assignType = prev })
}

function deleteAssign(row, index) {
  if (!canDelete(row)) { message.warning(t('该班级教师已开启学习，暂不可删除此分配')); return }
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认删除「{name}」在「{cls}」的这条分配吗？', {
      name: teacherName(row.teacherId) || t('未知用户'),
      cls: classesName(row.classesId) || t('未选班级')
    }),
    okText: t('删除'), okType: 'danger', cancelText: t('取消'),
    onOk: async () => {
      try {
        await delAssign(row.assignId)
        historyList.value.splice(index, 1)
        message.success(t('删除成功'))
        getList()
      } catch (e) { message.error(t('删除失败，请稍后重试')) }
    }
  })
}

function submitForm() {
  if (!form.assignList.length) { open.value = false; resetForm(); return }

  const incomplete = form.assignList.some(a => !a.teacherId || !a.classesId)
  if (incomplete) { message.warning(t('请完整填写分配数据')); return }

  // 新旧合并去重：同一教师 + 同一班级只能有一条分配
  const seen = new Map()
  form.assignList.forEach(a => seen.set(`${a.classesId}_${a.teacherId}`, 'new'))
  historyList.value.forEach(h => seen.set(`${h.classesId}_${h.teacherId}`, 'history'))
  if (seen.size !== form.assignList.length + historyList.value.length) {
    message.warning(t('该分配中存在重复数据，请检查修正后再提交')); return
  }

  saving.value = true
  addAssignData({ ...form, assignList: form.assignList.map(({ uid, ...rest }) => rest) }).then(res => {
    if (res.code === 200) {
      message.success(t('分配成功'))
      open.value = false
      resetForm()
      getList()
    } else message.warning(t('分配失败'))
  }).catch(() => { /* 拦截器已提示 */ }).finally(() => { saving.value = false })
}

onMounted(() => {
  getList(); getClassList(); getUserList(); getLabelList()
})
</script>

<style scoped>
.asg { display: flex; flex-direction: column; gap: 14px; }

.asg__err {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 9px 12px; border: 1px solid var(--danger-line); border-radius: var(--r);
  background: var(--danger-soft); color: var(--danger); font-size: 12px;
}

.asg__tool {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  padding: 12px 14px; background: var(--panel);
  border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-1);
}
.asg__spacer { flex: 1; min-width: 8px; }
.asg__hint { font-size: 12px; color: var(--ink-4); }

.asg__body {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1); overflow: hidden;
}
.asg__body :deep(.ant-spin-nested-loading) { padding: 10px 14px 0; }
.asg__body :deep(.pg) { border-radius: 0; border-top: 1px solid var(--line); }

.asg__empty { padding: 40px 16px 44px; text-align: center; }
.asg__empty-t { font-weight: 600; color: var(--ink-2); }
.asg__empty-d { margin: 6px 0 12px; font-size: 12px; color: var(--ink-4); }

/* 分配详情单元格 */
.asg__sum { display: flex; align-items: center; gap: 10px; min-width: 0; }
.asg__sum-btn {
  flex: none; display: inline-flex; align-items: baseline; gap: 3px;
  padding: 3px 10px; border: 1px solid var(--pri-200); border-radius: var(--r-sm);
  background: var(--pri-50); color: var(--pri-ink); font-size: 12px; cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
.asg__sum-btn:hover { border-color: var(--pri); background: var(--pri-100); }
.asg__sum-btn:focus-visible { outline: 2px solid var(--pri); outline-offset: 2px; }
.asg__sum-btn b { font-size: 14px; font-variant-numeric: tabular-nums; }

.asg__chips { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; min-width: 0; }
.asg__chip { margin: 0; font-size: 11px; max-width: 196px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asg__more { font-size: 11.5px; color: var(--ink-4); }
.asg__none-tag { margin: 0; }

.asg__pop-t { font-weight: 600; }
.asg__pop-hd,
.asg__pop-row { display: grid; grid-template-columns: 1fr 1.4fr .8fr; gap: 8px; align-items: center; }
.asg__pop-hd {
  padding-bottom: 6px; margin-bottom: 2px; font-size: 12px; font-weight: 600;
  color: var(--ink-3); border-bottom: 1px solid var(--line-3); text-align: center;
}
.asg__pop-row { padding: 5px 0; border-bottom: 1px dashed var(--line-3); }
.asg__pop-row:last-child { border-bottom: 0; }
.asg__pop-tag { margin: 0; width: 100%; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 抽屉 */
.asg__note { margin-bottom: 14px; }
.asg__sec { margin-bottom: 18px; }
.asg__sec-hd { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
.asg__sec-t { font-size: 13px; font-weight: 650; color: var(--ink); }
.asg__sec-n { margin: 0; font-variant-numeric: tabular-nums; }
.asg__sec-empty { margin: 10px 0 0; font-size: 12px; color: var(--ink-4); }

.asg__row {
  display: grid; grid-template-columns: minmax(140px, 1.2fr) minmax(150px, 1.4fr) 122px 64px;
  gap: 10px; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--line-3);
}
.asg__row:last-child { border-bottom: 0; }
.asg__who { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 13px; color: var(--ink); }
.asg__who span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asg__who-ico { color: var(--ink-4); font-size: 12px; }
.asg__cls { font-size: 12.5px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asg__cls-sel { width: 100%; }
.asg__type :deep(.ant-radio-button-wrapper) { padding-inline: 10px; }

.asg__ft { display: flex; align-items: center; gap: 8px; }
.asg__ft-n { margin-right: auto; font-size: 12px; color: var(--ink-3); }

@media (max-width: 900px) {
  .asg__row { grid-template-columns: 1fr 1fr; row-gap: 8px; }
  .asg__hint { display: none; }
}
</style>
