<template>
  <!-- 课程管理 / 案例管理共用列表：courseClassify 0=课程 1=案例 -->
  <div class="cl">

    <div v-if="loadError" class="cl__err" role="alert">
      <span>{{ loadError }}</span><a-button size="small" @click="getList">{{ t('重试') }}</a-button>
    </div>

    <div class="cl__tool">
      <a-select v-model:value="query.createById" :options="userOptions" :filter-option="false"
                show-search :loading="searchLoading" :placeholder="t('搜索创建人')" allow-clear
                style="width: 168px" @search="handleUserSearch" @change="handleQuery" />
      <a-select v-model:value="query.state" :options="stateOptions" :placeholder="t('课程状态')"
                allow-clear style="width: 132px" @change="handleQuery" />
      <a-select v-model:value="query.status" :options="statusOptions" :placeholder="t('上线状态')"
                allow-clear style="width: 132px" @change="handleQuery" />
      <a-input v-model:value="query.courseName" :placeholder="t('请输入{name}名称关键字', { name: courseTitle })"
               allow-clear style="width: 210px" @press-enter="handleQuery">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-button type="primary" @click="handleQuery">{{ t('搜索') }}</a-button>
      <a-button @click="resetQuery">{{ t('重置') }}</a-button>
      <span class="cl__spacer" />
      <a-button type="primary" @click="handleAdd"><PlusOutlined />{{ t('新增') }}</a-button>
      <a-button danger :disabled="!selectedKeys.length" @click="handleBatchDelete">{{ t('批量删除') }}</a-button>
      <a-button @click="sortModal = true"><SortAscendingOutlined />{{ t('排序设置') }}</a-button>
      <a-radio-group v-model:value="query.viewTypeMode" button-style="solid" class="cl__mode">
        <a-radio-button value="card" :aria-label="t('卡片视图')"><InsertRowAboveOutlined /></a-radio-button>
        <a-radio-button value="list" :aria-label="t('列表视图')"><MenuUnfoldOutlined /></a-radio-button>
      </a-radio-group>
    </div>

    <div class="cl__body">
      <a-spin :spinning="loading" :tip="t('正在加载数据中...')">
        <div v-if="query.viewTypeMode === 'card'" class="cl__grid">
          <CourseCard v-for="c in rows" :key="c.courseId" :course="c" :label-list="labelList"
                      :review-call-back="handleReview" :revoke-call-back="handleRevoke"
                      :update-call-back="handleUpdate" :delete-call-back="handleDelete"
                      :detail-call-back="handleEdit" />
        </div>
        <a-table v-else :columns="columns" :data-source="rows" :row-selection="rowSelection"
                 :pagination="false" :loading="loading" row-key="courseId" size="middle" :scroll="{ x: 980 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'cover'">
              <CourseTable :course="record" :label-list="labelList" :detail-call-back="handleEdit" />
            </template>
            <template v-else-if="column.key === 'state'">
              <a-tag :color="stateLabel(record.state).color">{{ stateLabel(record.state).label }}</a-tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusLabel(record.status).color">{{ statusLabel(record.status).label }}</a-tag>
            </template>
            <template v-else-if="column.key === 'difficulty'">{{ dictLabel(record.difficulty) }}</template>
            <template v-else-if="column.key === 'action'">
              <a-space :size="4" wrap>
                <a-button type="link" size="small" @click="handleUpdate(record)">{{ t('编辑') }}</a-button>
                <a-button type="link" size="small" danger @click="handleDelete(record)">{{ t('删除') }}</a-button>
                <a-button v-if="record.state === 0 || record.state === 3" type="link" size="small"
                          @click="handleReview(record)">{{ t('提交审核') }}</a-button>
                <a-button v-if="record.state === 1" type="link" size="small" danger
                          @click="handleRevoke(record)">{{ t('撤回审核') }}</a-button>
              </a-space>
            </template>
          </template>
        </a-table>

        <div v-if="!loading && !rows.length" class="cl__empty" role="status">
          <div class="cl__empty-t">{{ loadError ? t('课程列表接口没有返回数据') : t('还没有课程记录') }}</div>
          <div class="cl__empty-d">{{ t('点「新增」创建第一条记录，或调整查询条件后重试。') }}</div>
          <a-button size="small" @click="handleAdd">{{ t('新增') }}</a-button>
        </div>
      </a-spin>
    </div>

    <Pagination :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="getList" />

    <!-- 新增 / 修改抽屉 -->
    <a-drawer v-model:open="open" :title="drawerTitle" width="92%" :mask-closable="false" @close="cancel">
      <a-form :model="form" layout="vertical" class="cl__form">
        <div class="cl__form-grid">
          <div class="cl__cover">
            <a-image :src="form.previewImg ? previewUrl + form.previewImg : defaultImg"
                     :preview="form.coverImg ? { src: previewUrl + form.coverImg } : false" :fallback="defaultImg" />
            <a-button block @click="cropperOpen = true"><UploadOutlined />{{ t('编辑封面图片') }}</a-button>
            <template v-if="canAiCreate">
              <div class="cl__sub">{{ t('AI生图提示词') }}</div>
              <a-textarea v-model:value="ai.image_prompt" :rows="3" :maxlength="500"
                          :placeholder="t('输入AI生图提示词，可通过AI智能生成封面图')" />
              <div class="cl__ai-btns">
                <a-button type="primary" :loading="promptLoading" @click="optimizePrompt">
                  {{ ai.image_prompt ? t('优化') : t('生成') }}{{ t('提示词') }}
                </a-button>
                <a-button :loading="imageLoading" :disabled="!ai.image_prompt" @click="generateImageFromCreatePrompt">
                  {{ t('AI生成封面图') }}
                </a-button>
                <a-button :disabled="promptLoading || !ai.image_prompt" @click="ai.image_prompt = ''">
                  {{ t('清空提示词') }}
                </a-button>
              </div>
            </template>
          </div>

          <div class="cl__fields">
            <div class="cl__row">
              <a-form-item :label="courseTitle + t('名称')" name="courseName" required>
                <a-input v-model:value="form.courseName" :placeholder="t('请输入') + courseTitle + t('名称')" />
              </a-form-item>
              <a-form-item :label="courseTitle + t('编码')" name="courseCode">
                <a-input v-model:value="form.courseCode" :placeholder="t('请输入') + courseTitle + t('编码')" />
              </a-form-item>
            </div>
            <div class="cl__row">
              <a-form-item :label="courseTitle + t('类型')" name="type">
                <a-select v-model:value="form.type" :options="typeOptions" allow-clear :placeholder="t('请选择类型')" />
              </a-form-item>
              <a-form-item :label="courseTitle + t('难度')" name="difficulty">
                <a-select v-model:value="form.difficulty" :options="difficultyOptions" allow-clear :placeholder="t('请选择难度')" />
              </a-form-item>
            </div>
            <div class="cl__row">
              <a-form-item :label="courseTitle + t('课时')">
                <div class="cl__period">
                  <a-input-number v-model:value="form.theoryPeriod" :min="0" :addon-before="t('理论')" @change="changePeriod" />
                  <a-input-number v-model:value="form.trainingPeriod" :min="0" :addon-before="t('实训')" @change="changePeriod" />
                  <span>{{ t('共') }} <b>{{ form.period || 0 }}</b> {{ t('课时') }}</span>
                </div>
              </a-form-item>
              <a-form-item :label="courseTitle + t('序号')" name="sort">
                <a-input-number v-model:value="form.sort" :min="1" style="width: 140px" />
              </a-form-item>
            </div>
            <div class="cl__row">
              <a-form-item :label="courseTitle + t('标签')"><CascaderPlus v-model:value="form.labels" :options="labelOptions" :field-names="fieldNames" multiple :placeholder="t('请选择标签')" /></a-form-item>
              <a-form-item :label="t('适用专业')"><CascaderPlus v-model:value="form.majors" :options="majorOptions" :field-names="fieldNames" multiple :placeholder="t('请选择适用专业')" /></a-form-item>
            </div>
            <div class="cl__row">
              <a-form-item :label="t('应用领域')"><CascaderPlus v-model:value="form.domains" :options="domainOptions" :field-names="fieldNames" multiple :placeholder="t('请选择应用领域')" /></a-form-item>
              <a-form-item :label="t('岗位方向')"><CascaderPlus v-model:value="form.posts" :options="postOptions" :field-names="fieldNames" multiple :placeholder="t('请选择岗位方向')" /></a-form-item>
            </div>
            <div class="cl__row">
              <a-form-item :label="t('关键技能')"><CascaderPlus v-model:value="form.skills" :options="skillOptions" :field-names="fieldNames" multiple :placeholder="t('请选择关键技能')" /></a-form-item>
            </div>
            <a-form-item :label="courseTitle + t('简介')" name="introduction">
              <a-textarea v-model:value="form.introduction" :rows="6" :maxlength="2000"
                          :readonly="intronLoading" :placeholder="t('请输入内容')" />
            </a-form-item>
            <div class="cl__ai-btns">
              <a-button type="primary" :loading="intronLoading" @click="optimizeIntroduction">
                AI{{ form.introduction ? t('优化') : t('生成') }}{{ t('简介') }}
              </a-button>
              <a-button :disabled="intronLoading" @click="openManualIntroduction">{{ t('AI手动优化') }}</a-button>
            </div>
          </div>
        </div>
      </a-form>
      <template #footer>
        <div class="cl__drawer-ft">
          <a-button @click="cancel">{{ t('取消') }}</a-button>
          <a-button type="primary" :loading="saving" @click="submitForm(0)">{{ t('保存并关闭') }}</a-button>
          <a-button :loading="saving" @click="submitForm(1)">{{ t('保存并继续') }}</a-button>
        </div>
      </template>
    </a-drawer>

    <!-- 封面裁剪 -->
    <a-modal v-model:open="cropperOpen" :title="t('编辑封面图片')" width="1100px" :footer="null" :mask-closable="false">
      <ImgCropper v-if="cropperOpen" :preview-url="previewUrl" :default-img="form.coverImg"
                  :callback-base64-data="uploadBase64" />
    </a-modal>

    <!-- AI 手动优化 -->
    <a-modal v-model:open="manualOpen" :title="t('AI手动优化')" width="80%" :footer="null" :mask-closable="false">
      <ManualGenerateDialog v-if="manualOpen" :input-prompt="manualPrompt" :course-title="courseTitle"
                            :callback-content="handleManualIntroduction" :callback-cancel="() => manualOpen = false" />
    </a-modal>

    <!-- 排序设置 -->
    <a-modal v-model:open="sortModal" :title="t('排序设置')" width="86%" :footer="null">
      <CourseSort v-if="sortModal" :course-classify="courseClassify" :callback-refresh-list="sortRefreshList" />
    </a-modal>

    <!-- 删除确认：输入名称 -->
    <a-modal v-model:open="deleteModal" :title="t('删除提示')" width="560px" :ok-text="t('确认')" @ok="confirmDelete">
      <p class="cl__del-tip">{{ deleteTips }}</p>
      <p class="cl__del-intro">{{ t('该操作将删除此{name}的数据，请输入以下内容再确认：', { name: courseTitle }) }}</p>
      <p class="cl__del-name">{{ deleteForm.courseName }}</p>
      <a-input v-model:value="deleteForm.confirmTxt" :placeholder="t('请输入提示内容继续操作')" />
      <p v-if="deleteErr" class="cl__del-err" role="alert">{{ deleteErr }}</p>
    </a-modal>
  </div>
