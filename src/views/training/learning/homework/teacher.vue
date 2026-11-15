<template>
  <!--
    教师端作业完成看板（设计文档 §4.1）：左列班级 + 顶部课程/章节 + 概览条 + 列表两态。
    两态的切换条件只有一个：章节筛选是否为空 —— 不做视图切换按钮。
    态 A 回答「谁还没做」，态 B 回答「哪份卷有问题」，让筛选器决定比按钮不容易误操作。
    本看板全程只读：不给评分/确认入口，简答题要改分得回考试批阅页。
  -->
  <div class="ht">
    <!-- 左：教学班级 -->
    <aside class="ht__side">
      <div class="ht__side-hd">{{ t('教学班级') }}</div>
      <div class="ht__side-bd">
        <button
          type="button"
          class="ht__cls"
          :class="{ 'is-active': classKey === 'all' }"
          :aria-current="classKey === 'all' ? 'true' : 'false'"
          @click="selectClass('all')"
        >
          <span class="ht__cls-name">{{ t('全部') }}</span>
          <span v-if="countableClasses.length" class="chip">{{ countableStudentSum }}</span>
        </button>
        <button
          v-for="item in countableClasses"
          :key="item.classId"
          type="button"
          class="ht__cls"
          :class="{ 'is-active': classKey === String(item.classId) }"
          :aria-current="classKey === String(item.classId) ? 'true' : 'false'"
          @click="selectClass(String(item.classId))"
        >
          <span class="ht__cls-name">{{ item.className }}</span>
          <span class="chip">{{ item.studentCount }}</span>
        </button>

        <!-- 没开本课 / 任课老师不是我的班：仍然列出（左栏是「我的全部班」），但不是按钮 ——
             渲染成普通 div 就物理上点不动，也就不会拉出那一片假「未完成」 -->
        <div v-if="uncountableClasses.length" class="ht__off">
          <div class="ht__off-hd">{{ t('未计入本次统计（{n} 个班）', { n: uncountableClasses.length }) }}</div>
          <div v-for="item in uncountableClasses" :key="item.classId" class="ht__off-item">
            <div class="ht__off-row">
              <span class="ht__off-name">{{ item.className }}</span>
              <span class="ht__off-count">{{ item.studentCount }}</span>
            </div>
            <div class="ht__off-reason">{{ offReason(item) }}</div>
          </div>
        </div>

        <div v-if="!classes.length && !loading" class="ht__empty" role="status">
          <div class="ht__empty-t">{{ t('你还没有被分配到任何班级') }}</div>
          <div class="ht__empty-d">{{ t('先到「课程分配」把班级与课程分配好，再回来看完成情况。') }}</div>
        </div>
      </div>
    </aside>

    <!-- 右：看板 -->
    <section class="ht__main">
      <header class="ht__filter">
        <div class="ht__course">
          <template v-if="useTabs">
            <a-tabs :active-key="courseId" class="ht__tabs" @change="onCourseChange">
              <a-tab-pane v-for="item in boardCourses" :key="String(item.courseId)" :tab="courseTabLabel(item)" />
            </a-tabs>
          </template>
          <template v-else>
            <span class="ht__lab">{{ t('课程') }}</span>
            <a-select
              v-model:value="courseId"
              class="ht__sel--course"
              :placeholder="t('请选择课程')"
              show-search
              option-filter-prop="label"
              :options="courseOptions"
              @change="onCourseChange"
            />
          </template>
        </div>

        <span class="ht__lab">{{ t('章节') }}</span>
        <a-select
          v-model:value="chapterId"
          class="ht__sel--chapter"
          :placeholder="t('全部章节')"
          allow-clear
          :options="chapterOptions"
        />

        <div class="ht__acts">
          <a-button type="primary" @click="loadBoard">
            <template #icon><SearchOutlined /></template>
            {{ t('搜 索') }}
          </a-button>
          <a-button @click="resetQuery">
            <template #icon><ReloadOutlined /></template>
            {{ t('重 置') }}
          </a-button>
        </div>
      </header>

      <!-- 概览条：口径固定为「所选班级里做过本章节任意一卷的人 / 班级总人数」，不随两态变 -->
      <div v-if="courseId" class="ht__summary">
        {{ t('完成') }} <b>{{ summary.finishedStudents || 0 }}</b> / {{ summary.totalStudents || 0 }} {{ t('人') }}
        <span class="ht__summary-dot" aria-hidden="true">·</span>
        {{ t('完成率') }} <b>{{ summary.finishRate || '0%' }}</b>
        <span class="ht__scope">{{ scopeText }}</span>
      </div>

      <div v-if="emptyReason" class="ht__note" role="status">
        <span class="dot warn" aria-hidden="true" />
        <span>{{ emptyReason }}</span>
      </div>

      <!-- 态 A：一行 = 一个学生 × 一个章节 × 一次作答（含未完成行，催交主视图） -->
      <template v-if="mode === 'student'">
        <div class="ht__quick">
          <a-radio-group v-model:value="stateFilter" button-style="solid" size="small">
            <a-radio-button value="all">{{ t('全部（{n} 行）', { n: rows.length }) }}</a-radio-button>
            <a-radio-button value="unfinished">{{ t('未完成（{n} 行）', { n: unfinishedCount }) }}</a-radio-button>
            <a-radio-button value="pending">{{ t('待评分（{n} 行）', { n: pendingCount }) }}</a-radio-button>
            <a-radio-button value="finished">{{ t('已完成（{n} 行）', { n: finishedCount }) }}</a-radio-button>
          </a-radio-group>
        </div>
        <a-table
          row-key="rowKey"
          size="middle"
          :columns="studentColumns"
          :data-source="studentRows"
          :loading="loading"
          :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: n => t('共 {n} 行', { n }) }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <span v-if="isDone(record)" class="tag ok">{{ t('已完成') }}</span>
              <!-- 交了卷但成绩还没生效：不能算完成，也不能说没做，否则同一批人被催两遍 -->
              <span v-else-if="isPending(record)" class="tag warn">{{ t('待评分') }}</span>
              <span v-else class="tag">{{ t('未完成') }}</span>
            </template>
            <template v-else-if="column.key === 'score'">
              <span v-if="isDone(record)" class="ht__score">{{ record.score }}</span>
              <span v-else class="ht__muted">—</span>
            </template>
            <template v-else-if="column.key === 'attemptNo'">
              <span v-if="record.attemptNo">{{ t('第 {n} 次', { n: record.attemptNo }) }}</span>
              <span v-else class="ht__muted">—</span>
            </template>
            <template v-else-if="column.key === 'paperTitle'">
              <span v-if="record.paperTitle">{{ record.paperTitle }}</span>
              <span v-else class="ht__muted">—</span>
            </template>
            <template v-else-if="column.key === 'finishedTime'">
              {{ record.finishedTime || '—' }}
            </template>
            <template v-else-if="column.key === 'action'">
              <!-- 标题带卷名：一行就是一次作答，不写卷名会被当成章节汇总分 -->
              <a-button v-if="isDone(record)" type="link" size="small" @click="openDetail(record)">
                {{ t('查看逐题') }}
              </a-button>
              <!-- 长期停在「待评分」说明交卷时那次自动 AI 判分没跑成，给老师手动重发 -->
              <a-tooltip
                v-else-if="canAiGrade && isPending(record)"
                :title="t('给该学生本卷的简答题重新发起 AI 判分（含全部轮次）；只判未评过的题，不会覆盖人工批过的题')"
              >
                <a-button type="link" size="small" :loading="aiGrading === record.rowKey" @click="aiGrade(record)">
                  {{ t('AI评分') }}
                </a-button>
              </a-tooltip>
              <span v-else class="ht__muted">—</span>
            </template>
          </template>
        </a-table>
      </template>

      <!-- 态 B：一行 = 一份试卷（卷诊断视图），回答「哪份没人做、哪份分异常低」 -->
      <template v-else-if="mode === 'paper'">
        <a-table
          row-key="paperId"
          size="middle"
          :columns="paperColumns"
          :data-source="rows"
          :loading="loading"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'finishedStudents'">
              {{ record.finishedStudents || 0 }}/{{ summary.totalStudents || 0 }}
            </template>
            <template v-else-if="column.key === 'finishRate'">{{ paperRate(record) }}</template>
            <template v-else-if="column.key === 'avgScore'">
              <span v-if="hasScore(record)" class="ht__score">{{ record.avgScore }}</span>
              <span v-else class="ht__muted">—</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" @click="openRoster(record)">{{ t('名单') }}</a-button>
            </template>
          </template>
        </a-table>
        <!-- 表底那行必须单独算：把各卷完成人数相加会得出 47/42 这种数（一人可能做过多卷） -->
        <div class="ht__total">
          {{ t('该章节完成人数（做过任意一卷）') }}
          <b>{{ summary.finishedStudents || 0 }}</b>/{{ summary.totalStudents || 0 }}
        </div>
      </template>

      <p class="ht__tip">
        {{ t('简答题分数由 AI 评定并在交卷后自动收口；长期停在「待评分」的行可点「AI评分」重新触发；评分有误请回「考试批阅」页处理，本看板不提供改分入口。') }}
      </p>
    </section>

    <HomeworkRoster
      v-model:open="rosterOpen"
      :paper-id="rosterPaperId"
      :paper-title="rosterPaperTitle"
      :class-ids="selectedClassIds"
    />

    <HomeworkDetail
      v-model:open="detailOpen"
      :title="detailTitle"
      :exam-id="detailExamId"
      :user-id="detailUserId"
      :user-name="detailUserName"
    />
  </div>
