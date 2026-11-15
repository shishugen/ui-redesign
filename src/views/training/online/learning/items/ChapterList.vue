<template>
  <div ref="rootRef" class="ch" :class="{ 'is-resizing': isResizing }">
    <!-- 左：章节树 -->
    <aside class="ch__side" :style="{ width: width + 'px' }">
      <div v-show="leftShow" class="ch__side-hd">
        <a-input-search
          v-model:value="searchVal"
          allow-clear
          :placeholder="t('搜索章节')"
          :disabled="!chapterTreeData.length"
          :aria-label="t('搜索章节')"
          @change="handleSearch"
        >
          <template #enterButton>
            <span class="ch__count">{{ t('共 {n} 章', { n: chapterTreeData.length }) }}</span>
          </template>
        </a-input-search>
        <a-button
          size="small"
          class="ch__expand"
          :disabled="!chapterTreeData.length"
          :aria-label="allCollapsed ? t('全部展开') : t('全部收起')"
          :title="allCollapsed ? t('全部展开') : t('全部收起')"
          @click="allCollapsed = !allCollapsed"
        >
          <template #icon>
            <DownOutlined v-if="allCollapsed" />
            <UpOutlined v-else />
          </template>
        </a-button>
      </div>

      <div v-show="leftShow" ref="sideScroll" class="ch__side-bd" @scroll="onSideScroll">
        <ChapterLearnItem
          v-for="(chapter, index) in chapterTreeData"
          :key="chapter.chapterId"
          :chapter="chapter"
          :curr-chapter="currChapter"
          :chapter-index="String(index + 1)"
          :force-collapse="allCollapsed"
          :force-collapse-level="0"
          :left-width="width"
          :call-back-learn-chapter="toLearnChapter"
          :show-chapter-list="searchIdList"
        />
        <div v-if="!chapterTreeData.length" class="ch__empty" role="status">
          <div class="ch__empty-t">{{ t('暂无章节') }}</div>
          <div class="ch__empty-d">{{ t('这门课程还没有建章节，请等待教师补充内容。') }}</div>
        </div>
        <a-button
          v-if="sideScrollTop > 0"
          size="small"
          class="ch__top"
          :aria-label="t('回到顶部')"
          :title="t('回到顶部')"
          @click="toSideTop"
        >
          <template #icon><VerticalAlignTopOutlined /></template>
        </a-button>
      </div>
    </aside>

    <!-- 拖拽条 -->
    <div
      v-show="leftShow"
      class="ch__divider"
      role="separator"
      aria-orientation="vertical"
      :aria-valuenow="width"
      :aria-label="t('拖拽调整左栏宽度，方向键微调')"
      tabindex="0"
      @mousedown="startResize"
      @keydown.left.prevent="nudge(-24)"
      @keydown.right.prevent="nudge(24)"
    />
    <button
      type="button"
      class="ch__toggle"
      :aria-label="leftShow ? t('收起章节栏') : t('展开章节栏')"
      :title="leftShow ? t('收起章节栏') : t('展开章节栏')"
      @click="toggle"
    >
      <LeftOutlined v-if="leftShow" />
      <RightOutlined v-else />
    </button>

    <!-- 右：内容 -->
    <section class="ch__main">
      <header class="ch__main-hd">
        <div class="ch__title" :title="currChapter.chapterName || ''">
          <template v-if="currChapter.chapterName">
            <span class="ch__num">{{ currNumber }}</span>
            <span class="ch__name">{{ currChapter.chapterName }}</span>
            <span v-if="currRecord.recordId" class="tag" :class="currRecord.state == 1 ? 'ok' : 'pri'">
              {{ recordProgress }}%
            </span>
          </template>
          <span v-else class="ch__name faint">{{ t('请在左侧选择章节') }}</span>
        </div>

        <div class="ch__acts">
          <a-tooltip v-if="currRecord.recordId" :title="currRecord.state == 1 ? t('本章节已标记完成') : t('学习进度满 10% 后可手动标记')">
            <span>
              <a-button
                size="small"
                type="primary"
                ghost
                :disabled="currRecord.state == 1 || recordProgress < 10"
                @click.stop="finishRecord"
              >
                {{ currRecord.state == 1 ? t('已 完 成') : t('标记已学') }}
              </a-button>
            </span>
          </a-tooltip>
          <a-button size="small" :disabled="!canPrev" @click.stop="toPrevChapter">{{ t('上一节') }}</a-button>
          <a-button size="small" :disabled="!canNext" @click.stop="toNextChapter">{{ t('下一节') }}</a-button>
        </div>
      </header>

      <div class="ch__body">
        <a-spin :spinning="loading" :tip="t('正在加载中...')">
          <div class="ch__content">
            <IntroductionPage v-if="isIntro" :learn-type="tabName" />
            <Preview v-else-if="currChapter.chapterId && currChapter.content" :content="currChapter.content" height="100%" />
            <div v-else class="ch__empty" role="status">
              <div class="ch__empty-t">{{ t('暂无章节内容') }}</div>
              <div class="ch__empty-d">{{ t('该章节还没有正文，先看看其他章节吧。') }}</div>
            </div>
          </div>
        </a-spin>
      </div>

      <!-- 本章节作业条 -->
      <footer v-if="homeworkList.length" class="ch__hw">
        <div v-for="item in homeworkList" :key="item.groupId" class="ch__hw-row">
          <span class="ch__hw-ico" aria-hidden="true"><FileDoneOutlined /></span>
          <span class="ch__hw-title">{{ t('本章节作业') }}</span>
          <span class="ch__hw-meta">
            {{ t('已完成 {done}/{max} 次', { done: item.doneCount || 0, max: item.maxAttempt || 0 }) }}
          </span>
          <span class="ch__hw-gap" />
          <a-button
            v-if="(item.doneCount || 0) > 0"
            size="small"
            :loading="reviewLoadingId === item.groupId"
            @click="openMyReview(item, $event)"
          >{{ t('查看逐题') }}</a-button>
          <a-tooltip :title="homeworkTip(item)">
            <span>
              <a-button
                size="small"
                type="primary"
                :loading="drawingId === item.groupId"
                :disabled="homeworkDisabled(item)"
                @click="handleStartHomework(item, $event)"
              >{{ homeworkBtnText(item) }}</a-button>
            </span>
          </a-tooltip>
        </div>
      </footer>
    </section>

    <!-- 交卷后回看逐题答案（作业侧入口）：列的都是本章节自己做过的卷子，
         数据源 /myCompleteList 只包成绩已收口的那些，所以卷内有主观题还在批阅时不会出现在这里 -->
    <a-modal v-model:open="reviewPickVisible" :title="t('选择要回看的作业卷')" :footer="null" :width="520">
      <p class="ch__pick-tip">{{ t('本章节你做过下面这几份卷，选一份看逐题答案：') }}</p>
      <a-radio-group v-model:value="reviewChosen" class="ch__pick-list">
        <a-radio v-for="r in reviewRows" :key="r.examId" :value="String(r.examId)">
          {{ r.examTitle || t('本卷') }} · {{ t('最高 {n} 分', { n: r.bestScore }) }} · {{ r.finishedTime }}
        </a-radio>
      </a-radio-group>
      <div class="ch__pick-go">
        <a-button type="primary" block :disabled="!reviewChosen" @click="openReviewDetail">
          {{ t('查看逐题') }}
        </a-button>
      </div>
    </a-modal>

    <!-- 只读复用逐题明细外壳（self 模式走 /myPaper，不需批阅权限）：对错、参考答案、解析都在里面 -->
    <HomeworkDetail
      v-model:open="reviewVisible"
      :title="reviewTitle"
      :exam-id="reviewExamId"
      :user-name="reviewUserName"
      self
    />
  </div>
