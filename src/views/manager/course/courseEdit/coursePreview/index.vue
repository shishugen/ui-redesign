<template>
  <div class="cpv">
    <div class="cpv__wrap" :class="{ 'is-resizing': isResizing }">
      <!-- 左：章节 -->
      <div class="cpv__left" :style="{ width: leftShow ? leftWidthSize + 'px' : '0px' }">
        <div v-show="leftShow" class="cpv__left-hd">
          <a-input-search v-model:value="searchVal" allow-clear :placeholder="t('搜索章节')"
                          :disabled="!chapterTreeData.length" @change="handleSearch" style="flex: 1">
            <template #addonBefore>{{ t('共{n}章', { n: chapterTreeData.length }) }}</template>
          </a-input-search>
          <a-button :aria-label="expandLabel" :title="expandLabel" :disabled="!chapterTreeData.length"
                    @click.stop="handleExpand">
            <template #icon>
              <UpOutlined v-if="!forceCollapse" />
              <DownOutlined v-else />
            </template>
          </a-button>
        </div>

        <div ref="chapterLeftPanel" class="cpv__left-body" :style="{ height: chapterHeight + 'px' }" @scroll="handleLeftScroll">
          <template v-if="chapterTreeData.length">
            <ChapterTreeItems
              v-for="(chapter, index) in chapterTreeData"
              :key="chapter.chapterId"
              show-type="preview"
              :chapter="chapter"
              :curr-chapter="currChapter"
              :chapter-index="String(index + 1)"
              :force-collapse="forceCollapse"
              :force-collapse-level="forceCollapseLevel"
              :call-back-learn-chapter="toLearnChapter"
              :show-chapter-list="searchIdList"
            />
          </template>
          <div v-else class="cpv__empty" role="status">
            <div class="cpv__empty-t">{{ t('暂无章节') }}</div>
            <div class="cpv__empty-d">{{ t('先在「章节编辑」里建立章节，再回来预览。') }}</div>
          </div>
        </div>
      </div>

      <!-- 拖拽条 -->
      <div v-show="leftShow" class="cpv__drag" :style="{ left: leftWidthSize + 'px' }"
           role="separator" aria-orientation="vertical" :aria-label="t('拖动调整宽度')" @mousedown="startResize" />
      <!-- 收起 / 展开 -->
      <button type="button" class="cpv__toggle" :style="{ left: leftBtnSize + 'px' }"
              :title="leftShow ? t('收起左侧') : t('展示左侧')"
              :aria-label="leftShow ? t('收起左侧') : t('展示左侧')" @click="handleBtnStatus">
        <LeftOutlined v-if="leftShow" />
        <RightOutlined v-else />
      </button>

      <!-- 右：内容 -->
      <div class="cpv__right">
        <div class="cpv__right-hd">
          <div v-if="currChapter.chapterName" class="cpv__title" :title="currChapter.chapterName">
            <span class="cpv__no">{{ currNumber }}</span>{{ currChapter.chapterName }}
          </div>
          <div v-else class="cpv__title cpv__title--idle">{{ t('请选择左侧章节') }}</div>
          <div class="cpv__tools">
            <a-button type="primary" ghost size="small" :disabled="!currChapter.chapterId" @click.stop="toRefreshChapter">
              {{ t('刷新内容') }}
            </a-button>
            <a-button type="primary" size="small" :disabled="currIndex == null || currIndex <= 0 || chapterMap.size === 0"
                      @click.stop="toPrevChapter">{{ t('上一节') }}</a-button>
            <a-button type="primary" size="small" :disabled="currIndex == null || currIndex >= chapterMap.size - 1 || chapterMap.size === 0"
                      @click.stop="toNextChapter">{{ t('下一节') }}</a-button>
          </div>
        </div>

        <div ref="chapterRightPanel" class="cpv__right-body">
          <a-spin :spinning="loading" :tip="t('正在加载中...')">
            <div class="cpv__content" :style="{ height: chapterHeight + 'px' }">
              <Preview v-if="currChapter.chapterId && currChapter.content"
                       :content="currChapter.content" :height="chapterHeight" />
              <div v-else class="cpv__empty" role="status">
                <div class="cpv__empty-t">{{ t('暂无章节内容') }}</div>
                <div class="cpv__empty-d">
                  {{ currChapter.chapterId ? t('该章节还没有正文，可到「章节编辑」补充。') : t('点左侧任一章节开始预览。') }}
                </div>
              </div>
            </div>
          </a-spin>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup name="CoursePreview">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { LeftOutlined, RightOutlined, UpOutlined, DownOutlined } from '@ant-design/icons-vue'
import { getChapter } from '@/api/course/chapter.js'
import { t } from '@/i18n'
import Preview from '@/components/Preview/index.vue'
import ChapterTreeItems from '../components/ChapterTreeItems.vue'

const props = defineProps({
  chapterData: { type: Array, default: () => [] },
  chapterTreeData: { type: Array, default: () => [] }
})

const currChapter = ref({ chapterId: '0', chapterName: '', content: '', parentId: '', level: 0 })
const currNumber = ref('')
const loading = ref(false)

/* ---------- 尺寸 / 拖拽 ---------- */
const chapterWidth = ref(0)
const chapterHeight = ref(0)
const leftPercentage = ref(0.24)
const leftWidthSize = ref(document.documentElement.clientWidth * leftPercentage.value)
const leftBtnSize = ref(leftWidthSize.value - 10)
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)
const leftShow = ref(true)
const chapterLeftPanel = ref(null)
const chapterRightPanel = ref(null)

/* ---------- 搜索 ---------- */
const searchVal = ref('')
const searchIdList = ref([])

