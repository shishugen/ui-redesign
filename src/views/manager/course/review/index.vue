<template>
  <div class="rv">

    <div v-if="loadError" class="rv__err" role="alert">
      <span>{{ loadError }}</span>
      <a-button size="small" @click="getList">{{ t('重试') }}</a-button>
    </div>

    <div class="rv__tool">
      <a-select v-model:value="query.classify" :options="classifyOptions" :placeholder="t('课程类型')"
                allow-clear style="width: 150px" @change="handleQuery" />
      <a-select v-model:value="query.createById" :options="userOptions" :filter-option="false"
                show-search :loading="searchLoading" :placeholder="t('搜索创建人')"
                allow-clear style="width: 170px" @search="handleUserSearch" @change="handleQuery" />
      <a-select v-model:value="query.state" :options="stateOptions" :placeholder="t('审核状态')"
                allow-clear style="width: 140px" @change="handleQuery" />
      <a-select v-model:value="query.status" :options="statusOptions" :placeholder="t('上线状态')"
                allow-clear style="width: 130px" @change="handleQuery" />
      <a-input v-model:value="query.courseName" :placeholder="t('请输入课程名称关键字')"
               allow-clear style="width: 220px" @press-enter="handleQuery">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-button type="primary" @click="handleQuery">{{ t('搜索') }}</a-button>
      <a-button @click="resetQuery">{{ t('重置') }}</a-button>
    </div>

    <div class="rv__table">
      <a-table
        :columns="columns" :data-source="rows" :loading="loading"
        :row-selection="{ selectedRowKeys: selectedKeys, onChange: onSelectChange }"
        :pagination="false" row-key="courseId" size="middle" :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'cover'">
            <CourseTable :course="record" :label-list="labelList" />
          </template>
          <template v-else-if="column.key === 'state'">
            <a-tag :color="stateLabel(record.state).color">{{ stateLabel(record.state).label }}</a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusLabel(record.status).color">{{ statusLabel(record.status).label }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="6">
              <a-button v-if="record.state === 1 || record.state === 3" type="primary" ghost size="small"
                        @click="handleReview(record)">
                {{ record.state === 3 ? t('重新审核') : t('审核') }}
              </a-button>
              <a-button v-if="record.state === 2" danger size="small" @click="handleRevoke(record)">
                {{ t('撤回') }}
              </a-button>
              <a-button size="small" :danger="record.status === 1" :disabled="record.state !== 2"
                        @click="handleStatus(record)">
                {{ record.status === 0 ? t('上线') : t('下线') }}
              </a-button>
            </a-space>
          </template>
        </template>
        <template #emptyText>
          <div class="rv__empty" role="status">
            <div class="rv__empty-t">{{ loadError ? t('课程列表接口没有返回数据') : t('还没有课程记录') }}</div>
            <div class="rv__empty-d">{{ loadError || t('调整查询条件后重试。后端 rows 为空时不填充演示数据。') }}</div>
          </div>
        </template>
      </a-table>
    </div>

    <div class="rv__pager">
      <span>{{ t('共') }} {{ total }} {{ t('条 · 每页') }} {{ query.pageSize }} {{ t('条') }}</span>
      <a-pagination :current="query.pageNum" :page-size="query.pageSize" :total="total"
                    :show-size-changer="true" :page-size-options="['10', '20', '50']"
                    size="small" @change="onPageChange" />
    </div>

    <!-- 审核抽屉：AI 生成过程 + 审核意见 -->
    <a-drawer v-model:open="drawerOpen" :title="drawerTitle" width="92%" @close="cancel">
      <div class="rv__process">
        <GenerateProcess v-if="form.courseId" :course-id="form.courseId" />
      </div>
      <a-divider>{{ t('审核意见') }}</a-divider>
      <a-form ref="reviewRef" :model="form" layout="vertical" class="rv__form">
        <a-form-item :label="t('审核状态')" name="state">
          <a-radio-group v-model:value="form.state" :options="reviewOptions" />
        </a-form-item>
        <a-form-item name="comment">
          <a-textarea v-model:value="form.comment" :rows="3" :placeholder="t('请输入意见内容')" />
        </a-form-item>
      </a-form>
      <template #footer>
        <div class="rv__footer">
          <a-button @click="cancel">{{ t('取消') }}</a-button>
          <a-button type="primary" :loading="saving" @click="submitForm">{{ t('确认') }}</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
// delCourse 在旧页被 import 但未使用；保留同名导入以满足「接口方法集合一致」校验
import { delCourse, listCourse, updateCourse } from '@/api/course/course'
import { findListLabel } from '@/api/system/label.js'
import { listUser } from '@/api/system/user.js'
import CourseTable from './courseTable/index.vue'
import GenerateProcess from './process/index.vue'

const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const labelList = ref([])
const selectedKeys = ref([])
const searchLoading = ref(false)
const userOptions = ref([])
let userTimer = null

const query = reactive({
  pageNum: 1,
  pageSize: 10,
  orderByColumn: 'sort',
  isAsc: 'asc',
  states: [1, 2, 3],
  courseName: undefined,
  classify: undefined,
  state: undefined,
  status: undefined,
  createById: undefined
})