</template>

<script setup name="CourseList">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined, ReloadOutlined, SearchOutlined, SortAscendingOutlined,
  InsertRowAboveOutlined, MenuUnfoldOutlined, UploadOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
// 接口方法集合与旧页一致（F1 冻结层，不改名）
import { listCourse, getCourse, delCourse, addCourse, updateCourse } from '@/api/course/course'
import { uploadByBase64, previewUrl, uploadByUrl } from '@/api/cloud/file'
import { findListLabel } from '@/api/system/label'
import * as courseCreationApi from '@/api/apt/courseCreation'
import { getTemplateByKey } from '@/api/apt/coursePromptTemplate.js'
import { listUser } from '@/api/system/user.js'
import { getDicts } from '@/api/system/dict/data.js'
import { getToken } from '@/utils/auth'
import { getUserId, isAdmin, getUserPermissions } from '@/utils/user'
import { encryptParams, decryptParams, handleTree } from '@/utils/aigc'
import defaultImg from '@/assets/images/default_course.png'
import CourseCard from './courseCard/index.vue'
import CourseTable from './courseTable/index.vue'
import CourseSort from './courseSort/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import CascaderPlus from '@/components/CascaderPlus/index.vue'
import ImgCropper from '@/components/ImgCropper/index.vue'
import ManualGenerateDialog from '@/components/AiChapter/components/ManualGenerateDialog.vue'