</template>

<script setup name="ChapterList">
import { computed, onMounted, onUnmounted, onActivated, reactive, ref, toRefs } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  DownOutlined, UpOutlined, LeftOutlined, RightOutlined,
  VerticalAlignTopOutlined, FileDoneOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { getChapter } from '@/api/course/chapter.js'
import { initRecord, updateRecord, getLastRecord } from '@/api/learning/record.js'
import { getHomeworkMyStatus, drawHomework, getMyCompleteList } from '@/api/exam/homework.js'
import { getUserId, getNickName } from '@/utils/user'
import { useSplitPane } from '../composables/useSplitPane'
import IntroductionPage from '../components/IntroductionPage.vue'
import ChapterLearnItem from '../components/ChapterLearnItem.vue'
import Preview from '@/components/Preview/index.vue'
import HomeworkDetail from '@/views/training/learning/homework/homeworkDetail.vue'

const router = useRouter()

const props = defineProps({
  tabKey: { type: Array, default: () => [] },
  courseId: { type: String, default: '' },
  defaultChapterId: { type: String, default: '' },
  chapterData: { type: Array, default: () => [] },
  chapterTreeData: { type: Array, default: () => [] }
})

const { rootRef, leftWidth, leftShow, isResizing, width, toggle, startResize, nudge } = useSplitPane({
  initial: 300, min: 200, minRight: 520
})

