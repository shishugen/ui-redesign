<template>
  <div ref="rootRef" class="cw" :class="{ 'is-resizing': isResizing }">
    <aside class="cw__side" :style="{ width: width + 'px' }">
      <div v-show="leftShow" class="cw__side-hd">
        <a-input-search
          v-model:value="searchVal"
          allow-clear
          :placeholder="t('搜索课件')"
          :disabled="!fileListData.length"
          :aria-label="t('搜索课件')"
          @change="handleSearch"
        >
          <template #enterButton>
            <span class="cw__count">{{ t('共 {n} 个', { n: fileListData.length }) }}</span>
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

      <div v-show="leftShow" ref="sideScroll" class="cw__side-bd" @scroll="onSideScroll">
        <CourseFileItem
          :learn-data="courseData"
          :curr-file="currFile"
          :file-type="0"
          :left-width="width"
          :force-collapse="allCollapsed"
          :force-collapse-level="0"
          :show-search-list="searchIdList"
          :call-back-learn-file="toLearnFile"
        />
        <div v-if="!fileListData.length" class="cw__empty" role="status">
          <div class="cw__empty-t">{{ t('暂无课件') }}</div>
          <div class="cw__empty-d">{{ t('教师上传课件后这里会出现可预览的文件。') }}</div>
        </div>
        <a-button
          v-if="sideScrollTop > 0"
          size="small"
          class="cw__top"
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
      class="cw__divider"
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
      class="cw__toggle"
      :aria-label="leftShow ? t('收起课件栏') : t('展开课件栏')"
      :title="leftShow ? t('收起课件栏') : t('展开课件栏')"
      @click="toggle"
    >
      <LeftOutlined v-if="leftShow" />
      <RightOutlined v-else />
    </button>

    <section class="cw__main">
      <header class="cw__main-hd">
        <div class="cw__title" :title="currFile.fileName || ''">
          <template v-if="currFile.fileName">
            <span class="cw__name">《{{ currFile.fileName }}》</span>
            <span v-if="Number(currFile.fileType) === 1" class="tag pri">{{ t('文档') }}</span>
            <span v-else-if="Number(currFile.fileType) === 3" class="tag warn">{{ t('视频') }}</span>
          </template>
          <span v-else class="cw__name faint">{{ t('请在左侧选择课件') }}</span>
        </div>
        <div class="cw__acts">
          <a-button size="small" :disabled="!canPrev" @click.stop="toPrevFile">{{ t('上一节') }}</a-button>
          <a-button size="small" :disabled="!canNext" @click.stop="toNextFile">{{ t('下一节') }}</a-button>
        </div>
      </header>

      <div class="cw__body">
        <a-spin :spinning="loading" :tip="t('正在加载中...')">
          <div class="cw__content">
            <IntroductionPage v-if="isIntro" learn-type="courseware" />
            <LearnDocument v-else-if="currFile.fileId && Number(currFile.fileType) === 1" :file-path="currFile.filePath" />
            <LearnVideo
              v-else-if="currFile.fileId && Number(currFile.fileType) === 3 && playVideoUrl"
              :file-id="currFile.fileId"
              :options="{ width: '100%', height: '100%', src: playVideoUrl }"
            />
            <div v-else class="cw__empty" role="status">
              <div class="cw__empty-t">{{ t('该课件暂不支持在线预览') }}</div>
              <div class="cw__empty-d">{{ t('目前支持文档与视频两类。') }}</div>
            </div>
          </div>
        </a-spin>
      </div>
    </section>
  </div>
</template>

<script setup name="CoursewareList">
// 教学课件：只有一个「课程教学课件」分组，不记学习进度（旧页同样没有记录逻辑），
// 因此这里不写 initRecord/updateRecord，避免造出不存在的进度数据。
import { computed, onMounted, ref, reactive, toRefs } from 'vue'
import { message } from 'ant-design-vue'
import {
  DownOutlined, UpOutlined, LeftOutlined, RightOutlined, VerticalAlignTopOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { getFile } from '@/api/course/file.js'
import { previewUrl } from '@/api/cloud/file.js'
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
  fileListData: { type: Array, default: () => [] }
})

const { rootRef, leftWidth, leftShow, isResizing, width, toggle, startResize, nudge } = useSplitPane({
  initial: 300, min: 200, minRight: 520
})

const data = reactive({
  currChapter: { chapterId: '', chapterName: null, number: '' },
  currFile: { fileId: '0', fileName: null, chapterId: '', filePath: '', fileType: null }
})
const { currChapter, currFile } = toRefs(data)