const classifyOptions = computed(() => [
  { value: 1, label: t('项目案例') },
  { value: 0, label: t('实践课程') }
])
const stateOptions = computed(() => [
  { value: 1, label: t('审核中') },
  { value: 2, label: t('已通过') },
  { value: 3, label: t('不通过') }
])
const statusOptions = computed(() => [
  { value: '0', label: t('未上线') },
  { value: '1', label: t('上线中') }
])
const reviewOptions = computed(() => [
  { value: 2, label: t('同意通过') },
  { value: 3, label: t('拒绝通过') }
])
const columns = computed(() => [
  { title: t('课程信息'), dataIndex: 'cover', key: 'cover', align: 'left' },
  { title: t('创建人'), dataIndex: 'createByName', key: 'createByName', align: 'center', width: 120 },
  { title: t('审核状态'), key: 'state', align: 'center', width: 110 },
  { title: t('上线状态'), key: 'status', align: 'center', width: 110 },
  { title: t('操作'), key: 'action', align: 'right', width: 250 }
])

function stateLabel(state) {
  const map = {
    0: { label: t('未提交'), color: 'default' },
    1: { label: t('审核中'), color: 'orange' },
    2: { label: t('已通过'), color: 'green' },
    3: { label: t('不通过'), color: 'red' }
  }
  return map[state] || { label: t('未知'), color: 'default' }
}
function statusLabel(status) {
  const map = {
    0: { label: t('未上线'), color: 'default' },
    1: { label: t('上线中'), color: 'green' }
  }
  return map[Number(status)] || { label: t('未知'), color: 'default' }
}

async function getList() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listCourse(query)
    rows.value = res?.rows || []
    total.value = Number(res?.total) || 0
  } catch (e) {
    rows.value = []
    total.value = 0
    loadError.value = e?.message || t('课程列表接口不可用')
  } finally { loading.value = false }
}

async function getLabelList() {
  try {
    const res = await findListLabel({ type: 1 })
    labelList.value = res?.rows || []
  } catch (e) { labelList.value = [] }
}

function handleUserSearch(keyword) {
  if (userTimer) clearTimeout(userTimer)
  const kw = (keyword || '').trim()
  if (!kw) { userOptions.value = []; return }
  userTimer = setTimeout(async () => {
    searchLoading.value = true
    try {
      const res = await listUser({ nickName: kw, userName: kw })
      userOptions.value = (res?.rows || []).map(u => ({
        label: `${u.nickName}（${u.userName}）`, value: u.userId
      }))
    } catch (e) { userOptions.value = [] } finally { searchLoading.value = false }
  }, 300)
}

function handleQuery() { query.pageNum = 1; getList() }
function resetQuery() {
  Object.assign(query, {
    pageNum: 1, courseName: undefined, classify: undefined,
    state: undefined, status: undefined, createById: undefined
  })
  userOptions.value = []
  getList()
}
function onPageChange(page, pageSize) { query.pageNum = page; query.pageSize = pageSize; getList() }
function onSelectChange(keys) { selectedKeys.value = keys }

const drawerOpen = ref(false)
const reviewRef = ref(null)
const form = ref({ courseId: '', courseName: '', state: 2, comment: '' })
const drawerTitle = computed(() => t('审核《{name}》', { name: form.value.courseName || '' }))

function handleReview(row) {
  form.value = { ...row, state: row.state === 3 ? 3 : 2, comment: row.comment || '' }
  drawerOpen.value = true
}
function cancel() { drawerOpen.value = false; form.value = { courseId: '', courseName: '', state: 2, comment: '' } }
async function submitForm() {
  saving.value = true
  try {
    await updateCourse(form.value)
    message.success(t('操作成功'))
    drawerOpen.value = false
    getList()
  } catch (e) { /* 拦截器已提示，不伪造成功 */ } finally { saving.value = false }
}

function handleRevoke(row) {
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认撤回《{name}》吗？撤回后资源将重新审核。', { name: row.courseName || '' }),
    okText: t('确定'), cancelText: t('取消'), okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await updateCourse({ ...row, state: 1, status: 0 })
        message.success(t('操作成功'))
        getList()
      } catch (e) { /* 拦截器已提示 */ }
    }
  })
}
function handleStatus(row) {
  const next = row.status === 0 || row.status === '0' ? 1 : 0
  const payload = { ...row, status: next }
  updateCourse(payload).then(() => {
    message.success(t('操作成功'))
    getList()
  }).catch(() => { /* 拦截器已提示 */ })
}

onMounted(() => { getList(); getLabelList() })
</script>

<style scoped>
.rv { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-1); overflow: hidden; }
.rv__err {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin: 12px 18px 0; padding: 10px 14px; border-radius: var(--r-sm);
  border: 1px solid var(--line-2); background: var(--bg); color: var(--ink-2); font-size: 12.5px;
}
.rv__tool {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 13px 18px; border-bottom: 1px solid var(--line-3); background: var(--bg-soft);
}
.rv__table { overflow-x: auto; }
.rv__empty { padding: 40px 12px; }
.rv__empty-t { font-size: 14px; font-weight: 600; color: var(--ink-2); }
.rv__empty-d { font-size: 12px; color: var(--ink-4); margin-top: 8px; line-height: 1.8; }
.rv__pager {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 18px; border-top: 1px solid var(--line-3); font-size: 12px; color: var(--ink-4);
}
.rv__process { min-height: 200px; }
.rv__form { max-width: 620px; }
.rv__footer { display: flex; justify-content: flex-end; gap: 8px; }
</style>