const tabName = 'chapter'
const userId = getUserId()

const data = reactive({
  currChapter: { chapterId: '0', chapterName: '', content: '', parentId: '', level: 0 },
  currNumber: '',
  currRecord: {
    recordId: '', courseId: '', chapterId: '', fileId: '',
    type: 0, state: 0, totalSeconds: 0, currentSeconds: 0, learningSeconds: 0
  }
})
const { currChapter, currNumber, currRecord } = toRefs(data)

const loading = ref(false)
const allCollapsed = ref(true)
const searchVal = ref('')
const searchIdList = ref([])
const sideScroll = ref(null)
const sideScrollTop = ref(0)
const chapterMap = ref(new Map())

let chapterTimer = null
const SAVE_INTERVAL = 10

const isIntro = computed(() => String(currChapter.value.chapterId) === '0')
const currIndex = computed(() => chapterMap.value.get(String(currChapter.value.chapterId)))
const canPrev = computed(() => currIndex.value !== undefined && currIndex.value > 0)
const canNext = computed(() => currIndex.value !== undefined && currIndex.value < chapterMap.value.size - 1)

const recordProgress = computed(() => {
  const r = currRecord.value
  if (!r.courseId || !r.totalSeconds) return 0
  return Math.min(100, Math.round((r.currentSeconds / r.totalSeconds) * 100))
})

/* ---------------- 章节作业 ---------------- */
const homeworkList = ref([])

function needChapterFinish(item) {
  return item.requireFinish == 1 && currRecord.value.state != 1
}
function homeworkDisabled(item) {
  if (item.opened === false) return false // 未开放也允许点，点了给原因，比灰着不给解释好
  if (needChapterFinish(item)) return false
  if (!item.hasUnfinished && (item.doneCount || 0) >= (item.maxAttempt || 0)) return true
  return false
}
function homeworkBtnText(item) {
  if (item.opened === false) return t('未开放')
  if (needChapterFinish(item)) return t('未解锁')
  if (item.hasUnfinished) return t('继续作业')
  if ((item.doneCount || 0) >= (item.maxAttempt || 0)) return t('次数已用完')
  return t('开始作业')
}
function homeworkTip(item) {
  if (item.opened === false) return t('本作业未到开放时间')
  if ((item.doneCount || 0) >= (item.maxAttempt || 0)) return t('本次作业次数已用完')
  return ''
}