const loading = ref(false)
const allCollapsed = ref(false)
const searchVal = ref('')
const searchIdList = ref([])
const sideScroll = ref(null)
const sideScrollTop = ref(0)
const playVideoUrl = ref('')
const courseData = ref({ id: '', name: t('课程教学课件'), relationType: 2, fileList: [] })
const sortMap = ref(new Map())

const isIntro = computed(() => String(currFile.value.fileId) === '0')
const currIndex = computed(() => sortMap.value.get(String(currFile.value.fileId)))
const canPrev = computed(() => currIndex.value !== undefined && currIndex.value > 0)
const canNext = computed(() => currIndex.value !== undefined && currIndex.value < sortMap.value.size - 1)

function handleSearch() {
  const kw = searchVal.value
  searchIdList.value = []
  if (!kw) return
  searchIdList.value.push(kw)
  props.fileListData.forEach((item) => {
    if (String(item.fileName || '').includes(kw)) searchIdList.value.push(item.fileId)
  })
}

function toLearnFile(fileId) {
  if (!fileId || String(fileId) === String(currFile.value.fileId)) return
  playVideoUrl.value = ''
  loading.value = true
  getFile(fileId).then((res) => {
    if (res?.data?.fileId) {
      currFile.value = res.data
      currChapter.value = {
        chapterId: res.data.chapterId || '',
        chapterName: res.data.chapterName || null,
        number: res.data.chapterNumber || ''
      }
      if (Number(res.data.fileType) === 3) {
        playVideoUrl.value = `${window.location.protocol}//${window.location.host}${previewUrl}${res.data.filePath}`
      }
    }
  }).catch(() => {
    message.error(t('课件信息加载失败'))
  }).finally(() => {
    loading.value = false
  })
}

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

function toSideTop() {
  if (sideScroll.value) sideScroll.value.scrollTop = 0
}
function onSideScroll() {
  sideScrollTop.value = sideScroll.value?.scrollTop || 0
}

onMounted(() => {
  courseData.value.id = props.courseId
  courseData.value.fileList = [...props.fileListData]
  courseData.value.fileList.forEach((file) => {
    file.index = sortMap.value.size
    sortMap.value.set(String(file.fileId), file.index)
  })
})
</script>

<style scoped>
.cw { position: relative; display: flex; height: 100%; min-height: 0; background: var(--panel); }
.cw.is-resizing .cw__side, .cw.is-resizing .cw__toggle { transition: none !important; }

.cw__side {
  flex: none; display: flex; flex-direction: column; min-width: 0;
  border-right: 1px solid var(--line-3); background: var(--bg-soft);
  transition: width .2s ease;
}
.cw__side-hd {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px; border-bottom: 1px solid var(--line-3);
}
.cw__side-hd :deep(.ant-input-group-wrapper) { flex: 1; min-width: 0; }
.cw__count { font-size: 11.5px; color: var(--ink-4); padding: 0 2px; white-space: nowrap; }
.cw__side-bd { flex: 1; min-height: 0; overflow: auto; padding: 8px 8px 40px; position: relative; }
.cw__top { position: sticky; bottom: 8px; float: right; }

.cw__divider {
  flex: none; width: 5px; cursor: ew-resize; background: transparent;
  transition: background .14s ease;
}
.cw__divider:hover, .cw__divider:focus-visible { background: var(--pri-200); outline: none; }

.cw__toggle {
  position: absolute; z-index: 5; margin-left: -11px; margin-top: 40px;
  width: 18px; height: 46px; padding: 0;
  display: grid; place-items: center;
  border: 1px solid var(--line-2); border-left: 0; border-radius: 0 var(--r-sm) var(--r-sm) 0;
  background: var(--panel); color: var(--ink-3); font-size: 11px; cursor: pointer;
  box-shadow: var(--sh-1);
}
.cw__toggle:hover { color: var(--pri); border-color: var(--pri-200); }

.cw__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cw__main-hd {
  display: flex; align-items: center; gap: 12px; min-height: 44px;
  padding: 6px 16px; border-bottom: 1px solid var(--line-3);
}
.cw__title { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.cw__name {
  font-size: 14px; font-weight: 600; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cw__acts { flex: none; display: flex; align-items: center; gap: 8px; }

.cw__body { flex: 1; min-height: 0; overflow: hidden; display: flex; }
.cw__body :deep(.ant-spin-nested-loading),
.cw__body :deep(.ant-spin-container) { width: 100%; height: 100%; }
.cw__content { width: 100%; height: 100%; overflow: auto; }

.cw__empty { padding: 40px 18px; text-align: center; }
.cw__empty-t { font-size: 13.5px; font-weight: 600; color: var(--ink-2); }
.cw__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }

@media (max-width: 1024px) {
  .cw__side { width: 240px !important; }
  .cw__divider, .cw__toggle { display: none; }
}
</style>