</template>

<script setup name="HomeworkTeacher">
import { computed, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { getCompleteBoard, getHomeworkBoardFilters } from '@/api/exam/homework'
import { previewAiGrade } from '@/api/exam/aiExam'
import { getUserPermissions } from '@/utils/user'
import HomeworkRoster from './homeworkRoster.vue'
import HomeworkDetail from './homeworkDetail.vue'

/** 课程 tab 的经验上限：再多就得换行，换行后选择器会挤列表高度 */
const TAB_MAX = 8

const loading = ref(false)
const courses = ref([])
const classes = ref([])
const chapters = ref([])
const rows = ref([])
const summary = ref({})
const mode = ref('student')
const emptyReason = ref('')

const courseId = ref(undefined)
const classKey = ref('all')
const chapterId = ref(undefined)
const stateFilter = ref('all')

const rosterOpen = ref(false)
const rosterPaperId = ref('')
const rosterPaperTitle = ref('')
const detailOpen = ref(false)
const detailTitle = ref('')
const detailExamId = ref('')
const detailUserId = ref('')
const detailUserName = ref('')

// AI 判分手动重发：接口复用考试侧 /aiExam/previewGrade（按 examId+userId 滤未评简答题，不限轮次），
// 作业侧零新增后端方法。按钮可见性按权限键判（与考试批阅页同一把钥匙），不按角色分支。
// 用 getUserPermissions() 而不是 checkPermi()：后者在空权限时会 console.error，污染 0 error 断言。
const canAiGrade = computed(() => {
  const perms = getUserPermissions() || []
  return perms.includes('*:*:*') || perms.includes('exam:aiExam:grade')
})
// 正在判的行的 rowKey：AI 判分是同步长请求，同一时刻只允许一个在飞，也顺带防连点重复计费
const aiGrading = ref('')

function aiGrade(record) {
  if (aiGrading.value) return
  if (!record.examId || !record.userId) {
    message.warning(t('该行还没有考试或学生标识，无法发起 AI 评分'))
    return
  }
  aiGrading.value = record.rowKey
  // 同步等到大模型返回（api 层 125s 超时），不挂进行中提示会像页面卡死
  const hide = message.loading(t('AI 正在评定简答题，可能需要几分钟…'), 0)
  previewAiGrade({ examId: record.examId, userId: record.userId }).then((res) => {
    const s = res?.data || {}
    if (!s.scanned) {
      message.info(t('本卷没有待 AI 评分的简答题（可能已收口或已转人工），刷新看板中…'))
    } else {
      message.success(t('AI 预评完成：共 {scanned} 题待判，生效 {applied} 题，转人工 {failed} 题', {
        scanned: s.scanned, applied: s.applied || 0, failed: s.failed || 0
      }))
    }
    loadBoard()
  }).catch(() => {
    message.error(t('AI 评分触发失败：检查判分服务状态，或到「考试批阅」页人工处理该生简答题'))
  }).finally(() => {
    hide()
    aiGrading.value = ''
  })
}

const studentColumns = computed(() => [
  { title: t('学生'), dataIndex: 'userName', key: 'userName', width: 120, ellipsis: true },
  { title: t('班级'), dataIndex: 'className', key: 'className', width: 120, ellipsis: true },
  { title: t('章节'), dataIndex: 'chapterName', key: 'chapterName', ellipsis: true },
  // 同一人在同一章节做两份卷时，这两列是区分两行的唯一依据，不能省
  { title: t('试卷'), key: 'paperTitle', width: 180, ellipsis: true },
  { title: t('次数'), key: 'attemptNo', width: 78 },
  { title: t('状态'), key: 'status', width: 96 },
  { title: t('得分'), key: 'score', width: 80 },
  { title: t('完成时间'), key: 'finishedTime', width: 160 },
  { title: t('操作'), key: 'action', width: 120, align: 'center' }
])

const paperColumns = computed(() => [
  { title: t('试卷'), dataIndex: 'examTitle', key: 'examTitle', ellipsis: true },
  { title: t('完成人数'), key: 'finishedStudents', width: 120 },
  { title: t('完成率'), key: 'finishRate', width: 100 },
  { title: t('均分'), key: 'avgScore', width: 100 },
  { title: t('操作'), key: 'action', width: 100, align: 'center' }
])

// 班级列表是「我被分配到的所有班」（不区分课程），所以不能按 chapterCount 过滤课程：
// 已分配但还没布置作业的课也要能点到，否则老师分不清是「没分到课」还是「课没作业」
const boardCourses = computed(() => courses.value)
// 只按数量阈值切 tab/下拉，不按角色切
const useTabs = computed(() => boardCourses.value.length <= TAB_MAX)
// 0 个章节有作业的课要标出来：点进去是一张空表，不标会被当成看板坏了
function courseTabLabel(item) {
  return Number(item.chapterCount) > 0 ? item.courseName : `${item.courseName}${t('（暂无作业）')}`
}
const courseOptions = computed(() => courses.value.map((item) => ({
  value: String(item.courseId),
  label: Number(item.chapterCount) > 0
    ? t('{name}（{n} 个章节有作业）', { name: item.courseName, n: item.chapterCount })
    : `${item.courseName}${t('（暂无作业）')}`
})))
const chapterOptions = computed(() => chapters.value.map((item) => ({
  value: String(item.chapterId),
  label: item.chapterName
})))

// 后端只在选了课程时才回 countable / openedToCourse 这两列；没回就当「不适用」，
// 不能在没有课程的时候把全部班都赶进未计入那一组
function flagOf(item, name) {
  const v = item[name]
  if (v === undefined || v === null) return true
  return v === true || v === 1 || v === '1'
}
// countable = 班↔课↔我：进了这一组才会进完成率分母
function isCountable(item) {
  return flagOf(item, 'countable')
}

const countableClasses = computed(() => classes.value.filter(isCountable))
const uncountableClasses = computed(() => classes.value.filter((item) => !isCountable(item)))
// 「全部」那一行的人数：只加已计入的班（现网实测：该门课全部班 43 人，实际只开给其中 2 人）
const countableStudentSum = computed(() => countableClasses.value.reduce(
  (sum, item) => sum + Number(item.studentCount || 0), 0
))

// 两种置灰原因必须分开说：把「同事任课的班」说成「没开课」，老师会去查一个不存在的分配问题
function offReason(item) {
  return flagOf(item, 'openedToCourse')
    ? t('本课已开给这个班，但任课老师不是我，不计入我的统计')
    : t('这个班没开这门课，学生看不到该作业')
}

// 「全部」= 计入这门课的班（开了本课且我任课），不含置灰那批
const selectedClassIds = computed(() => {
  if (classKey.value !== 'all') return [classKey.value]
  return countableClasses.value.map((item) => String(item.classId))
})

const currentCourseName = computed(() => {
  const hit = courses.value.find((item) => String(item.courseId) === String(courseId.value))
  return hit ? hit.courseName : ''
})
const scopeText = computed(() => {
  if (!courseId.value) return ''
  const classPart = classKey.value === 'all'
    ? t('已计入 {n} 个班', { n: countableClasses.value.length })
    : (classes.value.find((item) => String(item.classId) === classKey.value)?.className || '')
  const chapterPart = chapterId.value
    ? (chapters.value.find((item) => String(item.chapterId) === String(chapterId.value))?.chapterName || '')
    : t('全部章节')
  return `${currentCourseName.value} · ${classPart} · ${chapterPart}`
})

function isDone(record) {
  return record.finished === true || record.finished === 1 || record.finished === '1'
}
function isPending(record) {
  return !isDone(record) && (record.submitted === true || record.submitted === 1 || record.submitted === '1')
}
function hasScore(record) {
  return record.avgScore !== null && record.avgScore !== undefined
}
function paperRate(record) {
  const total = Number(summary.value.totalStudents || 0)
  if (!total) return '0%'
  return Math.round(Number(record.finishedStudents || 0) * 100 / total) + '%'
}

// 态 A 一行是「学生×章节×一次作答」，rowKey 得把三者拼起来：
// 只拼 userId+chapterId 会在同一人做两份卷时撞 key（antd 会直接报 duplicate keys 并丢行）
function decorateRows(list) {
  return (list || []).map((row) => ({
    ...row,
    rowKey: `${row.userId}_${row.chapterId}_${row.attemptNo || 'none'}_${row.examId || 'none'}`
  }))
}

const finishedCount = computed(() => rows.value.filter(isDone).length)
const pendingCount = computed(() => rows.value.filter(isPending).length)
const unfinishedCount = computed(() => rows.value.filter((row) => !isDone(row) && !isPending(row)).length)
const studentRows = computed(() => {
  if (stateFilter.value === 'finished') return rows.value.filter(isDone)
  if (stateFilter.value === 'pending') return rows.value.filter(isPending)
  if (stateFilter.value === 'unfinished') return rows.value.filter((row) => !isDone(row) && !isPending(row))
  return rows.value
})

function loadFilters(withCourse) {
  return getHomeworkBoardFilters(withCourse || undefined).then((res) => {
    const data = res?.data || {}
    courses.value = data.courses || []
    classes.value = data.classes || []
    chapters.value = data.chapters || []
  }).catch(() => {
    courses.value = []
    classes.value = []
    chapters.value = []
  })
}

/**
 * 看板拉不出数据、但不该当错误处理的两类情况，返回要展示的空态文案（没事就返回空串）。
 * 这两种都是正常业务状态，在本地先挡住，不拿去撞错误框。
 */
function blockedReason() {
  if (!classes.value.length) {
    return t('班级列表为空：你还没有被分配到任何班级，或分配到的班里没有在册学生')
  }
  if (classKey.value === 'all') {
    return countableClasses.value.length
      ? ''
      : t('{name} 还没开给你任教的班级：你被分配的班都没被开这门课，或任课老师不是你（左下列出了这些班）',
        { name: currentCourseName.value || t('这门课') })
  }
  const chosen = classes.value.find((item) => String(item.classId) === classKey.value)
  // 列表里找不到这个班就交给后端判（越界会被拒），不在这里瞎猜原因
  if (!chosen || isCountable(chosen)) return ''
  return `${chosen.className}：${offReason(chosen)}`
}

function loadBoard() {
  if (!courseId.value) {
    rows.value = []
    summary.value = {}
    return
  }
  const blocked = blockedReason()
  if (blocked) {
    rows.value = []
    summary.value = {}
    mode.value = chapterId.value ? 'paper' : 'student'
    emptyReason.value = blocked
    return
  }
  loading.value = true
  emptyReason.value = ''
  getCompleteBoard({
    courseId: courseId.value,
    classIds: selectedClassIds.value,
    chapterId: chapterId.value
  }).then((res) => {
    const data = res?.data || {}
    mode.value = data.mode || (chapterId.value ? 'paper' : 'student')
    summary.value = data.summary || {}
    rows.value = mode.value === 'student' ? decorateRows(data.rows) : (data.rows || [])
    emptyReason.value = data.emptyReason || ''
  }).catch((err) => {
    rows.value = []
    summary.value = {}
    emptyReason.value = err?.message || t('看板数据加载失败')
  }).finally(() => {
    loading.value = false
  })
}

function onCourseChange(key) {
  courseId.value = String(key)
  chapterId.value = undefined
  classKey.value = 'all'
  stateFilter.value = 'all'
  // 班级与章节都挂在课程下，换课必须重拉，否则会拿着上一门课的班级去算这一门课的完成率
  loadFilters(courseId.value).then(loadBoard)
}

function selectClass(key) {
  classKey.value = String(key)
  loadBoard()
}

function resetQuery() {
  chapterId.value = undefined
  classKey.value = 'all'
  stateFilter.value = 'all'
  loadBoard()
}

function openRoster(record) {
  rosterPaperId.value = record.paperId
  rosterPaperTitle.value = record.examTitle
  rosterOpen.value = true
}

function openDetail(record) {
  detailExamId.value = record.examId
  detailUserId.value = record.userId
  detailUserName.value = record.userName
  detailTitle.value = `${record.userName} · ${record.paperTitle || record.chapterName || t('本卷')}`
    + (record.attemptNo ? ` · ${t('第 {n} 次', { n: record.attemptNo })}` : '')
  detailOpen.value = true
}

// 进页先拉一次筛选器，再默认选中排首的课程：课程按有作业池的章节数降序排，
// 第一条就是作业最多的那门；班级默认「全部」。管理员也走这一段，不给他单独分支
onMounted(() => {
  loadFilters().then(() => {
    const first = boardCourses.value[0]
    if (!first) {
      emptyReason.value = t('没有可看板的课程：你还没被分配到任何课程，或全库还没有布置过章节作业')
      return
    }
    onCourseChange(first.courseId)
  })
})

// 章节筛选一变就重算列表：这是两态唯一的切换条件，不放在 watch 里会漏掉「清空章节」那一次
watch(chapterId, () => loadBoard())
</script>

<style scoped>
.ht {
  display: flex; gap: 14px; min-height: 0;
  background: var(--bg);
}

/* 左栏 */
.ht__side {
  flex: none; width: 210px; display: flex; flex-direction: column; min-height: 0;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1); overflow: hidden;
}
.ht__side-hd {
  padding: 12px 14px 8px; font-size: 12.5px; font-weight: 600; color: var(--ink-3);
  border-bottom: 1px solid var(--line-3);
}
.ht__side-bd { flex: 1; min-height: 0; overflow: auto; padding: 6px; }