function loadHomework() {
  const chapterId = currChapter.value.chapterId
  if (!chapterId || String(chapterId) === '0') {
    homeworkList.value = []
    return
  }
  getHomeworkMyStatus(chapterId, props.courseId).then((res) => {
    const list = res?.data?.list || []
    // 一个章节只应有一份作业：存量里可能还留着旧版建的多份，只认最早那份（接口按创建时间升序）
    homeworkList.value = list.slice(0, 1)
  }).catch(() => {
    // 作业接口异常不该挡章节学习，静默降级为不显示作业条
    homeworkList.value = []
  })
}

// 进作业答题页：路径末段是 examId（与考试侧取值方式对齐，别改成 query），轮次与作业组走 query。
// 答题页是顶层路由（不进后台外壳），hash 模式下要把 #/ 也带上，否则会跳去 404。
// win 是点击那一拍同步开好的占位标签页；为 null 说明被浏览器当弹窗拦了，退化为当前页跳转。
function openHomeworkPage(win, examId, attemptNo, groupId) {
  const hash = `#/homework-do/${examId}?attemptNo=${attemptNo || 1}&groupId=${groupId || ''}`
  const link = `${window.location.origin}${window.location.pathname}${hash}`
  if (win && !win.closed) {
    win.location.replace(link)
    return
  }
  if (win) win.close()
  message.warning(t('新窗口被浏览器拦截了，本次在当前页打开；建议允许本站弹出窗口'))
  router.push({ path: `/homework-do/${examId}`, query: { attemptNo: attemptNo || 1, groupId: groupId || '' } })
}

// 开始 / 继续作业
function handleStartHomework(item, e) {
  // 点击后失焦，避免焦点残留被回车再次触发
  if (e?.currentTarget?.blur) e.currentTarget.blur()
  if (item.opened === false) {
    message.info(t('本作业未到开放时间'))
    return
  }
  if (needChapterFinish(item)) {
    message.info(t('完成本章节学习后即可开始作业'))
    return
  }
  // 已有进行中的轮次：直接续做，不再抽卷（重复抽卷会白白占掉一次机会）
  if (item.hasUnfinished && item.unfinishedExamId) {
    openHomeworkPage(window.open('about:blank', '_blank'), item.unfinishedExamId, item.unfinishedAttemptNo, item.groupId)
    return
  }
  if ((item.doneCount || 0) >= (item.maxAttempt || 0)) {
    message.info(t('本次作业次数已用完'))
    return
  }
  // 抽卷会占掉一次机会且不可逆 —— 留一个二次确认；确定那一拍就是用户手势，回调里同步开窗不会被拦
  const left = (item.maxAttempt || 1) - (item.doneCount || 0)
  Modal.confirm({
    title: t('开始作业'),
    content: t('开始后将随机分配一张试卷，并计入本次作业次数（还能做 {n} 次）。确定开始吗？', { n: left > 0 ? left : 0 }),
    okText: t('开 始'),
    cancelText: t('取 消'),
    onOk: () => drawAndOpen(item)
  })
}

const drawingId = ref('')

// 抽卷：新窗口必须在点击这一拍同步开（抽卷是异步请求，等它回来再 open 会被拦）。
// 先占位，抽到卷再写地址；抽失败/没抽到就把空窗关掉。
function drawAndOpen(item) {
  const win = window.open('about:blank', '_blank')
  drawingId.value = item.groupId
  drawHomework({ groupId: item.groupId }).then((res) => {
    if (res?.data?.examId) {
      // 用服务端回带的 groupId：新抽/续做两条路径用同一个字段走
      openHomeworkPage(win, res.data.examId, res.data.attemptNo, res.data.groupId || item.groupId)
    } else if (win) {
      win.close()
    }
  }).catch(() => {
    // 接口失败（次数用完/不在开放时间/操作太频繁）拦截器已弹提示，这里只负责收起空窗
    if (win) win.close()
  }).finally(() => {
    drawingId.value = ''
  })
}