const props = defineProps({
  courseClassify: { type: [String, Number], required: true },
  courseTitle: { type: String, default: () => t('课程') }
})
const route = useRoute()
const router = useRouter()
const pageTitle = computed(() => props.courseClassify === 1 ? t('案例管理') : t('课程管理'))
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const open = ref(false)
const saving = ref(false)
const cropperOpen = ref(false)
const sortModal = ref(false)
const manualOpen = ref(false)
const deleteModal = ref(false)
const deleteErr = ref('')
const deleteTips = ref('')
const deleteCourseIds = ref(null)
const drawerTitle = ref('')
const selectedKeys = ref([])
const searchLoading = ref(false)
const userOptions = ref([])
const promptLoading = ref(false)
const imageLoading = ref(false)
const intronLoading = ref(false)
const manualPrompt = ref('')
const manualTemplate = ref('')
const ai = reactive({ image_prompt: '', image_url: '' })
const form = ref({})
const deleteForm = reactive({ courseName: '', confirmTxt: '' })
const labelList = ref([])
const labelOptions = ref([]), majorOptions = ref([]), domainOptions = ref([])
const postOptions = ref([]), skillOptions = ref([])
const typeOptions = ref([]), difficultyOptions = ref([])
const fieldNames = { value: 'labelId', label: 'labelName', children: 'children' }
const query = reactive({
  pageNum: 1, pageSize: 12, orderByColumn: 'sort', isAsc: 'asc',
  classify: props.courseClassify, courseName: undefined, state: undefined,
  status: undefined, createById: undefined, viewTypeMode: 'card'
})
const stateOptions = computed(() => [
  { label: t('编辑中'), value: '0' }, { label: t('审核中'), value: '1' },
  { label: t('已通过'), value: '2' }, { label: t('不通过'), value: '3' }
])
const statusOptions = computed(() => [
  { label: t('未上线'), value: '0' }, { label: t('上线中'), value: '1' }
])
const columns = computed(() => [
  { title: t('课程信息'), dataIndex: 'cover', key: 'cover' },
  { title: t('状态'), dataIndex: 'state', key: 'state', width: 100 },
  { title: t('是否上线'), dataIndex: 'status', key: 'status', width: 100 },
  { title: t('难度'), dataIndex: 'difficulty', key: 'difficulty', width: 100 },
  { title: t('创建者'), dataIndex: 'createByName', key: 'createByName', width: 110 },
  { title: t('序号'), dataIndex: 'sort', key: 'sort', width: 80 },
  { title: t('操作'), key: 'action', width: 260 }
])
const rowSelection = { selectedRowKeys: selectedKeys, onChange: (keys) => { selectedKeys.value = keys } }
const canAiCreate = computed(() => {
  const p = getUserPermissions() || []
  return !p.length || p.includes('*:*:*') || p.includes('sys:ai:create')
})
function stateLabel(s) {
  return ({ 0: { label: t('编辑中'), color: 'default' }, 1: { label: t('审核中'), color: 'orange' },
    2: { label: t('已通过'), color: 'success' }, 3: { label: t('不通过'), color: 'error' } })[s] || { label: '—', color: 'default' }
}
function statusLabel(s) {
  return ({ 0: { label: t('未上线'), color: 'default' }, 1: { label: t('上线中'), color: 'success' } })[s] || { label: '—', color: 'default' }
}
const dictLabel = (v) => difficultyOptions.value.find(d => String(d.value) === String(v))?.label || '—'

