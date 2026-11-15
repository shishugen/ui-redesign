<template>
  <div class="ct">
    <div v-show="hasShowNode" class="ct__node" :class="{ 'ct__node--active': currChapter.chapterId == chapter.chapterId }">
      <div class="ct__info" role="button" tabindex="0"
           :aria-expanded="hasTree ? String(!isCollapsed) : undefined"
           :title="chapter.chapterName"
           @click="toggleCollapse"
           @keydown.enter.prevent="toggleCollapse"
           @keydown.space.prevent="toggleCollapse">
        <span class="ct__caret" aria-hidden="true">
          <DownOutlined v-if="hasTree && !isCollapsed" />
          <RightOutlined v-else-if="hasTree" />
        </span>
        <a-tag class="ct__lv" :color="getChapterType(chapter.level)">{{ getChapterPrefix(chapter.level) }}</a-tag>
        <span class="ct__no">{{ chapterIndex }}</span>
        <span class="ct__name" :class="`ct__name--lv${chapter.level ?? 0}`">{{ chapter.chapterName }}</span>
        <a-tag v-if="chapter.hasConfig == 1" class="ct__flag" color="green">{{ t('实训') }}</a-tag>
      </div>

      <div v-if="sortFlag" class="ct__sort">
        <a-tag :color="getChapterType(chapter.level)">{{ getChapterPrefix(chapter.level) }}</a-tag>
        <a-input-number v-model:value="chapter.sort" :min="1" :aria-label="t('排序号')"
                        @change="callbackSetSort(chapter)" />
      </div>

      <div v-if="showType === 'chapter'" class="ct__acts">
        <a-button type="primary" size="small" :aria-label="t('添加子级')"
                  @click.stop="callbackAdd(chapter, getParentName, chapter.children.length + 1)">
          <template #icon><PlusOutlined /></template>
        </a-button>
        <a-button type="primary" size="small" :aria-label="t('预览章节')" title="预览"
                  @click.stop="callbackView(chapter, getParentName)">
          <template #icon><EyeOutlined /></template>
        </a-button>
        <a-button type="primary" size="small" :aria-label="t('编辑章节')" title="编辑"
                  @click.stop="callbackUpdate(chapter, getParentName)">
          <template #icon><EditOutlined /></template>
        </a-button>
        <a-button type="primary" danger size="small" :aria-label="t('删除章节')" title="删除"
                  @click.stop="callbackDelete(chapter)">
          <template #icon><DeleteOutlined /></template>
        </a-button>
        <a-button v-if="courseClassify == 0 && chapter.level == 0" type="primary" size="small"
                  :danger="chapter.hasConfig == 1"
                  :aria-label="chapter.hasConfig == 0 ? t('开启实训') : t('关闭实训')"
                  @click.stop="callbackSetConfig(chapter)">
          <template #icon>
            <SettingOutlined v-if="chapter.hasConfig == 0" />
            <CloseOutlined v-else />
          </template>
          <span>{{ chapter.hasConfig == 0 ? t('开启实训') : t('关闭实训') }}</span>
        </a-button>
      </div>
    </div>

    <div v-show="!isCollapsed" class="ct__children">
      <template v-if="hasChildren && showChildren">
        <ChapterTreeItems
          v-for="(child, index) in chapter.children"
          :key="child.chapterId"
          :show-type="showType"
          :chapter="child"
          :curr-chapter="currChapter"
          :chapter-index="chapterIndex + '.' + (index + 1)"
          :course-classify="courseClassify"
          :parent-name="getParentName"
          :sort-flag="sortFlag"
          :force-collapse="forceCollapse"
          :force-collapse-level="forceCollapseLevel"
          :can-edit="canEdit"
          :left-width="leftWidth"
          :call-back-learn-chapter="callBackLearnChapter"
          :call-back-expand-parent="expandParent"
          :show-chapter-list="showChapterList"
          :callback-add="callbackAdd"
          :callback-view="callbackView"
          :callback-update="callbackUpdate"
          :callback-delete="callbackDelete"
          :callback-set-sort="callbackSetSort"
          :callback-set-config="callbackSetConfig"
        />
      </template>

      <!-- 章节附件（show-type=file 时挂在节点下） -->
      <FileList v-if="showType === 'file' && chapter.chapterId"
                :course-id="chapter.courseId" :chapter-id="chapter.chapterId"
                :relation-type="1" :can-edit="canEdit" />

      <!-- 章节实训配置（仅已开启实训的章节） -->
      <ConfigList v-if="showType === 'config' && chapter.chapterId && chapter.hasConfig == 1"
                  :course-id="chapter.courseId" :chapter-id="chapter.chapterId"
                  :relation-type="1" :can-edit="canEdit" />
    </div>
  </div>
</template>

