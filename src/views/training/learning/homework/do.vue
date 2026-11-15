<template>
  <div class="hd">
    <!--
      章节作业专用答题页（设计文档 §4.8）。不复用 /ai-start-exam：那一页是考试与作业共用的，
      交完卷自关窗、文案靠 isHomework 分流，作业侧加不动（考试侧属零改动区）。
      入口必须是课程章节页：/homework-do/{examId}?attemptNo=N&groupId=G
      2026-10-08 定稿：不再有「把作业交给某一位老师」这一步，交卷后本课全部任课老师都能看到。
    -->
    <header class="hd__bar">
      <div class="hd__bar-l">
        <span class="hd__name" :title="examForm.examTitle">{{ t('作业：') }}《{{ examForm.examTitle }}》</span>
        <span class="hd__meta">{{ t('总分 {n}', { n: paperForm.totalScore }) }}</span>
        <span class="hd__meta">{{ t('及格分 {n}', { n: paperForm.passScore }) }}</span>
        <span class="hd__meta">{{ t('{n} 题', { n: paperForm.questionCount }) }}</span>
        <span class="hd__meta">{{ t('第 {n} 次作答', { n: attemptNo }) }}</span>
        <span class="hd__meta">{{ t('考生：') }}{{ userName }}</span>
      </div>
      <div class="hd__bar-r">
        <!-- 交完卷不再关窗、也不再给第二个交卷按钮，只留「看答案」这一件事 -->
        <a-button v-if="!submitted" type="primary" :loading="submitting" @click.stop="submitExam">
          {{ t('交卷') }}
        </a-button>
        <a-button v-else type="primary" @click="openGradeDetail">{{ t('查看逐题答案') }}</a-button>
        <span class="hd__clock" :class="{ 'is-urgent': remainingSeconds > 0 && remainingSeconds < 900 }">
          {{ countDownTime }}
        </span>
      </div>
    </header>

    <!-- 交卷结果条：留在页内，不弹窗遮挡；分数与待批题数都来自交卷接口回包 -->
    <div v-if="submitted && result" class="hd__result" role="status">
      <span>{{ t('本次作业已交卷，得分') }} <b>{{ result.score }}</b> {{ t('分') }}</span>
      <span v-if="result.pendingCount > 0">
        {{ t('（{n} 道主观题待老师批阅，批阅完成前「查看逐题答案」里看不到内容）', { n: result.pendingCount }) }}
      </span>
      <span class="hd__result-tip">{{ t('要再做一次，回课程页点「开始作业」') }}</span>
    </div>

    <div class="hd__main" :class="{ 'with-bar': submitted && result }">
      <!-- 左：题型导航 -->
      <aside class="hd__nav">
        <a-collapse v-model:activeKey="activeKey" :bordered="false">
          <a-collapse-panel
            v-for="config in questionGroups"
            :key="config.questionType"
            :style="{ display: config.questions.length > 0 ? 'block' : 'none' }"
          >
            <template #header>
              <span class="hd__nav-hd">
                {{ getQuestionTypeName(config.questionType) }}
                <em>{{ t('{n} 题', { n: config.questions.length }) }}</em>
                <em>{{ t('共 {n} 分', { n: Math.round(config.score * config.questions.length * 10) / 10 }) }}</em>
              </span>
            </template>
            <div class="hd__nav-btns">
              <button
                v-for="question in config.questions"
                :key="question.questionId"
                type="button"
                class="hd__qbtn"
                :class="{ 'is-done': isAnswered(question) }"
                :aria-label="t('跳到第 {n} 题', { n: question.sort })"
                @click.stop="scrollTo(question.questionId)"
              >{{ question.sort }}</button>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </aside>

      <!-- 右：题目与作答 -->
      <section ref="mainRightPanel" class="hd__body" @scroll="handleRightScroll">
        <a-spin :spinning="loading">
          <div
            v-for="config in questionGroups"
            :key="config.questionType"
            class="hd__group"
            :style="{ display: config.questions.length > 0 ? 'block' : 'none' }"
          >
            <h2 class="hd__group-hd">{{ getQuestionTypeName(config.questionType) }}</h2>

            <article v-for="question in config.questions" :id="question.questionId" :key="question.questionId" class="hd__q">
              <header class="hd__q-hd">
                <span class="hd__q-no">{{ question.sort }}、</span>
                <span class="hd__q-score">{{ t('（{n} 分）', { n: question.score }) }}</span>
              </header>
              <p class="hd__q-content">{{ question.content }}</p>
              <div class="hd__q-answer">
                <span class="hd__q-lab">{{ t('作答：') }}</span>

                <!-- 单选 -->
                <a-radio-group
                  v-if="question.questionType == 1"
                  v-model:value="question.userAnswer"
                  class="hd__opts"
                  :disabled="submitted"
                  @change="saveAnswer(question)"
                >
                  <a-radio v-for="(opt, oi) in getOptions(question)" :key="oi" :value="letterOf(oi)">
                    {{ letterOf(oi) }}. {{ opt }}
                  </a-radio>
                </a-radio-group>

                <!-- 多选 -->
                <a-checkbox-group
                  v-if="question.questionType == 2"
                  v-model:value="question.multipleAnswer"
                  class="hd__opts"
                  :disabled="submitted"
                  @change="saveMultipleAnswer(question)"
                >
                  <a-checkbox v-for="(opt, oi) in getOptions(question)" :key="oi" :value="letterOf(oi)">
                    {{ letterOf(oi) }}. {{ opt }}
                  </a-checkbox>
                </a-checkbox-group>

                <!-- 判断：答案仍存字母键 A/B -->
                <a-radio-group
                  v-if="question.questionType == 3"
                  v-model:value="question.userAnswer"
                  class="hd__opts"
                  :disabled="submitted"
                  @change="saveAnswer(question)"
                >
                  <a-radio value="A">{{ t('正确') }}</a-radio>
                  <a-radio value="B">{{ t('错误') }}</a-radio>
                </a-radio-group>

                <!-- 填空：只按空位数给输入框，不复述题干 -->
                <div v-if="question.questionType == 4" class="hd__fills">
                  <div v-for="bi in blankCount(question)" :key="bi" class="hd__fill-row">
                    <span v-if="blankCount(question) > 1" class="hd__fill-no">{{ bi }}、</span>
                    <a-input
                      v-model:value="question.blankAnswers[bi - 1]"
                      class="hd__fill-input"
                      :placeholder="t('请输入答案')"
                      :disabled="submitted"
                      @blur="saveFillAnswer(question)"
                    />
                  </div>
                </div>

                <!-- 简答 -->
                <a-textarea
                  v-if="question.questionType == 5"
                  v-model:value="question.userAnswer"
                  :rows="6"
                  :placeholder="t('请输入答案')"
                  :disabled="submitted"
                  @blur="saveAnswer(question)"
                />
              </div>
            </article>
          </div>
        </a-spin>

        <a-button v-if="rightScrollTop > 0" class="hd__top" size="small" @click="toRightTop">
          <template #icon><VerticalAlignTopOutlined /></template>
          {{ t('回到顶部') }}
        </a-button>
      </section>
    </div>

    <!-- 交卷确认：只提醒未答数 -->
    <a-modal
      v-model:open="submitVisible"
      :title="t('交卷确认')"
      :width="550"
      :mask-closable="false"
      :confirm-loading="submitting"
      :ok-text="t('确认交卷')"
      :cancel-text="t('取 消')"
      @ok="confirmSubmit"
      @cancel="onPickCancel"
    >
      <div class="hd__dlg">
        <p class="hd__dlg-a">
          <span v-if="unfinishedNum > 0">{{ t('当前作业还有 {n} 题未作答？', { n: unfinishedNum }) }}</span>
          <span v-else>{{ t('当前作业已完成所有题作答！') }}</span>
        </p>
        <p class="hd__dlg-note">{{ t('交卷后，这门课的任课老师都能在作业看板里看到这份作业。') }}</p>
        <h3 class="hd__dlg-b">{{ t('确定提交当前作业吗？') }}</h3>
      </div>
    </a-modal>

    <!-- 到点自动交卷的告知框 -->
    <a-modal
      v-model:open="endVisible"
      :title="t('系统提示')"
      :width="550"
      :mask-closable="false"
      @cancel="confirmEnd"
    >
      <div class="hd__dlg"><p class="hd__dlg-a">{{ endMessage }}</p></div>
      <template #footer>
        <a-button @click="confirmEnd">{{ t('关 闭') }}</a-button>
        <a-button type="primary" @click="openGradeDetail">{{ t('查看逐题答案') }}</a-button>
      </template>
    </a-modal>

    <!-- 逐题答案：复用作业模块的抽屉外壳（self 模式走 /myPaper，不需要批阅权限） -->
    <HomeworkDetail
      v-model:open="gradeOpen"
      :title="gradeTitle"
      :exam-id="examId"
      :user-id="userId"
      :user-name="userName"
      :attempt-no="attemptNo"
      self
    />
  </div>