async function getList() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listCourse({ ...query })
    rows.value = res.rows || []
    total.value = res.total || 0
  } catch (e) {
    rows.value = []; total.value = 0
    loadError.value = t('课程列表接口没有返回数据')
  } finally { loading.value = false }
}
const handleQuery = () => { query.pageNum = 1; getList() }
function resetQuery() {
  query.createById = undefined; query.state = undefined; query.status = undefined
  query.courseName = undefined; handleQuery()
}
let userTimer = null
function handleUserSearch(keyword) {
  if (userTimer) clearTimeout(userTimer)
  userTimer = setTimeout(async () => {
    if (!keyword?.trim()) { userOptions.value = []; return }
    searchLoading.value = true
    try {
      const res = await listUser({ nickName: keyword.trim(), userName: keyword.trim() })
      userOptions.value = (res.rows || []).map(u => ({ label: `${u.nickName}（${u.userName}）`, value: u.userId }))
    } catch (e) { userOptions.value = [] } finally { searchLoading.value = false }
  }, 300)
}
async function getLabelList() {
  try {
    const res = await findListLabel({})
    labelList.value = res.rows || []
    const pick = (type) => handleTree(labelList.value.filter(i => String(i.type) === String(type)), 'labelId')
    labelOptions.value = pick(1); majorOptions.value = pick(2); domainOptions.value = pick(3)
    postOptions.value = pick(4); skillOptions.value = pick(5)
  } catch (e) { /* 空态由下拉自己显示 */ }
}
async function loadDicts() {
  try {
    const [a, b] = await Promise.all([getDicts('sys_course_type'), getDicts('sys_course_difficulty')])
    const map = (res) => (res.data || []).map(d => ({ label: t(d.dictLabel), value: d.dictValue }))
    typeOptions.value = map(a); difficultyOptions.value = map(b)
  } catch (e) { /* 字典接口失败时下拉为空，不伪造选项 */ }
}
async function searchPromptTemplate() {
  try { const res = await getTemplateByKey('description'); manualTemplate.value = res.data?.prompt_template || '' } catch (e) { /* 模板为空时手动优化仍可用 */ }
}

