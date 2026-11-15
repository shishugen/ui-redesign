<template>
  <!--
    学生端「我的作业」（设计文档 §3）：只显示自己真正做完的卷子。
    不做章节汇总行、不算「够不够数」—— 那些口径归章节页的作业条，本模块不重复算；
    也不显示「老师已批改/待批改」：AI 批完即出分，中间态出现在这里只会误导学生。
  -->
  <div class="hs">
    <section class="hs__card">
      <header class="hs__hd">
        <div class="hs__filter">
          <span class="hs__lab">{{ t('课程') }}</span>
          <a-select
            v-model:value="courseId"
            class="hs__sel hs__sel--course"
            :placeholder="t('全部课程')"
            allow-clear
            show-search
            option-filter-prop="label"
            :options="courseOptions"
            @change="onCourseChange"
          />
          <span class="hs__lab">{{ t('章节') }}</span>
          <a-select
            v-model:value="chapterId"
            class="hs__sel hs__sel--chapter"
            :placeholder="t('全部章节')"
            allow-clear
            :options="chapterOptions"
          />
        </div>
        <div class="hs__acts">
          <a-button type="primary" :loading="loading" @click="loadList">
            <template #icon><SearchOutlined /></template>
            {{ t('搜 索') }}
          </a-button>
          <a-button @click="resetQuery">
            <template #icon><ReloadOutlined /></template>
            {{ t('重 置') }}
          </a-button>
        </div>
      </header>

      <!-- ① 错误态：接口挂了要说清楚，不能让人以为「我一份都没做」 -->
      <div v-if="loadError" class="hs__err" role="alert">
        <div>
          <b>{{ t('作业清单加载失败') }}</b>
          <p>{{ loadError }}</p>
        </div>
        <a-button size="small" @click="loadList">{{ t('重试') }}</a-button>
      </div>

      <a-table
        row-key="paperId"
        size="middle"
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: n => t('共 {n} 份卷子', { n }) }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'score'">
            <span class="hs__score">{{ record.bestScore }}</span>
            <!-- 最高分与最近一次不同时才补一句：重做过的人关心「我最后一次考了多少」 -->
            <span v-if="showLastScore(record)" class="hs__score-last">
              {{ t('最近 {n}', { n: record.lastScore }) }}
            </span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openDetail(record)">{{ t('查看逐题') }}</a-button>
          </template>
        </template>
        <template #emptyText>
          <div class="hs__empty" role="status">
            <div class="hs__empty-t">{{ t('这个课程还没有已完成的作业') }}</div>
            <div class="hs__empty-d">{{ t('做完章节作业后，卷子会出现在这里。') }}</div>
            <a-button type="primary" size="small" @click="goChapters">{{ t('去章节列表做题') }}</a-button>
          </div>
        </template>
      </a-table>
    </section>

    <HomeworkDetail
      v-model:open="detailOpen"
      :title="detailTitle"
      :exam-id="detailExamId"
      :user-name="userName"
      self
    />
  </div>
</template>

<script setup name="HomeworkStudent">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { getMyCompleteList } from '@/api/exam/homework'
import { getNickName } from '@/utils/user'
import HomeworkDetail from './homeworkDetail.vue'

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const rows = ref([])
const courseId = ref(undefined)
// 章节条件只过滤已拉到的数据（量很小，不值得为它多一次往返）
const chapterId = ref(undefined)

const detailOpen = ref(false)
const detailTitle = ref('')
const detailExamId = ref('')
// 逐题明细头部那行「考生：xxx」靠调用方传（组件自己不去取用户信息）
const userName = computed(() => getNickName())

const columns = computed(() => [
  { title: t('课程'), dataIndex: 'courseName', key: 'courseName', ellipsis: true },
  { title: t('章节'), dataIndex: 'chapterName', key: 'chapterName', ellipsis: true },
  { title: t('试卷'), dataIndex: 'examTitle', key: 'examTitle', ellipsis: true },
  { title: t('得分'), key: 'score', width: 140 },
  { title: t('完成时间'), dataIndex: 'finishedTime', key: 'finishedTime', width: 180 },
  { title: t('操作'), key: 'action', width: 120 }
])