/* ---------------- 交卷后回看逐题答案 ---------------- */
const reviewLoadingId = ref('')
const reviewPickVisible = ref(false)
const reviewRows = ref([])
const reviewChosen = ref('')
const reviewVisible = ref(false)
const reviewTitle = ref('')
const reviewExamId = ref('')
// 回看抽屉头部那行「考生：xxx」靠调用方传；本入口是 self 看自己的
const reviewUserName = computed(() => getNickName())

function openMyReview(item, e) {
  if (e?.currentTarget?.blur) e.currentTarget.blur()
  reviewLoadingId.value = item.groupId
  getMyCompleteList({ courseId: props.courseId, chapterId: currChapter.value.chapterId }).then((res) => {
    const list = res?.data?.list || []
    if (!list.length) {
      // 按钮只在做过之后才给，清单为空只有一种情况：成绩还没收口
      message.warning(t('这套题的成绩还没生效（卷内有主观题时需等批阅收口），批完后再回来点即可查看逐题答案'))
      return
    }
    if (list.length === 1) {
      showReview(list[0])
      return
    }
    reviewRows.value = list
    reviewChosen.value = ''
    reviewPickVisible.value = true
  }).catch(() => {
    // 接口报错拦截器已弹提示，这里不能把 loading 留在身上
  }).finally(() => {
    reviewLoadingId.value = ''
  })
}

// self 模式不传轮次：服务端取「分数最高的那轮」，与清单上的 bestScore 是同一份
function showReview(row) {
  reviewExamId.value = row.examId
  reviewTitle.value = `${row.examTitle || t('本卷')} · ${t('我的逐题明细')}`
  reviewVisible.value = true
}

function openReviewDetail() {
  const row = reviewRows.value.find((r) => String(r.examId) === reviewChosen.value)
  if (!row) return
  reviewPickVisible.value = false
  showReview(row)
}

/* ---------------- 检索 ---------------- */
function handleSearch() {
  const kw = searchVal.value
  if (!kw) {
    searchIdList.value = []
    return
  }
  const hits = ['0']
  props.chapterData.forEach((item) => {
    if (String(item.chapterName || '').includes(kw)) hits.push(item.chapterId)
  })
  searchIdList.value = hits
  // 命中项可能挂在折叠的父级下：搜索即展开，否则搜到了也看不见（旧页这里搜不到嵌套章节）
  allCollapsed.value = false
}

/* ---------------- 章节切换 ---------------- */
function resetChapter() {
  currChapter.value = { chapterId: '', chapterName: '', content: '', parentId: '', level: 0 }
}
function resetRecord() {
  currRecord.value = {
    recordId: '', courseId: '', chapterId: '', fileId: '',
    type: 0, state: 0, totalSeconds: 0, currentSeconds: 0, learningSeconds: 0
  }
}

function toLearnChapter(chapterId, number) {
  currNumber.value = number || ''
  if (String(chapterId) === String(currChapter.value.chapterId)) return
  loading.value = true
  resetChapter()
  resetRecord()
  homeworkList.value = []
  getChapter(chapterId).then((res) => {
    if (res?.data?.chapterId) {
      currChapter.value = res.data
      toInitChapterRecord()
      loadHomework()
    }
  }).catch(() => {
    message.error(t('章节内容加载失败'))
  }).finally(() => {
    loading.value = false
  })
}

/** 按正文字数估阅读时长（秒）：300 字/分钟，最少 60 秒 */
function getReadTimeSecond(content, speed = 300) {
  const text = String(content || '')
    .replace(/\s/g, '')
    // 旧页正则多转义了一层（/\\s/ 只匹配字面反斜杠+s），这里改正为去掉非中英文数字字符
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
  return Math.max(1, Math.ceil((text.length / speed) * 60))
}