function resetForm() {
  form.value = {
    courseId: null, courseName: null, courseCode: null, coverImg: null, previewImg: null,
    introduction: null, type: undefined, difficulty: undefined, state: 0, status: 0,
    period: 0, theoryPeriod: 0, trainingPeriod: 0, sort: 1,
    labels: '', majors: '', domains: '', posts: '', skills: '', classify: props.courseClassify
  }
  ai.image_prompt = ''; ai.image_url = ''
}
const changePeriod = () => {
  form.value.period = Number(form.value.theoryPeriod || 0) + Number(form.value.trainingPeriod || 0)
}
function handleAdd() {
  resetForm(); open.value = true
  drawerTitle.value = t('添加') + props.courseTitle + t('资源')
}
async function handleUpdate(row) {
  resetForm()
  try {
    const res = await getCourse(row.courseId || selectedKeys.value)
    form.value = { ...form.value, ...res.data }
    open.value = true
    drawerTitle.value = t('修改') + props.courseTitle + t('资源')
  } catch (e) { message.error(t('课程详情接口没有返回数据')) }
}
function cancel() { open.value = false; resetForm() }
function handleEdit(course) {
  // 课程编辑页（P049-A~C）：卡片本体点击进入，章节/作业/预览已可用
  const courseId = course?.courseId ?? (typeof course === 'number' ? course : undefined)
  if (!courseId) { message.warning(t('缺少课程参数')); return }
  const encodedParam = encryptParams({ ...query })
  router.push({
    path: '/manager/course/courseManager/courseEdit',
    // from 让编辑页「返回」回到原入口（静态路由或 /module/:key 菜单入口都成立）
    query: { courseId, encodedParam, from: route.path }
  })
}
async function submitForm(type) {
  if (!form.value.courseName) { message.warning(t('请输入') + props.courseTitle + t('名称')); return }
  saving.value = true
  try {
    const res = form.value.courseId != null
      ? await updateCourse(form.value)
      : await addCourse(form.value)
    message.success(form.value.courseId != null ? t('修改成功') : t('新增成功'))
    open.value = false
    getList()
    if (type === 1) handleEdit(res?.data)
  } catch (e) { message.error(t('保存失败，请稍后重试')) } finally { saving.value = false }
}
function handleReview(row) {
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认提交《{name}》审核吗？', { name: row.courseName }),
    onOk: async () => {
      try { await updateCourse({ ...row, state: 1 }); message.success(t('操作成功')); getList() }
      catch (e) { message.error(t('操作失败')) }
    }
  })
}
function handleRevoke(row) {
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认撤回《{name}》的审核吗？', { name: row.courseName }),
    onOk: async () => {
      try { await updateCourse({ ...row, state: 0 }); message.success(t('操作成功')); getList() }
      catch (e) { message.error(t('操作失败')) }
    }
  })
}
function handleDelete(row) {
  deleteTips.value = t('确认删除{name}《{title}》吗？', { name: props.courseTitle, title: row.courseName })
  deleteCourseIds.value = row.courseId
  deleteForm.courseName = row.courseName
  deleteForm.confirmTxt = ''
  deleteErr.value = ''
  deleteModal.value = true
}
function handleBatchDelete() {
  deleteTips.value = t('是否确认删除所选的 {n} 个数据项？', { n: selectedKeys.value.length })
  deleteCourseIds.value = selectedKeys.value
  deleteForm.courseName = t('确认删除')
  deleteForm.confirmTxt = ''
  deleteErr.value = ''
  deleteModal.value = true
}
async function confirmDelete() {
  if (deleteForm.confirmTxt !== deleteForm.courseName) {
    deleteErr.value = t('请输入正确的内容'); return
  }
  try {
    await delCourse(deleteCourseIds.value)
    message.success(t('删除成功'))
    deleteModal.value = false
    selectedKeys.value = []
    getList()
  } catch (e) { message.error(t('删除失败，请稍后重试')) }
}
const sortRefreshList = () => { sortModal.value = false; getList() }

