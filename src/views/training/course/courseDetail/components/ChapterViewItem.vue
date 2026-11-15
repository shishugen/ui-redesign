<template>
  <div class="ci">
    <div class="ci__node" :class="{ 'ci__node--leaf': !hasChildren }">
      <div class="ci__info" role="button" :tabindex="0"
           :aria-expanded="hasChildren ? String(!isCollapsed) : undefined"
           :aria-label="chapterAriaLabel"
           :title="chapter.chapterName"
           @click="toggleCollapse"
           @keydown.enter.prevent="toggleCollapse"
           @keydown.space.prevent="toggleCollapse">
        <span class="ci__caret" aria-hidden="true">
          <DownOutlined v-if="hasChildren && !isCollapsed" />
          <RightOutlined v-else-if="hasChildren" />
        </span>
        <a-tag class="ci__lv" :color="getChapterType(chapter.level)">{{ getChapterPrefix(chapter.level) }}</a-tag>
        <span class="ci__no">{{ chapterIndex }}</span>
        <span class="ci__name" :class="`ci__name--lv${chapter.level ?? 0}`">{{ chapter.chapterName }}</span>
        <a-tag v-if="chapter.hasConfig === 1 || chapter.hasConfig === '1'" class="ci__flag" color="green">
          {{ t('实训') }}
        </a-tag>
      </div>

      <div class="ci__acts">
        <ConfigFlag v-if="chapter.chapterId" :chapter="chapter" />
      </div>
    </div>

    <div v-show="!isCollapsed" class="ci__children">
      <template v-if="hasChildren">
        <ChapterViewItem
          v-for="(child, index) in chapter.children"
          :key="child.chapterId"
          :chapter="child"
          :chapter-index="`${chapterIndex}.${index + 1}`"
          :force-collapse="forceCollapse"
          :force-collapse-level="forceCollapseLevel"
          :call-back-expand-parent="expandParent"
        />
      </template>
    </div>
  </div>
</template>

<script setup name="ChapterViewItem">
import { ref, computed, watch } from 'vue'
import { DownOutlined, RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import ConfigFlag from '../components/ConfigFlag/index.vue'

const props = defineProps({
  chapter: { type: Object, required: true },
  chapterIndex: { type: String, default: '' },
  // 旧页用于按视口宽度截断标题；新页改为 CSS 自适应，保留 prop 以维持调用契约
  leftWidth: { type: Number, default: 0 },
  forceCollapse: { type: Boolean, default: null },
  forceCollapseLevel: { type: Number, default: null },
  callBackExpandParent: { type: Function, default: () => {} },
  // 旧页在点击时调用但未声明该 prop（运行时报错），新页补 noop 默认值
  callBackLearnChapter: { type: Function, default: () => {} }
})

const isCollapsed = ref(true)
const hasChildren = computed(() => Array.isArray(props.chapter.children) && props.chapter.children.length > 0)
const chapterAriaLabel = computed(() => {
  const prefix = getChapterPrefix(props.chapter.level)
  const state = hasChildren.value ? (isCollapsed.value ? t('已折叠') : t('已展开')) : ''
  return [prefix, props.chapterIndex, props.chapter.chapterName, state].filter(Boolean).join(' ')
})

const getChapterType = (level) => ['processing', 'success', 'warning', 'info'][level] || 'default'
const getChapterPrefix = (level) => ['章', '节', '小节', '子节'][level] || ''

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  if (hasChildren.value) return
  // 叶子节点：沿用旧页回调，但只在调用方真的传了函数时触发
  props.callBackLearnChapter?.(props.chapter.chapterId, props.chapter.number)
}
function expandParent() { isCollapsed.value = false }

watch(
  [() => props.forceCollapse, () => props.forceCollapseLevel],
  ([nextCollapse, nextLevel]) => {
    if (nextCollapse === null) return
    if (nextLevel === null || (props.chapter.level ?? 0) >= nextLevel) isCollapsed.value = Boolean(nextCollapse)
  },
  { immediate: true }
)
</script>

<style scoped>
.ci__node {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 3px 6px; border-radius: var(--r-sm); cursor: pointer;
  transition: background-color .16s ease;
}
.ci__node:hover,
.ci__node:focus-within { background: var(--pri-50); }

.ci__info {
  display: flex; align-items: center; gap: 7px; min-width: 0; flex: 1;
  padding: 3px 0; border-radius: var(--r-xs); outline-offset: 2px;
}
.ci__info:focus-visible { outline: 2px solid var(--pri); }
.ci__caret { flex: none; width: 15px; font-size: 11px; color: var(--ink-4); display: inline-flex; justify-content: center; }
.ci__lv { flex: none; margin: 0; padding: 0 5px; font-size: 11px; line-height: 18px; border-radius: var(--r-xs); }
.ci__no { flex: none; font-size: 12px; color: var(--ink-4); font-variant-numeric: tabular-nums; }
.ci__name {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--ink); line-height: 1.6;
}
.ci__name--lv0 { font-size: 14px; font-weight: 650; }
.ci__name--lv1 { font-size: 13px; font-weight: 600; }
.ci__name--lv2 { font-size: 12.5px; font-weight: 600; }
.ci__name--lv3,
.ci__name--lv4 { font-size: 12.5px; font-weight: 400; color: var(--ink-2); }
.ci__flag { flex: none; margin: 0; font-size: 11px; line-height: 18px; padding: 0 5px; }

/* 操作区：不再只靠 hover 才出现（键盘/触屏可用），默认低对比，悬浮与聚焦时提亮 */
.ci__acts {
  flex: none; display: flex; align-items: center; gap: 6px;
  opacity: .55; transition: opacity .16s ease;
}
.ci__node:hover .ci__acts,
.ci__node:focus-within .ci__acts { opacity: 1; }

.ci__children {
  margin-left: 9px; padding-left: 9px;
  border-left: 1px dashed var(--line-2);
}
@media (prefers-reduced-motion: reduce) {
  .ci__node, .ci__acts { transition: none; }
}
</style>