/* ---------- 章节顺序 ---------- */
const chapterMap = ref(new Map())
const forceCollapse = ref(true)
const forceCollapseLevel = ref(0)
const expandLabel = computed(() => (forceCollapse.value ? t('展开全部章节') : t('折叠全部章节')))

const currIndex = computed(() => chapterMap.value.get(currChapter.value.chapterId))

function handleExpand() { forceCollapse.value = !forceCollapse.value }

function handleSearch() {
  const kw = (searchVal.value || '').trim()
  if (!kw) { searchIdList.value = []; return }
  searchIdList.value = ['0', ...(props.chapterData || [])
    .filter((i) => String(i.chapterName || '').indexOf(kw) > -1)
    .map((i) => i.chapterId)]
}

function toLearnChapter(chapterId, number) {
  currNumber.value = number || ''
  if (chapterId == currChapter.value.chapterId) return
  loading.value = true
  resetChapter()
  getChapter(chapterId)
    .then((res) => { if (res?.data?.chapterId) currChapter.value = res.data })
    .catch(() => { /* 拦截器已提示 */ })
    .finally(() => { loading.value = false })
}

function toRefreshChapter() {
  if (!currChapter.value.chapterId) return
  loading.value = true
  currChapter.value = { ...currChapter.value, content: '' }
  getChapter(currChapter.value.chapterId)
    .then((res) => { if (res?.data?.chapterId) currChapter.value = res.data })
    .catch(() => { /* 拦截器已提示 */ })
    .finally(() => { loading.value = false })
}

function resetChapter() {
  currChapter.value = { chapterId: '', chapterName: '', content: '', parentId: '', level: 0 }
}

function toPrevChapter() { changeChapter(Number(currIndex.value) - 1) }
function toNextChapter() { changeChapter(Number(currIndex.value) + 1) }
function changeChapter(index) { chooseChapter(props.chapterTreeData, index) }

// 按全局顺序号找章节（旧页用 item.index + 递归 some 实现）
function chooseChapter(tree, index) {
  for (const item of tree || []) {
    if (item.index == index) { toLearnChapter(item.chapterId, item.number); return true }
    if (item.children?.length && chooseChapter(item.children, index)) return true
  }
  return false
}

function handleLeftScroll() { /* 预留：左侧滚动位置跟踪 */ }

function handleBtnStatus() {
  leftShow.value = !leftShow.value
  if (leftShow.value) {
    leftWidthSize.value = chapterWidth.value * leftPercentage.value
    leftBtnSize.value = leftWidthSize.value - 10
  }
}

function startResize(e) {
  e.preventDefault()
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = leftWidthSize.value
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

function handleResize(e) {
  if (!isResizing.value) return
  const next = startWidth.value + (e.clientX - startX.value)
  if (next >= 120 && next < chapterWidth.value - 320) {
    leftWidthSize.value = next
    leftBtnSize.value = next - 10
  }
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// 有正文或叶子节点的章节才进入「上一节/下一节」序列
function initIndex(tree) {
  tree.forEach((item) => {
    if (item.hasContent > 0 || !item.children?.length) {
      item.index = chapterMap.value.size
      chapterMap.value.set(item.chapterId, item.index)
    }
    if (item.children?.length) initIndex(item.children)
  })
  if (chapterMap.value.size) changeChapter(0)
}

function initSize() {
  chapterWidth.value = document.documentElement.clientWidth * 0.9
  chapterHeight.value = document.documentElement.clientHeight - 210
  leftWidthSize.value = chapterWidth.value * leftPercentage.value
  leftBtnSize.value = leftWidthSize.value - 10
}

onMounted(() => {
  window.addEventListener('resize', initSize)
  nextTick(() => {
    initSize()
    if (props.chapterTreeData.length) initIndex(props.chapterTreeData)
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', initSize)
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.cpv { width: 100%; }
.cpv__wrap { position: relative; display: flex; width: 100%; overflow: hidden; }

.cpv__left {
  flex: none; overflow: hidden; background: var(--bg-soft);
  border-right: 1px solid var(--line-3); transition: width .3s ease;
  display: flex; flex-direction: column;
}
.cpv__wrap.is-resizing .cpv__left { transition: none; }
.cpv__left-hd { display: flex; align-items: center; gap: 6px; padding: 8px 8px 6px; }
.cpv__left-body { overflow-y: auto; padding: 0 6px 24px; }

.cpv__drag {
  position: absolute; top: 0; height: 100%; width: 5px; z-index: 20; cursor: ew-resize;
}
.cpv__drag:hover { background: var(--pri-100); }

.cpv__toggle {
  position: absolute; top: 50%; transform: translateY(-50%); z-index: 30;
  width: 18px; height: 54px; display: flex; align-items: center; justify-content: center;
  background: var(--panel); border: 1px solid var(--line-2); border-radius: 0 6px 6px 0;
  color: var(--ink-3); cursor: pointer; box-shadow: var(--sh-1); font-size: 12px;
}
.cpv__toggle:hover { color: var(--pri); border-color: var(--pri-200); }

.cpv__right { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cpv__right-hd {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; background: var(--bg-soft); border-bottom: 1px solid var(--line-3);
}
.cpv__title {
  flex: 1; min-width: 0; font-size: 13.5px; font-weight: 650; color: var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cpv__title--idle { font-weight: 500; color: var(--ink-4); }
.cpv__no { margin-right: 6px; color: var(--ink-4); font-weight: 500; }
.cpv__tools { flex: none; display: flex; gap: 6px; }
.cpv__right-body { background: var(--panel); }
.cpv__content { overflow: hidden; }

.cpv__empty { padding: 40px 16px; text-align: center; }
.cpv__empty-t { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.cpv__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }

@media (prefers-reduced-motion: reduce) {
  .cpv__left { transition: none; }
}
</style>
