<template>
  <div ref="rootRef" class="att" :class="{ 'is-resizing': isResizing }">
    <!-- 左：附件树 -->
    <aside class="att__side" :style="{ width: width + 'px' }">
      <div v-show="leftShow" class="att__side-hd">
        <a-input-search
          v-model:value="searchVal"
          allow-clear
          :placeholder="t('搜索附件')"
          :disabled="!fileListData.length"
          :aria-label="t('搜索附件')"
          @change="handleSearch"
        >
          <template #enterButton>
            <span class="att__count">{{ t('共 {n} 个', { n: fileListData.length }) }}</span>
          </template>
        </a-input-search>
        <a-button
          size="small"
          :disabled="!fileListData.length"
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

      <div v-show="leftShow" ref="sideScroll" class="att__side-bd" @scroll="onSideScroll">
        <CourseFileItem
          :learn-data="courseData"
          :curr-file="currFile"
          :file-type="fileType"
          :left-width="width"
          :force-collapse="allCollapsed"
          :force-collapse-level="0"
          :show-search-list="searchIdList"
          :call-back-learn-file="toLearnFile"
        />
        <CourseFileItem
          v-for="(item, index) in chapterDataList"
          :key="item.id"
          :learn-data="item"
          :curr-file="currFile"
          :file-type="fileType"
          :chapter-index="String(index + 1)"
          :left-width="width"
          :force-collapse="allCollapsed"
          :force-collapse-level="0"
          :show-search-list="searchIdList"
          :call-back-learn-file="toLearnFile"
        />
        <div v-if="!fileListData.length" class="att__empty" role="status">
          <div class="att__empty-t">{{ emptyText }}</div>
          <div class="att__empty-d">{{ t('教师上传后这里会出现可学习的文件。') }}</div>
        </div>
        <a-button
          v-if="sideScrollTop > 0"
          size="small"
          class="att__top"
          :aria-label="t('回到顶部')"
          :title="t('回到顶部')"
          @click="toSideTop"
        >
          <template #icon><VerticalAlignTopOutlined /></template>
        </a-button>
      </div>
    </aside>

    <div
      v-show="leftShow"
      class="att__divider"
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
      class="att__toggle"
      :aria-label="leftShow ? t('收起附件栏') : t('展开附件栏')"
      :title="leftShow ? t('收起附件栏') : t('展开附件栏')"
      @click="toggle"
    >
      <LeftOutlined v-if="leftShow" />
      <RightOutlined v-else />
    </button>

    <!-- 右：内容 -->
    <section class="att__main">
      <header class="att__main-hd">
        <div class="att__title" :title="currFile.fileName || ''">
          <template v-if="currFile.fileName">
            <span v-if="currChapter.chapterName" class="att__crumb">{{ currChapter.number }} {{ currChapter.chapterName }}</span>
            <span class="att__name">《{{ currFile.fileName }}》</span>
            <span v-if="currRecord.recordId" class="tag" :class="currRecord.state == 1 ? 'ok' : 'pri'">
              {{ recordProgress }}%
            </span>
          </template>
          <span v-else class="att__name faint">{{ t('请在左侧选择文件') }}</span>
        </div>

        <div class="att__acts">
          <a-tooltip v-if="currRecord.recordId" :title="currRecord.state == 1 ? t('本文件已标记完成') : t('学习进度满 10% 后可手动标记')">
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
          <a-button size="small" :disabled="!canPrev" @click.stop="toPrevFile">{{ t('上一节') }}</a-button>
          <a-button size="small" :disabled="!canNext" @click.stop="toNextFile">{{ t('下一节') }}</a-button>
        </div>
      </header>

      <div class="att__body">
        <a-spin :spinning="loading" :tip="t('正在加载中...')">
          <div class="att__content">
            <IntroductionPage v-if="isIntro" :learn-type="tabName" />
            <LearnDocument v-else-if="currFile.fileId && Number(currFile.fileType) === 1" :file-path="currFile.filePath" />
            <LearnVideo
              v-else-if="currFile.fileId && Number(currFile.fileType) === 3 && playVideoUrl"
              :file-id="currFile.fileId"
              :options="{ width: '100%', height: '100%', src: playVideoUrl, currentTime: currRecord.currentSeconds }"
              :play-callback="() => { isLearning = true }"
              :pause-callback="() => { isLearning = false }"
              :current-time-callback="onVideoTime"
            />
            <div v-else class="att__empty" role="status">
              <div class="att__empty-t">{{ t('该文件暂不支持在线学习') }}</div>
              <div class="att__empty-d">{{ t('目前支持文档与视频两类，其他格式请下载后查看。') }}</div>
            </div>
          </div>
        </a-spin>
      </div>
    </section>
  </div>