<script setup name="ChapterTreeItems">
import { ref, computed, watch } from 'vue'
import {
  DeleteOutlined, DownOutlined, EditOutlined, EyeOutlined,
  PlusOutlined, RightOutlined, SettingOutlined, CloseOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import FileList from './FileList/index.vue'
import ConfigList from './ConfigList/index.vue'

const props = defineProps({
  showType: { type: String, default: '' },
  showChildren: { type: Boolean, default: true },
  chapter: { type: Object, required: true, default: () => ({ chapterId: '' }) },
  currChapter: { type: Object, required: false, default: () => ({ chapterId: '' }) },
  courseClassify: { type: [String, Number], default: 0 },
  chapterIndex: { type: String, default: '' },
  parentName: { type: String, default: '' },
  sortFlag: { type: Boolean, default: false },
  forceCollapse: { type: Boolean, default: null },
  forceCollapseLevel: { type: Number, default: null },
  canEdit: { type: Boolean, default: false },
  leftWidth: { type: Number, default: 0 },
  showChapterList: { type: Array, default: () => [] },
  callBackLearnChapter: { type: Function, default: () => {} },
  callBackExpandParent: { type: Function, default: () => {} },
  callbackAdd: { type: Function, default: () => {} },
  callbackUpdate: { type: Function, default: () => {} },
  callbackView: { type: Function, default: () => {} },
  callbackDelete: { type: Function, default: () => {} },
  callbackSetSort: { type: Function, default: () => {} },
  callbackSetConfig: { type: Function, default: () => {} }
})

const isCollapsed = ref(true)
const hasChildren = computed(() => Array.isArray(props.chapter.children) && props.chapter.children.length > 0)
const hasTree = computed(() => hasChildren.value || props.showType === 'file' || props.showType === 'config')

const hasShowNode = computed(() => {
  switch (props.showType) {
    case 'chapter': return true
    case 'file': return props.chapter.level == 0
    case 'config': return props.chapter.hasConfig == 1
    case 'preview': return props.showChapterList.length === 0 || props.showChapterList.includes(props.chapter.chapterId)
    default: return true
  }
})

const getParentName = computed(() => `${props.parentName} —> ${props.chapterIndex}.${props.chapter.chapterName}`)

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  if (props.chapter.hasContent > 0 || !hasChildren.value) {
    props.callBackLearnChapter?.(props.chapter.chapterId, props.chapter.number)
  }
}

const getChapterType = (level) => ['processing', 'success', 'warning', 'info'][level] || 'default'
const getChapterPrefix = (level) => ['章', '节', '小节', '子节'][level] || ''

function expandParent() { isCollapsed.value = false }

watch(
  [() => props.forceCollapse, () => props.forceCollapseLevel],
  ([nextCollapse, nextLevel]) => {
    if (nextCollapse === null) return
    if (nextLevel === null || (props.chapter.level ?? 0) >= nextLevel) isCollapsed.value = Boolean(nextCollapse)
  },
  { immediate: true }
)

// 当前章节（或其父级）变化时自动展开
watch(() => props.currChapter, (chapter) => {
  if (!chapter) return
  if (props.chapter.chapterId == chapter.parentId || props.chapter.chapterId == chapter.chapterId) {
    isCollapsed.value = false
    props.callBackExpandParent?.()
  }
}, { immediate: true })
</script>

<style scoped>
.ct { margin-left: 2px; }
.ct__node {
  display: flex; align-items: center; gap: 10px;
  padding: 3px 6px; border-radius: var(--r-sm); transition: background-color .16s ease;
}
.ct__node:hover, .ct__node:focus-within { background: var(--pri-50); }
.ct__node--active { background: var(--pri-50); box-shadow: inset 2px 0 0 var(--pri); }

.ct__info {
  display: flex; align-items: center; gap: 7px; min-width: 0; flex: 1;
  padding: 4px 0; border-radius: var(--r-xs); cursor: pointer; outline-offset: 2px;
}
.ct__info:focus-visible { outline: 2px solid var(--pri); }
.ct__caret { flex: none; width: 15px; font-size: 11px; color: var(--ink-4); display: inline-flex; justify-content: center; }
.ct__lv { flex: none; margin: 0; padding: 0 5px; font-size: 11px; line-height: 18px; }
.ct__no { flex: none; font-size: 12px; color: var(--ink-4); font-variant-numeric: tabular-nums; }
.ct__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink); }
.ct__name--lv0 { font-size: 14px; font-weight: 650; }
.ct__name--lv1 { font-size: 13px; font-weight: 640; }
.ct__name--lv2 { font-size: 12.5px; font-weight: 600; }
.ct__name--lv3, .ct__name--lv4 { font-size: 12.5px; font-weight: 400; color: var(--ink-2); }
.ct__flag { flex: none; margin: 0; font-size: 11px; line-height: 18px; padding: 0 5px; }

.ct__sort { flex: none; display: flex; align-items: center; gap: 6px; }
.ct__sort :deep(.ant-input-number) { width: 72px; }

/* 操作按钮常显低对比，聚焦/悬浮提亮（旧页仅 hover 可见） */
.ct__acts { flex: none; display: flex; gap: 4px; opacity: .5; transition: opacity .16s ease; }
.ct__node:hover .ct__acts, .ct__node:focus-within .ct__acts { opacity: 1; }

.ct__children { margin-left: 9px; padding-left: 9px; border-left: 1px dashed var(--line-2); }

@media (prefers-reduced-motion: reduce) {
  .ct__node, .ct__acts { transition: none; }
}
</style>