// 下拉只放自己真做过的课：本模块只回顾已完成的，把没开课的也列出来没有意义
const courseOptions = computed(() => {
  const seen = new Set()
  const options = []
  for (const row of rows.value) {
    const id = String(row.courseId ?? '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    options.push({ value: id, label: row.courseName || t('未知课程') })
  }
  return options
})

const filteredRows = computed(() => {
  let list = rows.value
  if (courseId.value) list = list.filter((row) => String(row.courseId) === String(courseId.value))
  if (chapterId.value) list = list.filter((row) => String(row.chapterId) === String(chapterId.value))
  return list
})

// 章节下拉先按所选课程筛一遍再派生：否则选了课程后，下拉里还会跳出别的课程的章节
const chapterOptions = computed(() => {
  const seen = new Set()
  const options = []
  for (const row of rows.value) {
    if (courseId.value && String(row.courseId) !== String(courseId.value)) continue
    const id = String(row.chapterId ?? '')
    if (!id || seen.has(id)) continue
    seen.add(id)
    options.push({ value: id, label: row.chapterName || t('未知章节') })
  }
  return options
})

// 换课程必须清掉章节：两个条件是「与」关系，留着上一门课的章节会让列表直接空掉，
// 而空列表看起来像「没做过作业」而不是「条件互斥」
function onCourseChange() {
  chapterId.value = undefined
}

function resetQuery() {
  courseId.value = undefined
  chapterId.value = undefined
  loadList()
}

// 分数口径：bestScore = 这份卷分数最高的那轮；lastScore = 最近一次交卷的那轮
function showLastScore(record) {
  return record.lastScore !== null && record.lastScore !== undefined
    && String(record.lastScore) !== String(record.bestScore)
}

function loadList() {
  loading.value = true
  loadError.value = ''
  getMyCompleteList({})
    .then((res) => {
      rows.value = res?.data?.list || []
    })
    .catch((err) => {
      rows.value = []
      loadError.value = err?.message || t('作业接口不可用')
    })
    .finally(() => {
      loading.value = false
    })
}

function openDetail(record) {
  detailExamId.value = record.examId
  detailTitle.value = `${record.examTitle || t('本卷')} · ${t('逐题明细')}`
  detailOpen.value = true
}

function goChapters() {
  // 只做跳转，不在本页内嵌做题能力
  const query = courseId.value ? { courseId: courseId.value, type: 'chapter' } : {}
  router.push({ path: '/online/learning', query })
}

onMounted(loadList)
</script>

<style scoped>
.hs { display: flex; flex-direction: column; gap: 14px; }

.hs__card {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1); overflow: hidden;
}
.hs__hd {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 13px 16px; border-bottom: 1px solid var(--line-3);
}
.hs__filter { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }
.hs__lab { font-size: 12px; color: var(--ink-3); white-space: nowrap; }
.hs__sel--course { width: 300px; }
.hs__sel--chapter { width: 240px; }
.hs__acts { margin-left: auto; display: flex; align-items: center; gap: 8px; }

.hs__err {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  margin: 14px 16px 0; padding: 12px 14px; border-radius: var(--r);
  border: 1px solid var(--danger-line); background: var(--danger-soft); color: var(--danger);
}
.hs__err b { font-size: 13px; }
.hs__err p { margin: 4px 0 0; font-size: 12px; opacity: .85; }

.hs__score { font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.hs__score-last { margin-left: 6px; font-size: 12px; color: var(--ink-4); }

.hs__empty { padding: 26px 12px; }
.hs__empty-t { font-size: 13.5px; font-weight: 600; color: var(--ink-2); }
.hs__empty-d { margin: 6px 0 14px; font-size: 12px; color: var(--ink-4); }

@media (max-width: 900px) {
  .hs__sel--course, .hs__sel--chapter { width: 100%; }
  .hs__acts { margin-left: 0; }
}
</style>
