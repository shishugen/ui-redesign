<template>
  <!-- 前端课程显示 / 案例显示共用列表：courseClassify 0=课程 1=案例 -->
  <div class="tl">

    <div v-if="loadError" class="tl__err" role="alert">
      <span>{{ loadError }}</span><a-button size="small" @click="getList">{{ t('重试') }}</a-button>
    </div>

    <div class="tl__tool">
      <a-select v-model:value="query.status" :options="statusOptions" :placeholder="t('上线状态')"
                allow-clear style="width: 140px" @change="handleQuery" />
      <a-input v-model:value="query.courseName" :placeholder="t('请输入{name}名称关键字', { name: courseTitle })"
               allow-clear style="width: 230px" @press-enter="handleQuery">
        <template #prefix><SearchOutlined /></template>
      </a-input>
      <a-button type="primary" @click="handleQuery">{{ t('搜索') }}</a-button>
      <a-button @click="resetQuery">{{ t('重置') }}</a-button>
      <span class="tl__spacer" />
      <a-radio-group v-model:value="query.viewTypeMode" button-style="solid">
        <a-radio-button value="card" :aria-label="t('卡片视图')"><InsertRowAboveOutlined /></a-radio-button>
        <a-radio-button value="list" :aria-label="t('列表视图')"><MenuUnfoldOutlined /></a-radio-button>
      </a-radio-group>
    </div>

    <div class="tl__body">
      <a-spin :spinning="loading" :tip="t('正在加载数据中...')">
        <div v-if="query.viewTypeMode === 'card'" class="tl__grid">
          <CourseCard v-for="c in rows" :key="c.courseId" :course="c" :label-list="labelList"
                      :detail-call-back="handleDetail" />
        </div>
        <a-table v-else :columns="columns" :data-source="rows" :pagination="false" :loading="loading"
                 row-key="courseId" size="middle" :scroll="{ x: 820 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'cover'">
              <CourseTable :course="record" :label-list="labelList" :detail-call-back="handleDetail" />
            </template>
            <template v-else-if="column.key === 'difficulty'">{{ dictLabel(record.difficulty) }}</template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusLabel(record.status).color">{{ statusLabel(record.status).label }}</a-tag>
            </template>
          </template>
        </a-table>

        <div v-if="!loading && !rows.length" class="tl__empty" role="status">
          <div class="tl__empty-t">{{ loadError ? t('课程列表接口没有返回数据') : t('还没有可学习的课程') }}</div>
          <div class="tl__empty-d">{{ t('后台发布课程后会显示在这里，也可以调整查询条件后重试。') }}</div>
          <a-button size="small" @click="getList">{{ t('刷新') }}</a-button>
        </div>
      </a-spin>
    </div>

    <Pagination :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="CourseList">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined, SearchOutlined, InsertRowAboveOutlined, MenuUnfoldOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { listCoursePlus } from '@/api/course/course'
import { findListLabel } from '@/api/system/label'
import { getDicts } from '@/api/system/dict/data.js'
import { encryptParams, decryptParams } from '@/utils/aigc'
import CourseCard from './courseCard/index.vue'
import CourseTable from './courseTable/index.vue'
import Pagination from '@/components/Pagination/index.vue'

const props = defineProps({
  courseClassify: { type: [String, Number], required: true },
  courseTitle: { type: String, default: () => t('课程') }
})
const route = useRoute()
const router = useRouter()
const pageTitle = computed(() => props.courseClassify === 1 ? t('案例中心') : t('课程中心'))
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const labelList = ref([])
const difficultyOptions = ref([])
const query = reactive({
  pageNum: 1, pageSize: 12, orderByColumn: 'sort', isAsc: 'asc',
  classify: props.courseClassify, courseName: undefined, state: 2,
  status: undefined, viewTypeMode: 'card'
})
const statusOptions = computed(() => [
  { label: t('未上线'), value: '0' }, { label: t('上线中'), value: '1' }
])
const columns = computed(() => [
  { title: t('课程信息'), dataIndex: 'cover', key: 'cover' },
  { title: t('难度'), dataIndex: 'difficulty', key: 'difficulty', width: 110 },
  { title: t('是否上线'), dataIndex: 'status', key: 'status', width: 110 },
  { title: t('创建者'), dataIndex: 'createByName', key: 'createByName', width: 120 }
])
function statusLabel(s) {
  return ({ 0: { label: t('未上线'), color: 'default' }, 1: { label: t('上线中'), color: 'success' } })[s] || { label: '—', color: 'default' }
}
const dictLabel = (v) => difficultyOptions.value.find(d => String(d.value) === String(v))?.label || '—'

async function getList() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await listCoursePlus({ ...query })
    rows.value = res.rows || []
    total.value = res.total || 0
  } catch (e) {
    rows.value = []; total.value = 0
    loadError.value = t('课程列表接口没有返回数据')
  } finally { loading.value = false }
}
const handleQuery = () => { query.pageNum = 1; getList() }
function resetQuery() {
  query.courseName = undefined; query.status = undefined; handleQuery()
}
async function getLabelList() {
  try { const res = await findListLabel({ type: 1 }); labelList.value = res.rows || [] } catch (e) { /* 标签为空时显示 — */ }
}
async function loadDicts() {
  try {
    const res = await getDicts('sys_course_difficulty')
    difficultyOptions.value = (res.data || []).map(d => ({ label: t(d.dictLabel), value: d.dictValue }))
  } catch (e) { /* 字典失败时不伪造选项 */ }
}
function handleDetail(course) {
  if (Number(course.status) === 0) { message.warning(t('该资源暂未上线，请联系管理员')); return }
  // 案例（classify=1）旧页新窗口直接开 /online/learning；该页 B03 第十六批已迁移（P220），
  // 与旧页一致新标签页打开（页自带顶栏、不进后台外壳）
  if (Number(course.classify) === 1) {
    if (!course.courseId) { message.warning(t('该资源缺少课程编号，无法进入学习')); return }
    window.open(`${window.location.pathname}#/online/learning?courseId=${encodeURIComponent(course.courseId)}`, '_blank')
    return
  }
  const encodedParam = encryptParams({ ...query })
  router.push({
    path: '/course-center/course/courseDetail',
    query: { courseId: course.courseId, encodedParam }
  })
}
onMounted(() => {
  if (route.query.encodedParam) {
    try {
      const decoded = decryptParams(route.query.encodedParam)
      if (decoded) Object.assign(query, decoded)
    } catch (e) { /* 缓存参数损坏时按默认查询 */ }
  }
  getList(); getLabelList(); loadDicts()
})
</script>

<style scoped>
.tl { display: flex; flex-direction: column; gap: 14px; }
.tl__err { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border: 1px solid var(--danger-line); background: var(--danger-soft); border-radius: var(--r); color: var(--danger); font-size: 12px; }
.tl__tool {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 14px;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-1);
}
.tl__spacer { flex: 1; min-width: 8px; }
.tl__body { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-1); padding: 14px; min-height: 220px; }
.tl__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(258px, 1fr)); gap: 16px; }
.tl__empty { padding: 44px 16px; text-align: center; }
.tl__empty-t { font-weight: 600; color: var(--ink-2); }
.tl__empty-d { color: var(--ink-4); font-size: 12px; margin: 6px 0 12px; }
</style>