function toInitChapterRecord() {
  let readTime = getReadTimeSecond(currChapter.value.content)
  if (readTime < 60) readTime = 60
  const currSeconds = parseInt(readTime * 0.01, 10)
  initRecord({
    courseId: currChapter.value.courseId,
    chapterId: currChapter.value.chapterId,
    userId,
    type: 0,
    totalSeconds: readTime,
    currentSeconds: currSeconds,
    learningSeconds: currSeconds
  }).then((res) => {
    if (res?.data) currRecord.value = res.data
  }).catch(() => { /* 记录接口失败不影响阅读 */ })
}

function finishRecord() {
  if (!currRecord.value.recordId) return
  currRecord.value.state = 1
  currRecord.value.currentSeconds = currRecord.value.totalSeconds
  updateRecord(currRecord.value)
}

function toRecord(seconds) {
  const r = currRecord.value
  if (!r.recordId || r.state == 1) return
  r.learningSeconds += seconds
  if (r.currentSeconds < r.totalSeconds) {
    r.currentSeconds += seconds
  } else {
    r.currentSeconds = r.totalSeconds
    r.state = 1
  }
  updateRecord(r)
}

/* ---------------- 上下节 ---------------- */
function chapterIdByIndex(index) {
  for (const [chapterId, idx] of chapterMap.value.entries()) {
    if (idx === index) return chapterId
  }
  return ''
}
function findChapter(node, targetId) {
  let hit = null
  node.some((item) => {
    if (String(item.chapterId) === String(targetId)) {
      hit = item
      return true
    }
    if (item.children && item.children.length) hit = findChapter(item.children, targetId)
    return !!hit
  })
  return hit
}
function goByIndex(index) {
  const chapterId = chapterIdByIndex(index)
  if (!chapterId) return
  const node = findChapter(props.chapterTreeData, chapterId)
  toLearnChapter(chapterId, node?.number)
}
function toPrevChapter() {
  goByIndex((currIndex.value ?? 0) - 1)
}
function toNextChapter() {
  goByIndex((currIndex.value ?? -1) + 1)
}

/* ---------------- 初始化 ---------------- */
function initIndex(nodes) {
  nodes.forEach((item) => {
    if (Number(item.hasContent) > 0 || !item.children || !item.children.length) {
      item.index = chapterMap.value.size
      chapterMap.value.set(String(item.chapterId), item.index)
    }
    if (item.children && item.children.length) initIndex(item.children)
  })
}

function checkChapterByData(nodes, targetId) {
  nodes.some((item) => {
    if (String(item.chapterId) === String(targetId)) {
      if (Number(item.hasContent) === 0 && item.children && item.children.length) {
        toLearnChapter(item.children[0].chapterId, item.children[0].number)
      } else {
        toLearnChapter(item.chapterId, item.number)
      }
      return true
    }
    if (item.children && item.children.length) checkChapterByData(item.children, targetId)
    return false
  })
}

function getLastLearningRecord() {
  getLastRecord(props.courseId, '', userId, 0).then((res) => {
    if (res?.data?.chapterId) checkChapterByData(props.chapterTreeData, res.data.chapterId)
    else goByIndex(0)
  }).catch(() => {
    goByIndex(0)
  })
}

function toSideTop() {
  if (sideScroll.value) sideScroll.value.scrollTop = 0
}
function onSideScroll() {
  sideScrollTop.value = sideScroll.value?.scrollTop || 0
}

function onVisible() {
  if (document.visibilityState === 'visible') loadHomework()
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisible)
  if (!props.chapterTreeData.length) return
  initIndex(props.chapterTreeData)
  if (props.defaultChapterId) checkChapterByData(props.chapterTreeData, props.defaultChapterId)
  else getLastLearningRecord()
  chapterTimer = setInterval(() => {
    // 只有当前停在「课程内容」Tab 才计学习时长
    if (props.tabKey.includes(tabName)) toRecord(SAVE_INTERVAL)
  }, SAVE_INTERVAL * 1000)
})

onActivated(() => loadHomework())