function optimizePrompt() {
  if (!form.value.courseName) { message.warning(t('请输入') + props.courseTitle + t('名称')); return }
  const text = ai.image_prompt || form.value.courseName
  promptLoading.value = true
  ai.image_prompt = ''
  courseCreationApi.optimizeImagePrompt({ prompt: text.trim(), type: 'image_prompt' },
    (chunk) => { if (chunk?.content) ai.image_prompt += chunk.content; if (chunk?.is_complete) { promptLoading.value = false; message.success(t('图片提示词优化完成')) } },
    () => { promptLoading.value = false },
    (error) => { promptLoading.value = false; message.error(t('提示词优化失败') + '：' + (error?.message || t('未知错误'))) })
}
function optimizeIntroduction() {
  if (!form.value.courseName) { message.warning(t('请输入') + props.courseTitle + t('名称')); return }
  const text = form.value.introduction || form.value.courseName
  intronLoading.value = true
  form.value.introduction = ''
  courseCreationApi.optimizeImagePrompt({ prompt: text.trim(), type: 'description' },
    (chunk) => { if (chunk?.content) form.value.introduction += chunk.content; if (chunk?.is_complete) { intronLoading.value = false; message.success(t('课程简介优化完成')) } },
    () => { intronLoading.value = false },
    (error) => { intronLoading.value = false; message.error(t('提示词优化失败') + '：' + (error?.message || t('未知错误'))) })
}
function openManualIntroduction() {
  if (!form.value.courseName) { message.warning(t('请输入') + props.courseTitle + t('名称')); return }
  const src = form.value.introduction || form.value.courseName
  manualPrompt.value = manualTemplate.value ? manualTemplate.value.replaceAll('\n', ' ').replace('{prompt}', src) : src
  manualOpen.value = true
}
function handleManualIntroduction(content) {
  form.value.introduction = content
  manualOpen.value = false
  message.success(t('手动优化完成'))
}
async function generateImageFromCreatePrompt() {
  if (!ai.image_prompt?.trim()) { message.warning(t('请输入图片提示词')); return }
  imageLoading.value = true
  try {
    const res = await courseCreationApi.generateImage({ image_prompt: ai.image_prompt.trim(), style: 'educational' })
    if (!res.data?.image_url) throw new Error(t('未返回图片URL'))
    ai.image_url = res.data.image_url
    const up = await uploadByUrl(res.data.image_url)
    if (up.code === 200) {
      form.value.coverImg = up.data.filePath
      form.value.previewImg = up.data.filePath
      message.success(t('图片生成成功'))
    } else message.error(t('上传失败'))
  } catch (error) {
    message.error(t('图片生成失败') + '：' + (error?.message || t('未知错误')))
  } finally { imageLoading.value = false }
}
async function uploadBase64(coverData, previewData) {
  if (!coverData || !previewData) { message.warning(t('上传失败')); return }
  try {
    if (String(coverData).startsWith('data:')) {
      const fd = new FormData(); fd.append('code', coverData); fd.append('watermark', 0)
      const r = await uploadByBase64(fd)
      if (r.code === 200) form.value.coverImg = r.data.filePath
    }
    const fd2 = new FormData(); fd2.append('code', previewData); fd2.append('watermark', 0)
    const r2 = await uploadByBase64(fd2)
    if (r2.code === 200) form.value.previewImg = r2.data.filePath
    message.success(t('上传成功'))
    cropperOpen.value = false
  } catch (e) { message.error(t('上传失败')) }
}