</template>

<script setup name="homeworkDo">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Modal, notification } from 'ant-design-vue'
import { VerticalAlignTopOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { getAiExamInfo, getAiQuestions, saveAiAnswer } from '@/api/exam/aiExam.js'
import { submitHomework } from '@/api/exam/homework.js'
import { getUserId, getNickName } from '@/utils/user'
import { getDicts } from '@/api/system/dict/data.js'
import HomeworkDetail from '@/views/training/learning/homework/homeworkDetail.vue'

const userId = computed(() => getUserId())
const userName = computed(() => getNickName())
const route = useRoute()

// 路由末段就是 examId（与考试侧答题页同一套取法，别改成 query，直链会断）
const examId = ref(String(route.path || '').split('/').filter(Boolean).pop() || '')
// 作答轮次：章节页抽卷后带过来；缺省按第一轮，服务端在回包里会写它实际用的轮次
const attemptNo = ref(Number(route.query.attemptNo) > 0 ? Number(route.query.attemptNo) : 1)

const mainRightPanel = ref(null)
const rightScrollTop = ref(0)
const activeKey = ref([])
const loading = ref(false)
const examForm = ref({})
const paperForm = ref({})
const questionGroups = ref([])
const submitted = ref(false)
// 交卷接口回包 {score, pendingCount}；回看态下为 null（没有现成分数可显示）
const result = ref(null)

const examTimer = ref(null)
const remainingSeconds = ref(0)
const countDownTime = ref('')
// 与后端 HomeworkService.LONG_TERM_EXAM_END 对齐：长期有效作业的 endTime 就是那一年的 12-31
const LONG_TERM_EXAM_YEAR = 2099

// 题型字典：旧页 proxy.useDict('sys_question_type') → F1 getDicts
const questionTypes = ref([])
const loadQuestionTypes = () => {
  getDicts('sys_question_type').then((res) => {
    questionTypes.value = (res?.data || []).map((d) => ({ label: t(d.dictLabel), value: d.dictValue }))
  }).catch(() => { questionTypes.value = [] })
}

/* ---------------- 倒计时 ---------------- */
function startTimer() {
  examTimer.value = setInterval(() => {
    if (remainingSeconds.value == 900) showTips(15)
    if (remainingSeconds.value == 300) showTips(5)
    if (remainingSeconds.value > 0) {
      const d = Math.floor(remainingSeconds.value / 86400)
      const h = Math.floor((remainingSeconds.value / 3600) % 24)
      const m = Math.floor((remainingSeconds.value / 60) % 60)
      const s = Math.floor(remainingSeconds.value % 60)
      const p = (v) => (v < 10 ? `0${v}` : v)
      countDownTime.value = `${p(d)}:${p(h)}:${p(m)}:${p(s)}`
      remainingSeconds.value -= 1
    } else {
      stopTimer()
      // 到点自动交卷：不经过确认框，交完即完成
      doSubmit()
    }
  }, 1000)
}
function stopTimer() {
  if (examTimer.value) clearInterval(examTimer.value)
  examTimer.value = null
}
function initRemainingSeconds() {
  // 长期有效作业的 endTime 是服务端兜底值（2099-12-31），按它算会显示一万多天，
  // 所以结束年份落在兜底年份之后就当「不限时长」、不占 remainingSeconds
  if (new Date(examForm.value.endTime).getFullYear() >= LONG_TERM_EXAM_YEAR) {
    countDownTime.value = t('不限时长')
    return
  }
  const now = Date.now()
  const end = new Date(examForm.value.endTime).getTime()
  if (end > now) remainingSeconds.value = parseInt((end - now) / 1000, 10)
  else countDownTime.value = t('已到结束时间')
}
function showTips(minute) {
  notification.warning({
    message: t('作业提示'),
    description: t('离作业结束还有 {n} 分钟！请抓紧时间完成哟', { n: minute }),
    duration: 10
  })
}

/* ---------------- 交卷结果 ---------------- */
const endVisible = ref(false)
const endMessage = ref('')
function confirmEnd() {
  endVisible.value = false
}

/* ---------------- 题目渲染与作答 ---------------- */
function getOptions(question) {
  try {
    const opts = typeof question.options === 'string' ? JSON.parse(question.options) : (question.options || [])
    return Array.isArray(opts) ? opts : []
  } catch (e) {
    return []
  }
}
const letterOf = (index) => String.fromCharCode(65 + index)
function isAnswered(question) {
  if (question.questionType == 2) return !!(question.multipleAnswer && question.multipleAnswer.length)
  if (question.questionType == 4) return !!(question.blankAnswers && question.blankAnswers.some((v) => (v || '').trim() !== ''))
  return !!(question.userAnswer && String(question.userAnswer).trim() !== '')
}
// 题干里的空位个数（以 ______ 数量为准，没写空位时算 1 个，保证至少有一个输入框）
const FILL_BLANK_RE = /_{3,}/g
function blankCount(question) {
  const matches = String(question.content || '').match(FILL_BLANK_RE)
  return matches ? matches.length : 1
}
function getQuestionTypeName(type) {
  const hit = questionTypes.value.find((item) => String(item.value) === String(type))
  return hit ? hit.label : ''
}

function scrollTo(id) {
  nextTick(() => {
    const el = document.getElementById(String(id))
    const container = mainRightPanel.value
    if (!el || !container) return
    container.scrollTo({ top: el.offsetTop - container.offsetTop, behavior: 'smooth' })
  })
}
function handleRightScroll() {
  rightScrollTop.value = mainRightPanel.value?.scrollTop || 0
}
function toRightTop() {
  if (mainRightPanel.value) mainRightPanel.value.scrollTop = 0
}

// 逐题保存（单选/判断存字母键，简答存文本原样）；轮次必带，否则第二轮的题会堆到第一轮
function saveAnswer(question) {
  if (submitted.value) return
  saveAiAnswer({
    examId: examId.value, questionId: question.questionId,
    userAnswer: question.userAnswer, attemptNo: attemptNo.value
  }).catch(() => { /* 单题保存失败不阻塞作答，交卷时以服务端为准 */ })
}
// 多选保存：排序逗号串（与判端口径一致）
function saveMultipleAnswer(question) {
  if (submitted.value) return
  question.userAnswer = [...(question.multipleAnswer || [])].sort().join(',')
  saveAnswer(question)
}
// 填空保存：多空按空位顺序存 JSON 数组串
function saveFillAnswer(question) {
  if (submitted.value) return
  question.userAnswer = JSON.stringify(question.blankAnswers || [])
  saveAnswer(question)
}

function loadQuestions() {
  loading.value = true
  getAiQuestions(examId.value, attemptNo.value).then((res) => {
    const data = res?.data || {}
    if (data.paper) paperForm.value = data.paper
    // 回显的是哪一轮就跟着哪一轮，后续 saveAnswer/submit 都写到这一轮上
    if (data.attemptNo) attemptNo.value = data.attemptNo
    submitted.value = !!data.submitted
    const answers = data.answers || {}
    const flat = []
    ;(data.questions || []).forEach((q) => {
      const question = {
        ...q,
        userAnswer: answers[q.questionId] || '',
        multipleAnswer: [],
        blankAnswers: []
      }
      if (q.questionType == 2 && question.userAnswer) {
        // 多选回显：兼容逗号串与 JSON 数组
        try {
          question.multipleAnswer = String(question.userAnswer).trim().startsWith('[')
            ? JSON.parse(question.userAnswer)
            : String(question.userAnswer).split(',').map((s) => s.trim()).filter(Boolean)
        } catch (e) { question.multipleAnswer = [] }
      }
      if (q.questionType == 4) {
        try {
          question.blankAnswers = question.userAnswer ? JSON.parse(question.userAnswer) : []
        } catch (e) {
          question.blankAnswers = [question.userAnswer || '']
        }
        // 补齐空位数（以题干空位数量为准，无空位时至少留一个）
        while (question.blankAnswers.length < blankCount(question)) question.blankAnswers.push('')
      }
      flat.push(question)
    })
    const groupOrder = ['1', '2', '3', '4', '5']
    questionGroups.value = groupOrder.map((type) => {
      const questions = flat.filter((q) => String(q.questionType) === type)
      return {
        questionType: type,
        questions,
        score: questions.length ? Number(questions[0].score) || 0 : 0
      }
    }).filter((config) => config.questions.length > 0)
    activeKey.value = questionGroups.value.map((config) => config.questionType)
  }).catch(() => {
    Modal.warning({ title: t('系统提示'), content: t('题目加载失败，请刷新页面重试') })
  }).finally(() => {
    loading.value = false
  })
}

/* ---------------- 交卷 ---------------- */
const submitVisible = ref(false)
const unfinishedNum = ref(0)
// 交卷请求在途标识：既驱动按钮 loading，也作为重复提交的代码级闸门
const submitting = ref(false)

function submitExam() {
  if (submitting.value || submitted.value || submitVisible.value) return
  unfinishedNum.value = 0
  questionGroups.value.forEach((item) => {
    item.questions.forEach((question) => {
      if (!isAnswered(question)) unfinishedNum.value += 1
    })
  })
  submitVisible.value = true
}

function onPickCancel() {
  // 交卷在途时不许用右上角把框关掉：闸门已经吃住 submitting，关了框只能干等
  if (submitting.value) return
  submitVisible.value = false
}

function confirmSubmit() {
  doSubmit()
}

// 交卷（客观题后端同步判分，简答题交卷即判）
function doSubmit() {
  // 手点确定与倒计时到点可能同时到达，只放行第一个；已交卷也不再发第二次
  if (submitting.value || submitted.value) return
  submitting.value = true
  submitHomework(examId.value, attemptNo.value).then((res) => {
    submitting.value = false
    if (res?.data) {
      stopTimer()
      submitVisible.value = false
      submitted.value = true
      const data = res.data
      // 以服务端回写的轮次为准（入口没带 query 时服务端会兜成第一轮）
      if (data.attemptNo) attemptNo.value = data.attemptNo
      result.value = { score: data.score ?? 0, pendingCount: data.pendingCount ?? 0 }
      if (data.pendingCount > 0) {
        endMessage.value = t('已交卷。客观题已判分 {score} 分，{n} 道主观题待教师批阅', {
          score: data.score, n: data.pendingCount
        })
        endVisible.value = true
      }
    } else {
      // 闸门必须释放，否则提交按钮永远转圈、学生再也交不了卷
      submitting.value = false
      Modal.warning({ title: t('系统提示'), content: t('提交失败！') })
    }
  }).catch(() => {
    submitting.value = false
  })
}

/* ---------------- 逐题答案 ---------------- */
const gradeOpen = ref(false)
// 待批时 /myPaper 那道闸门会把答案整批压掉，先把话说明，别让人以为页面坏了
const gradeTitle = computed(() => (result.value && result.value.pendingCount > 0
  ? t('逐题答案（主观题批阅完成前暂看不到内容）')
  : t('逐题答案')))
function openGradeDetail() {
  endVisible.value = false
  gradeOpen.value = true
}

/* ---------------- 初始化 ---------------- */
function initExam() {
  if (!examId.value) {
    Modal.warning({ title: t('系统提示'), content: t('缺少作业 id！') })
    return
  }
  getAiExamInfo(examId.value).then((res) => {
    const data = res?.data || {}
    if (!data.exam) {
      Modal.warning({ title: t('系统提示'), content: t('作业不存在！') })
      return
    }
    examForm.value = data.exam
    // 本页是新标签页，没有 Layout 的 TagsView 帮着设标题，进来自己定一个
    document.title = `${t('开始作业')} - ${data.exam.examTitle || ''}`
    switch (data.exam.state) {
      case 0:
        Modal.warning({ title: t('系统提示'), content: t('当前作业还没到开放时间！') })
        break
      case 1:
        loadQuestions()
        initRemainingSeconds()
        // 不限时长的作业不能起定时器：remainingSeconds 为 0 时一秒后就会自动交卷
        if (remainingSeconds.value > 0) startTimer()
        break
      case 2:
        Modal.warning({ title: t('系统提示'), content: t('当前作业已经结束！') })
        break
      default:
        // 已交卷或作业结束仍允许回看题目作答（只读）
        loadQuestions()
        break
    }
  }).catch(() => {
    // 作业信息取不到（试卷被删/未关联试卷）必须明确终止，否则页面静默留白
    stopTimer()
    loading.value = false
    Modal.error({ title: t('系统提示'), content: t('试卷已失效，无法进入本次作业，请联系老师重新发布') })
  })
}

onMounted(() => {
  loadQuestionTypes()
  initExam()
  // 有意不挂 beforeunload / visibilitychange 拦截：作业是开卷的，翻课件查资料是正当用法
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.hd {
  display: flex; flex-direction: column;
  height: 100vh; min-height: 0; overflow: hidden;
  background: var(--bg);
}

/* 头部：整页独立，深色条保证倒计时醒目 */
.hd__bar {
  flex: none; display: flex; align-items: center; gap: 16px;
  height: 52px; padding: 0 16px;
  background: #1F2937; color: #fff;
}
.hd__bar-l { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }
.hd__name {
  font-size: 14px; font-weight: 600; max-width: 380px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.hd__meta { font-size: 12.5px; color: rgba(255, 255, 255, .78); white-space: nowrap; flex: none; }
.hd__bar-r { display: flex; align-items: center; gap: 12px; flex: none; }
.hd__clock {
  font-family: var(--mono); font-size: 16px; font-weight: 600; letter-spacing: .02em;
  font-variant-numeric: tabular-nums; min-width: 118px; text-align: right;
}
.hd__clock.is-urgent { color: #FF7875; }

/* 交卷结果条 */
.hd__result {
  flex: none; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 16px; font-size: 12.5px;
  border-bottom: 1px solid var(--ok-line); background: var(--ok-soft); color: #0B6B4A;
}
.hd__result b { font-size: 16px; }
.hd__result-tip { margin-left: auto; color: var(--ink-4); }

/* 主体 */
.hd__main { flex: 1; min-height: 0; display: flex; }

.hd__nav {
  flex: none; width: 300px; overflow: auto; padding: 8px 0 60px;
  background: var(--panel); border-right: 1px solid var(--line);
}
.hd__nav :deep(.ant-collapse-header) { padding: 8px 12px !important; }
.hd__nav-hd { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
.hd__nav-hd em { margin-left: 6px; font-style: normal; font-weight: 400; font-size: 11.5px; color: var(--ink-4); }
.hd__nav-btns { display: flex; flex-wrap: wrap; gap: 6px; padding: 2px 4px 8px; }

.hd__qbtn {
  width: 34px; height: 30px; padding: 0;
  border: 1px solid var(--line-2); border-radius: var(--r-xs);
  background: var(--panel); color: var(--ink-2); font: inherit; font-size: 12.5px;
  cursor: pointer; transition: all .14s ease;
}
.hd__qbtn:hover { border-color: var(--pri-200); color: var(--pri); }
.hd__qbtn.is-done { border-color: var(--pri); background: var(--pri); color: #fff; }

.hd__body {
  flex: 1; min-width: 0; overflow-y: auto; padding: 14px 20px 120px;
  background: var(--bg);
  position: relative;
}

.hd__group { margin-bottom: 18px; }
.hd__group-hd {
  margin: 0 0 10px; padding: 9px 12px; font-size: 14px; font-weight: 600; color: var(--ink);
  background: var(--pri-50); border: 1px solid var(--pri-200); border-radius: var(--r-sm);
}

.hd__q {
  margin-bottom: 12px; padding: 16px 18px;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1);
}
.hd__q-hd { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.hd__q-no { font-size: 14px; font-weight: 600; color: var(--ink); }
.hd__q-score { font-size: 12px; color: var(--ink-4); }
.hd__q-content {
  margin: 8px 0 12px; font-size: 13px; line-height: 1.85; color: var(--ink-2);
  white-space: pre-line; overflow-wrap: anywhere;
}
.hd__q-lab { display: block; margin-bottom: 6px; font-size: 12px; color: var(--warn); }

/* 选项一行一个，圆点与文字垂直居中，长文本自己换行 */
.hd__opts { display: block; }
.hd__opts :deep(.ant-radio-wrapper),
.hd__opts :deep(.ant-checkbox-wrapper) {
  display: flex; align-items: flex-start; gap: 6px;
  width: 100%; margin: 0 0 8px; padding: 0; white-space: normal;
}
.hd__opts :deep(.ant-radio),
.hd__opts :deep(.ant-checkbox) { flex: none; margin-top: 3px; }
.hd__opts :deep(.ant-radio-wrapper > span:last-child),
.hd__opts :deep(.ant-checkbox-wrapper > span:last-child) { flex: 1; padding-inline-end: 0; line-height: 1.65; }

.hd__fills { max-width: 520px; }
.hd__fill-row { display: flex; align-items: center; margin-bottom: 6px; }
.hd__fill-no { flex: none; color: var(--ink-3); }
.hd__fill-input { flex: 1; }

.hd__top { position: sticky; bottom: 10px; float: right; }

/* 弹窗 */
.hd__dlg { text-align: center; }
.hd__dlg-a { margin: 0; color: var(--danger); font-size: 14px; }
.hd__dlg-note { margin-top: 6px; font-size: 12px; color: var(--ink-4); }
.hd__dlg-b { margin: 14px 0 0; font-size: 16px; color: var(--pri); }

@media (max-width: 1000px) {
  .hd__nav { width: 200px; }
  .hd__name { max-width: 180px; }
  .hd__meta:nth-child(n + 4) { display: none; }
}
</style>