</template>

<script setup name="CourseAttachments">
import { computed, onMounted, onUnmounted, reactive, ref, toRefs } from 'vue'
import { message } from 'ant-design-vue'
import {
  DownOutlined, UpOutlined, LeftOutlined, RightOutlined, VerticalAlignTopOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { getUserId } from '@/utils/user'
import { getFile } from '@/api/course/file.js'
import { previewUrl } from '@/api/cloud/file.js'
import { initRecord, updateRecord, getLastRecord } from '@/api/learning/record.js'
import { useSplitPane } from '../composables/useSplitPane'
import IntroductionPage from '../components/IntroductionPage.vue'
import CourseFileItem from '../components/CourseFileItem.vue'
import LearnDocument from '../components/LearnDocument/index.vue'
import LearnVideo from '../components/LearnVideo/index.vue'

const props = defineProps({
  tabKey: { type: Array, default: () => [] },
  tabName: { type: String, default: '' },
  courseId: { type: String, default: '' },
  defaultChapterId: { type: String, default: '' },
  defaultFileId: { type: String, default: '' },
  chapterTreeData: { type: Array, default: () => [] },
  // 1 = 文档，3 = 视频
  fileType: { type: Number, default: 0 },
  fileListData: { type: Array, default: () => [] }
})

const { rootRef, leftWidth, leftShow, isResizing, width, toggle, startResize, nudge } = useSplitPane({
  initial: 300, min: 200, minRight: 520
})

const userId = getUserId()

const data = reactive({
  currChapter: { chapterId: '', chapterName: null, content: null, number: '' },
  currFile: { fileId: '0', fileName: null, chapterId: '', filePath: '', fileType: null },
  currRecord: {
    recordId: '', courseId: '', chapterId: '', fileId: '',
    type: 0, state: 0, totalSeconds: 0, currentSeconds: 0, learningSeconds: 0
  }
})
const { currChapter, currFile, currRecord } = toRefs(data)

const loading = ref(false)
const allCollapsed = ref(false)
const searchVal = ref('')
const searchIdList = ref([])
const sideScroll = ref(null)
const sideScrollTop = ref(0)
const playVideoUrl = ref('')
const isLearning = ref(false)

const courseData = ref({ id: '', name: t('课程学习文档'), relationType: 0, fileList: [] })
const chapterDataList = ref([])
const chapterFileMap = ref(new Map())
const sortMap = ref(new Map())

let recordTimer = null
const SAVE_INTERVAL = 10

const isIntro = computed(() => String(currFile.value.fileId) === '0')
const currIndex = computed(() => sortMap.value.get(String(currFile.value.fileId)))
const canPrev = computed(() => currIndex.value !== undefined && currIndex.value > 0)
const canNext = computed(() => currIndex.value !== undefined && currIndex.value < sortMap.value.size - 1)
const emptyText = computed(() => (props.fileType === 3 ? t('暂无学习视频') : t('暂无学习文档')))

const recordProgress = computed(() => {
  const r = currRecord.value
  if (!r.courseId || !r.totalSeconds) return 0
  return Math.min(100, Math.round((r.currentSeconds / r.totalSeconds) * 100))
})

function handleSearch() {
  const kw = searchVal.value
  searchIdList.value = []
  if (!kw) return
  searchIdList.value.push(kw)
  props.fileListData.forEach((item) => {
    if (String(item.fileName || '').includes(kw)) searchIdList.value.push(item.fileId)
  })
}

function resetFile() {
  currFile.value = { fileId: '', fileName: null, chapterId: '', filePath: '', fileType: null }
}
function resetRecord() {
  currRecord.value = {
    recordId: '', courseId: '', chapterId: '', fileId: '',
    type: 0, state: 0, totalSeconds: 0, currentSeconds: 0, learningSeconds: 0
  }
}

function toLearnFile(fileId) {
  if (!fileId || String(fileId) === String(currFile.value.fileId)) return
  playVideoUrl.value = ''
  loading.value = true
  resetFile()
  resetRecord()
  getFile(fileId).then((res) => {
    if (res?.data?.fileId) {
      currFile.value = res.data
      currChapter.value = {
        chapterId: res.data.chapterId || '',
        chapterName: res.data.chapterName || null,
        number: res.data.chapterNumber || '',
        content: null
      }
      if (Number(res.data.fileType) === 3) {
        playVideoUrl.value = `${window.location.protocol}//${window.location.host}${previewUrl}${res.data.filePath}`
      }
      toInitFileRecord()
    }
  }).catch(() => {
    message.error(t('文件信息加载失败'))
  }).finally(() => {
    loading.value = false
  })
}

/** 文档按体积估时长（KB → 秒），视频用接口给的 duration */
function getReadTimeSecond(kb) {
  const size = Number(kb)
  return size > 0 ? parseInt(size / 1000, 10) : 0
}

function toInitFileRecord() {
  let readTime = 0
  let currSeconds = 0
  if (props.fileType === 3) {
    readTime = Number(currFile.value.duration) || 0
  } else {
    isLearning.value = true
    readTime = getReadTimeSecond(currFile.value.fileSize)
    if (readTime < 60) readTime = 60
    currSeconds = parseInt(readTime * 0.01, 10)
  }
  initRecord({
    type: props.fileType,
    userId,
    courseId: props.courseId,
    chapterId: currFile.value.chapterId,
    fileId: currFile.value.fileId,
    totalSeconds: readTime,
    currentSeconds: currSeconds,
    learningSeconds: currSeconds
  }).then((res) => {
    if (res?.data) currRecord.value = res.data
  }).catch(() => { /* 记录失败不挡播放 */ })
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
  if (r.currentSeconds < r.totalSeconds) r.currentSeconds += seconds
  else {
    r.currentSeconds = r.totalSeconds
    r.state = 1
  }
  updateRecord(r)
}

function onVideoTime(seconds) {
  currRecord.value.currentSeconds = parseInt(seconds, 10) || 0
}

/* -------- 上下节 -------- */
function fileIdByIndex(index) {
  for (const [fileId, idx] of sortMap.value.entries()) {
    if (idx === index) return fileId
  }
  return ''
}
function goByIndex(index) {
  if (index < 0 || index > sortMap.value.size - 1) return
  toLearnFile(fileIdByIndex(index))
}
function toPrevFile() {
  goByIndex((currIndex.value ?? 0) - 1)
}
function toNextFile() {
  goByIndex((currIndex.value ?? -1) + 1)
}

/* -------- 初始化 -------- */
function initSetIndex() {
  courseData.value.fileList.forEach((file) => {
    file.index = sortMap.value.size
    sortMap.value.set(String(file.fileId), file.index)
  })
  chapterDataList.value.forEach((chapter) => {
    (chapter.fileList || []).forEach((file) => {
      file.index = sortMap.value.size
      sortMap.value.set(String(file.fileId), file.index)
    })
  })
}

// 章节附件分组：必须递归下钻——旧页只遍历顶层章节，二级章节的附件永远不显示
function initChapterFileData(nodes) {
  nodes.forEach((item) => {
    const list = chapterFileMap.value.get(String(item.chapterId))
    chapterDataList.value.push({
      id: item.chapterId,
      name: item.chapterName,
      relationType: 1,
      fileList: Array.isArray(list) ? list : []
    })
    if (item.children && item.children.length) initChapterFileData(item.children)
  })
}

function handleFiles() {
  courseData.value.fileList = []
  props.fileListData.forEach((item) => {
    switch (Number(item.relationType)) {
      case 0:
        courseData.value.fileList.push(item)
        break
      case 1:
        if (item.chapterId) {
          const key = String(item.chapterId)
          const list = chapterFileMap.value.get(key)
          const next = Array.isArray(list) ? list : []
          next.push(item)
          chapterFileMap.value.set(key, next)
        }
        break
      default:
        break
    }
  })
  initChapterFileData(props.chapterTreeData)
  initSetIndex()
  getLastLearningRecord()
}

function getLastLearningRecord() {
  getLastRecord(props.courseId, '', userId, props.fileType).then((res) => {
    if (res?.data?.fileId) toLearnFile(res.data.fileId)
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

onMounted(() => {
  courseData.value.id = props.courseId
  if (props.fileListData.length) handleFiles()
  recordTimer = setInterval(() => {
    // 文档按停留计时；视频只在播放中计时（isLearning 由播放回调切换）
    const active = props.tabKey.includes(props.tabName)
    if (active && (props.fileType === 1 ? true : isLearning.value)) toRecord(SAVE_INTERVAL)
  }, SAVE_INTERVAL * 1000)
})

onUnmounted(() => {
  if (recordTimer) clearInterval(recordTimer)
})
</script>

<style scoped>
.att { position: relative; display: flex; height: 100%; min-height: 0; background: var(--panel); }
.att.is-resizing .att__side, .att.is-resizing .att__toggle { transition: none !important; }

.att__side {
  flex: none; display: flex; flex-direction: column; min-width: 0;
  border-right: 1px solid var(--line-3); background: var(--bg-soft);
  transition: width .2s ease;
}
.att__side-hd {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border-bottom: 1px solid var(--line-3);
}
.att__side-hd :deep(.ant-input-group-wrapper) { flex: 1; min-width: 0; }
.att__count { font-size: 11.5px; color: var(--ink-4); padding: 0 2px; white-space: nowrap; }
.att__side-bd { flex: 1; min-height: 0; overflow: auto; padding: 8px 8px 40px; position: relative; }
.att__top { position: sticky; bottom: 8px; float: right; }

.att__divider {
  flex: none; width: 5px; cursor: ew-resize; background: transparent;
  transition: background .14s ease;
}
.att__divider:hover, .att__divider:focus-visible { background: var(--pri-200); outline: none; }

.att__toggle {
  position: absolute; z-index: 5; margin-left: -11px; margin-top: 40px;
  width: 18px; height: 46px; padding: 0;
  display: grid; place-items: center;
  border: 1px solid var(--line-2); border-left: 0; border-radius: 0 var(--r-sm) var(--r-sm) 0;
  background: var(--panel); color: var(--ink-3); font-size: 11px; cursor: pointer;
  box-shadow: var(--sh-1);
}
.att__toggle:hover { color: var(--pri); border-color: var(--pri-200); }

.att__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.att__main-hd {
  display: flex; align-items: center; gap: 12px; min-height: 44px;
  padding: 6px 16px; border-bottom: 1px solid var(--line-3);
}
.att__title { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.att__crumb { flex: none; font-size: 12px; color: var(--ink-4); }
.att__name {
  font-size: 14px; font-weight: 600; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.att__acts { flex: none; display: flex; align-items: center; gap: 8px; }

.att__body { flex: 1; min-height: 0; overflow: hidden; display: flex; }
.att__body :deep(.ant-spin-nested-loading),
.att__body :deep(.ant-spin-container) { width: 100%; height: 100%; }
.att__content { width: 100%; height: 100%; overflow: auto; }

.att__empty { padding: 40px 18px; text-align: center; }
.att__empty-t { font-size: 13.5px; font-weight: 600; color: var(--ink-2); }
.att__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }

@media (max-width: 1024px) {
  .att__side { width: 240px !important; }
  .att__divider, .att__toggle { display: none; }
}
</style>