onMounted(() => {
  if (route.query.encodedParam) {
    try {
      const decoded = decryptParams(route.query.encodedParam)
      if (decoded) Object.assign(query, decoded)
    } catch (e) { /* 缓存参数损坏时按默认查询 */ }
  }
  getList(); getLabelList(); loadDicts(); searchPromptTemplate()
  void getToken; void getUserId; void isAdmin
})
</script>

<style scoped>
.cl { display: flex; flex-direction: column; gap: 14px; }
.cl__err { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid var(--danger-line); background: var(--danger-soft); border-radius: var(--r); color: var(--danger); font-size: 12px; }
.cl__tool {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 14px;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-1);
}
.cl__spacer { flex: 1; min-width: 8px; }
.cl__mode { flex-shrink: 0; }
.cl__body { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-1); padding: 14px; min-height: 220px; }
.cl__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(258px, 1fr)); gap: 16px; }
.cl__empty { padding: 44px 16px; text-align: center; }
.cl__empty-t { font-weight: 600; color: var(--ink-2); }
.cl__empty-d { color: var(--ink-4); font-size: 12px; margin: 6px 0 12px; }
.cl__form-grid { display: grid; grid-template-columns: 290px 1fr; gap: 22px; }
.cl__cover { display: flex; flex-direction: column; gap: 10px; }
.cl__cover :deep(.ant-image) { width: 100%; height: 170px; object-fit: cover; border-radius: var(--r); border: 1px solid var(--line); }
.cl__cover :deep(.ant-image-img) { width: 100%; height: 170px; object-fit: cover; }
.cl__sub { font-weight: 600; color: var(--ink-2); }
.cl__ai-btns { display: flex; flex-wrap: wrap; gap: 8px; }
.cl__fields { min-width: 0; }
.cl__row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cl__period { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: var(--ink-3); }
.cl__period :deep(.ant-input-number) { width: 130px; }
.cl__drawer-ft { display: flex; justify-content: flex-end; gap: 8px; }
.cl__del-tip { font-size: 15px; font-weight: 600; color: var(--ink); }
.cl__del-intro { color: var(--danger); }
.cl__del-name { text-align: center; color: var(--pri); font-size: 15px; font-weight: 650; }
.cl__del-err { color: var(--danger); font-size: 12px; margin-top: 6px; }
@media (max-width: 1100px) {
  .cl__form-grid { grid-template-columns: 1fr; }
  .cl__row { grid-template-columns: 1fr; }
}
</style>