onUnmounted(() => {
  if (chapterTimer) clearInterval(chapterTimer)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<style scoped>
.ch { position: relative; display: flex; height: 100%; min-height: 0; background: var(--panel); }
.ch.is-resizing .ch__side, .ch.is-resizing .ch__toggle { transition: none !important; }

/* 左栏 */
.ch__side {
  flex: none; display: flex; flex-direction: column; min-width: 0;
  border-right: 1px solid var(--line-3); background: var(--bg-soft);
  transition: width .2s ease;
}
.ch__side-hd {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border-bottom: 1px solid var(--line-3);
}
.ch__side-hd :deep(.ant-input-group-wrapper) { flex: 1; min-width: 0; }
.ch__count { font-size: 11.5px; color: var(--ink-4); padding: 0 2px; white-space: nowrap; }
.ch__expand { flex: none; }

.ch__side-bd { flex: 1; min-height: 0; overflow: auto; padding: 8px 8px 40px; position: relative; }
.ch__top { position: sticky; bottom: 8px; float: right; }

/* 拖拽条 + 折叠按钮 */
.ch__divider {
  flex: none; width: 5px; cursor: ew-resize; background: transparent;
  transition: background .14s ease;
}
.ch__divider:hover, .ch__divider:focus-visible { background: var(--pri-200); outline: none; }

.ch__toggle {
  position: absolute; z-index: 5; margin-left: -11px; margin-top: 40px;
  width: 18px; height: 46px; padding: 0;
  display: grid; place-items: center;
  border: 1px solid var(--line-2); border-left: 0; border-radius: 0 var(--r-sm) var(--r-sm) 0;
  background: var(--panel); color: var(--ink-3); font-size: 11px; cursor: pointer;
  box-shadow: var(--sh-1);
}
.ch__toggle:hover { color: var(--pri); border-color: var(--pri-200); }

/* 右栏 */
.ch__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ch__main-hd {
  display: flex; align-items: center; gap: 12px; min-height: 44px;
  padding: 6px 16px; border-bottom: 1px solid var(--line-3);
}
.ch__title { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.ch__num { font-family: var(--mono); font-size: 12px; color: var(--ink-4); flex: none; }
.ch__name {
  font-size: 14px; font-weight: 600; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ch__acts { flex: none; display: flex; align-items: center; gap: 8px; }

.ch__body { flex: 1; min-height: 0; overflow: hidden; display: flex; }
.ch__body :deep(.ant-spin-nested-loading),
.ch__body :deep(.ant-spin-container) { width: 100%; height: 100%; }
.ch__content { width: 100%; height: 100%; overflow: auto; }

/* 作业条 */
.ch__hw { flex: none; border-top: 1px solid var(--line-3); background: var(--bg-soft); max-height: 148px; overflow: auto; }
.ch__hw-row { display: flex; align-items: center; gap: 10px; padding: 9px 16px; }
.ch__hw-row + .ch__hw-row { border-top: 1px solid var(--line-3); }
.ch__hw-ico { flex: none; color: var(--pri); font-size: 15px; }
.ch__hw-title { flex: none; font-size: 13px; font-weight: 600; color: var(--ink); }
.ch__hw-meta { flex: none; font-size: 12px; color: var(--ink-4); }
.ch__hw-gap { flex: 1; }

/* 空态 */
.ch__empty { padding: 40px 18px; text-align: center; }
.ch__empty-t { font-size: 13.5px; font-weight: 600; color: var(--ink-2); }
.ch__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }

/* 回看选卷弹窗：候选可能有好几项，横排会把名字挤断，固定纵向列 */
.ch__pick-tip { margin: 0 0 8px; font-size: 12.5px; color: var(--ink-3); }
.ch__pick-list { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.ch__pick-go { margin-top: 14px; }

@media (max-width: 1024px) {
  .ch__side { width: 240px !important; }
  .ch__divider, .ch__toggle { display: none; }
}
</style>
