<template>
  <div v-show="visible" class="citem">
    <button
      type="button"
      class="citem__row"
      :class="{ 'is-active': String(currChapter.chapterId) === String(chapter.chapterId) }"
      :aria-expanded="hasChildren ? String(!collapsed) : undefined"
      :aria-current="String(currChapter.chapterId) === String(chapter.chapterId) ? 'true' : 'false'"
      :title="t('点击学习《{name}》', { name: chapter.chapterName })"
      @click.stop="onClick()"
    >
      <span class="citem__caret" aria-hidden="true">
        <DownOutlined v-if="hasChildren && !collapsed" />
        <RightOutlined v-if="hasChildren && collapsed" />
      </span>
      <span class="citem__tag" :class="tagClass">{{ prefix }}</span>
      <span class="citem__idx">{{ chapterIndex }}</span>
      <span class="citem__name" :class="'lv-' + level">{{ chapter.chapterName }}</span>
    </button>

    <div v-show="!collapsed" class="citem__children">
      <ChapterLearnItem
        v-for="(child, index) in chapter.children"
        :key="child.chapterId"
        :chapter="child"
        :curr-chapter="currChapter"
        :chapter-index="chapterIndex + '.' + (index + 1)"
        :force-collapse="forceCollapse"
        :force-collapse-level="forceCollapseLevel"
        :left-width="leftWidth"
        :call-back-learn-chapter="callBackLearnChapter"
        :call-back-expand-parent="expandParent"
        :show-chapter-list="showChapterList"
      />
    </div>
  </div>
</template>

<script setup name="ChapterLearnItem">
// 章节树节点（递归）。旧页点了就「折叠 + 学习」两件事一起做，且有正文或叶子节点才真正加载——
// 这个行为保留。新页把 div+click 换成 button，键盘能 Tab 到、回车能打开。
import { computed, ref, watch } from 'vue'
import { DownOutlined, RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'

const props = defineProps({
  chapter: { type: Object, required: true, default: () => ({ chapterId: '' }) },
  currChapter: { type: Object, required: true, default: () => ({ chapterId: '' }) },
  chapterIndex: { type: String, default: '' },
  forceCollapse: { type: Boolean, default: null },
  forceCollapseLevel: { type: Number, default: null },
  leftWidth: { type: Number, default: 100 },
  // 搜索命中的 chapterId 集合；空数组表示不过滤
  showChapterList: { type: Array, default: () => [] },
  callBackLearnChapter: { type: Function, default: () => {} },
  callBackExpandParent: { type: Function, default: () => {} }
})

const collapsed = ref(true)

const level = computed(() => Number(props.chapter.level) || 0)
const hasChildren = computed(() => Array.isArray(props.chapter.children) && props.chapter.children.length > 0)

// 搜索过滤：命中的节点要连「祖先链」一起显示，否则父级 v-show 会把它一起藏掉
// （旧页只判断本节点，嵌套章节搜到了也看不见）
function subtreeHit(node, hits) {
  if (hits.includes(node.chapterId)) return true
  return (node.children || []).some((child) => subtreeHit(child, hits))
}
const visible = computed(() => {
  const hit = props.showChapterList || []
  if (!hit.length) return true
  return subtreeHit(props.chapter, hit)
})

const TYPES = ['pri', 'ok', 'warn', '']
const PREFIX = [t('章'), t('节'), t('小节'), t('子节')]
const tagClass = computed(() => TYPES[level.value] || '')
const prefix = computed(() => PREFIX[level.value] || '')

function onClick() {
  if (hasChildren.value) collapsed.value = !collapsed.value
  // 有正文 或 叶子节点才加载内容；纯目录节点点了只展开
  if (Number(props.chapter.hasContent) > 0 || !hasChildren.value) {
    props.callBackLearnChapter(props.chapter.chapterId, props.chapter.number)
  }
}

function expandParent() {
  collapsed.value = false
}

// 全局展开 / 折叠：带层级限制时只对本层及以下生效
watch(
  [() => props.forceCollapse, () => props.forceCollapseLevel],
  ([force, limit]) => {
    if (force === null || force === undefined) return
    if (limit === null || limit === undefined) {
      collapsed.value = force
      return
    }
    if (level.value >= limit) collapsed.value = force
  },
  { immediate: true }
)

// 当前学习章节变化：本节点是它的父级或就是它 → 自动展开，并向上链式展开
watch(
  () => props.currChapter,
  (curr) => {
    if (!curr) return
    const id = String(props.chapter.chapterId)
    if (id === String(curr.parentId) || id === String(curr.chapterId)) {
      collapsed.value = false
      if (id === String(curr.parentId)) props.callBackExpandParent()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.citem__row {
  display: flex; align-items: center; gap: 5px; width: 100%;
  padding: 5px 7px; margin-bottom: 1px;
  border: 0; border-radius: var(--r-sm); background: transparent;
  font: inherit; text-align: left; cursor: pointer;
  transition: background .14s ease;
}
.citem__row:hover { background: var(--bg-soft); }
.citem__row.is-active { background: var(--pri-100); }

.citem__caret { flex: none; display: grid; place-items: center; width: 12px; color: var(--ink-4); font-size: 10px; }

.citem__tag {
  flex: none; padding: 1px 5px; border-radius: var(--r-xs);
  font-size: 10px; line-height: 14px;
  border: 1px solid var(--line-2); background: var(--bg-soft); color: var(--ink-3);
}
.citem__tag.pri { border-color: var(--pri-200); background: var(--pri-50); color: var(--pri); }
.citem__tag.ok { border-color: var(--ok-line); background: var(--ok-soft); color: var(--ok); }
.citem__tag.warn { border-color: var(--warn-line); background: var(--warn-soft); color: var(--warn); }

.citem__idx { flex: none; font-family: var(--mono); font-size: 10.5px; color: var(--ink-4); }
.citem__name {
  flex: 1; min-width: 0; color: var(--ink-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.citem__row.is-active .citem__name { color: var(--pri-ink); font-weight: 600; }
.citem__name.lv-0 { font-size: 13px; font-weight: 600; color: var(--ink); }
.citem__name.lv-1 { font-size: 12.5px; font-weight: 600; }
.citem__name.lv-2 { font-size: 12.5px; }
.citem__name.lv-3, .citem__name.lv-4 { font-size: 12px; }

.citem__children { margin-left: 13px; padding-left: 6px; border-left: 1px dashed var(--line-2); }
</style>
