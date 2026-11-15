<template>
  <!--
    名单下钻（设计文档 §4.2）：态 B 点「名单」打开，行粒度从「学生 × 章节 × 一次作答」收窄成
    「学生 × 这份卷 × 一次作答」（同卷重做两轮就是两行，不再只留最高分那行）。
    主表是班级学生集，所以「没做过本卷」的人也会出行 —— 注意它 ≠「没做作业」，
    可能做了同章节的另一份卷，所以状态列文案要分开写。
  -->
  <a-modal
    :open="open"
    :title="modalTitle"
    :width="980"
    :footer="null"
    destroy-on-close
    @update:open="val => emit('update:open', val)"
  >
    <div class="hr__bar">
      <a-radio-group v-model:value="quickFilter" button-style="solid" size="small">
        <a-radio-button value="all">{{ t('全部（{n} 行）', { n: rows.length }) }}</a-radio-button>
        <a-radio-button value="done">{{ t('做过本卷（{n} 行）', { n: doneCount }) }}</a-radio-button>
        <a-radio-button value="undone">{{ t('没做过本卷（{n} 行）', { n: rows.length - doneCount - pendingCount }) }}</a-radio-button>
      </a-radio-group>
      <span class="hr__tip">{{ t('本班级共 {n} 人', { n: totalStudents }) }}</span>
    </div>

    <a-table
      :row-key="record => `${record.userId}_${record.attemptNo || 'none'}`"
      size="small"
      :columns="columns"
      :data-source="filteredRows"
      :loading="loading"
      :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: n => t('共 {n} 行', { n }) }"
      :scroll="{ y: 420 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <span v-if="isDone(record)" class="tag ok">{{ t('已完成') }}</span>
          <span v-else-if="isPending(record)" class="tag warn">{{ t('待评分') }}</span>
          <span v-else class="tag">{{ t('没做过本卷') }}</span>
        </template>
        <template v-else-if="column.key === 'attemptNo'">
          <span v-if="record.attemptNo">{{ t('第 {n} 次', { n: record.attemptNo }) }}</span>
          <span v-else class="hr__muted">—</span>
        </template>
        <template v-else-if="column.key === 'score'">
          <span v-if="isDone(record)" class="hr__score">{{ record.score }}</span>
          <span v-else class="hr__muted">—</span>
        </template>
        <template v-else-if="column.key === 'finishedTime'">
          {{ record.finishedTime || '—' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-button v-if="isDone(record)" type="link" size="small" @click="openDetail(record)">
            {{ t('查看逐题') }}
          </a-button>
          <span v-else class="hr__muted">—</span>
        </template>
      </template>
    </a-table>

    <HomeworkDetail
      v-model:open="detailOpen"
      :title="detailTitle"
      :exam-id="detailExamId"
      :user-id="detailUserId"
      :user-name="detailUserName"
    />
  </a-modal>
</template>

<script setup name="HomeworkRoster">
import { computed, ref, watch } from 'vue'
import { t } from '@/i18n'
import { getCompleteRoster } from '@/api/exam/homework'
import HomeworkDetail from './homeworkDetail.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  paperId: { type: [String, Number], default: '' },
  paperTitle: { type: String, default: '' },
  // 「全部」由父级展开成完整班级 id，这里只透传（分母口径只能有一个来源）
  classIds: { type: Array, default: () => [] }
})
const emit = defineEmits(['update:open'])

const loading = ref(false)
const rows = ref([])
const totalStudents = ref(0)
const quickFilter = ref('all')

const detailOpen = ref(false)
const detailTitle = ref('')
const detailExamId = ref('')
const detailUserId = ref('')
const detailUserName = ref('')

const columns = computed(() => [
  { title: t('学生'), dataIndex: 'userName', key: 'userName', width: 140, ellipsis: true },
  { title: t('班级'), dataIndex: 'className', key: 'className', width: 140, ellipsis: true },
  { title: t('次数'), key: 'attemptNo', width: 80 },
  { title: t('状态'), key: 'status', width: 110 },
  { title: t('得分'), key: 'score', width: 90 },
  { title: t('完成时间'), key: 'finishedTime', width: 170 },
  { title: t('操作'), key: 'action', width: 110 }
])

const modalTitle = computed(() => `${props.paperTitle || t('本卷')} · ${t('完成名单')}`)
const doneCount = computed(() => rows.value.filter(isDone).length)
const pendingCount = computed(() => rows.value.filter(isPending).length)
const filteredRows = computed(() => {
  if (quickFilter.value === 'done') return rows.value.filter(isDone)
  if (quickFilter.value === 'undone') return rows.value.filter((row) => !isDone(row) && !isPending(row))
  return rows.value
})

// 后端布尔列可能是 true/false，也可能是 1/0，统一走这一处判断
function isDone(record) {
  return record.finished === true || record.finished === 1 || record.finished === '1'
}
function isPending(record) {
  return !isDone(record) && (record.submitted === true || record.submitted === 1 || record.submitted === '1')
}

function openDetail(record) {
  detailExamId.value = record.examId
  detailUserId.value = record.userId
  detailUserName.value = record.userName
  // 标题带上「谁 · 哪份卷 · 第几次」，否则老师会以为看的是章节汇总
  detailTitle.value = `${record.userName} · ${props.paperTitle || t('本卷')}`
    + (record.attemptNo ? ` · ${t('第 {n} 次', { n: record.attemptNo })}` : '')
  detailOpen.value = true
}

function loadRoster() {
  if (!props.paperId) return
  loading.value = true
  getCompleteRoster({ paperId: props.paperId, classIds: props.classIds })
    .then((res) => {
      const data = res?.data || {}
      rows.value = data.rows || []
      totalStudents.value = data.totalStudents || 0
    })
    .catch(() => {
      rows.value = []
      totalStudents.value = 0
    })
    .finally(() => {
      loading.value = false
    })
}

// 弹窗每次打开都重新拉：名单是给催交用的，隔天数据就变了，不做缓存
watch(() => props.open, (val) => {
  if (val) {
    quickFilter.value = 'all'
    loadRoster()
  } else {
    rows.value = []
  }
})
</script>

<style scoped>
.hr__bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.hr__tip { font-size: 12px; color: var(--ink-4); }
.hr__score { font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.hr__muted { color: var(--ink-4); }
</style>