.ht__cls {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 7px 9px; margin-bottom: 2px;
  border: 0; border-radius: var(--r-sm); background: transparent;
  font: inherit; text-align: left; cursor: pointer;
  transition: background .14s ease;
}
.ht__cls:hover { background: var(--bg-soft); }
.ht__cls.is-active { background: var(--pri-100); }
.ht__cls-name {
  flex: 0 1 auto; min-width: 0; font-size: 12.5px; color: var(--ink-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ht__cls.is-active .ht__cls-name { color: var(--pri-ink); font-weight: 600; }

.ht__off { margin-top: 6px; padding: 8px 9px 4px; border-top: 1px dashed var(--line-2); }
.ht__off-hd { margin-bottom: 7px; font-size: 11.5px; color: var(--ink-4); }
.ht__off-item + .ht__off-item { margin-top: 8px; }
.ht__off-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.ht__off-name {
  flex: 0 1 auto; min-width: 0; font-size: 12px; color: var(--ink-4);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ht__off-count { font-size: 11.5px; color: var(--ink-4); font-variant-numeric: tabular-nums; }
.ht__off-reason { margin-top: 2px; font-size: 11px; line-height: 1.55; color: var(--ink-4); }

.ht__empty { padding: 16px 12px; text-align: center; }
.ht__empty-t { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
.ht__empty-d { margin-top: 5px; font-size: 11.5px; color: var(--ink-4); line-height: 1.6; }

/* 右栏 */
.ht__main {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1); padding: 14px 16px 18px;
}

.ht__filter {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--line-3);
}
.ht__course { display: flex; align-items: center; gap: 8px; flex: 0 1 auto; min-width: 0; }
.ht__tabs { flex: 1 1 auto; min-width: 0; }
.ht__tabs :deep(.ant-tabs-nav) { margin-bottom: 0; }
.ht__lab { font-size: 12px; color: var(--ink-3); white-space: nowrap; flex: 0 0 auto; }
.ht__sel--course { width: 300px; }
.ht__sel--chapter { width: 230px; flex: 0 0 auto; }
.ht__acts { margin-left: auto; display: flex; align-items: center; gap: 8px; }

.ht__summary {
  padding: 9px 12px; margin-bottom: 12px; border-radius: var(--r-sm);
  border: 1px solid var(--pri-200); background: var(--pri-50);
  font-size: 12.5px; color: var(--pri-ink);
}
.ht__summary b { font-size: 15px; font-variant-numeric: tabular-nums; }
.ht__summary-dot { margin: 0 6px; color: var(--pri-200); }
.ht__scope { margin-left: 10px; font-size: 11.5px; color: var(--ink-4); }

.ht__note {
  display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px;
  padding: 10px 12px; border-radius: var(--r-sm); font-size: 12.5px; line-height: 1.7;
  border: 1px solid var(--warn-line); background: var(--warn-soft); color: #8A5209;
}
.ht__note .dot { margin-top: 6px; }

.ht__quick { margin-bottom: 12px; }

.ht__total {
  padding: 9px 12px; border-top: 1px solid var(--line-3);
  background: var(--bg-soft); font-size: 12.5px; color: var(--ink-2);
  border-radius: 0 0 var(--r-sm) var(--r-sm);
}
.ht__total b { font-variant-numeric: tabular-nums; color: var(--ink); }

.ht__score { font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
.ht__muted { color: var(--ink-4); }
.ht__tip { margin: 14px 0 0; font-size: 11.5px; line-height: 1.75; color: var(--ink-4); }

@media (max-width: 1100px) {
  .ht { flex-direction: column; }
  .ht__side { width: 100%; }
  .ht__sel--course, .ht__sel--chapter { width: 100%; }
  .ht__acts { margin-left: 0; }
}
</style>
