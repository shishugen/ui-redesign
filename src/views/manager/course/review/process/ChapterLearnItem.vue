<template>
  <div class="ci" :id="`chapter-${chapter.chapterId}`">
    <div v-show="showChapterList.length === 0 || showChapterList.includes(chapter.chapterId)"
         class="ci__node" :class="{ on: currChapter.chapterId === chapter.chapterId }">
      <button type="button" class="ci__toggle" :aria-label="t('展开或折叠章节')" @click.stop="toggleCollapse">
        <DownOutlined v-if="hasChildren && !isCollapsed" />
        <RightOutlined v-else-if="hasChildren" />
        <StarOutlined v-else-if="currChapter.chapterId === chapter.chapterId" />
        <span v-else class="ci__spacer" />
      </button>
      <button type="button" class="ci__name" :title="t('点击学习章节')" @click.stop="toChoose">
        <a-tag :color="typeColor" size="small">{{ typePrefix }}</a-tag>
        <span class="ci__idx">{{ chapterIndex }}</span>
        <span class="ci__text">{{ chapter.chapterName }}</span>
      </button>
    </div>

    <div v-show="!isCollapsed" class="ci__children">
      <template v-if="hasChildren">
        <ChapterLearnItem
          v-for="(child, index) in chapter.children" :key="child.chapterId || index"
          :chapter="child" :curr-chapter="currChapter"
          :chapter-index="`${chapterIndex}.${index + 1}`"
          :force-collapse="forceCollapse" :show-chapter-list="showChapterList"
          :left-width="leftWidth"
          :call-back-learn-chapter="callBackLearnChapter"
          :call-back-expand-parent="expandParent"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { DownOutlined, RightOutlined, StarOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'

defineOptions({ name: 'ChapterLearnItem' })

const props = defineProps({
  chapter: { type: Object, required: true },
  currChapter: { type: Object, required: true },
  chapterIndex: { type: String, default: '' },
  forceCollapse: { type: Boolean, default: null },
  leftWidth: { type: Number, default: 240 },
  showChapterList: { type: Array, default: () => [] },
  callBackLearnChapter: { type: Function, default: () => {} },
  callBackExpandParent: { type: Function, default: () => {} }
})

const isCollapsed = ref(true)
const hasChildren = computed(() => !!(props.chapter.children && props.chapter.children.length))
const typeColor = computed(() => ['processing', 'success', 'warning', 'default'][props.chapter.level] || 'default')
const typePrefix = computed(() => [t('章'), t('节'), t('小节'), t('子节')][props.chapter.level] || '')

function toggleCollapse() { isCollapsed.value = !isCollapsed.value }
function expandParent() { isCollapsed.value = false }
function toChoose() {
  isCollapsed.value = !isCollapsed.value
  if (props.chapter.hasContent > 0 || !hasChildren.value) {
    props.callBackLearnChapter(props.chapter.chapterId, props.chapter.number)
  }
}

watch(() => props.forceCollapse, v => { if (v !== null) isCollapsed.value = v }, { immediate: true })
watch(() => props.currChapter, c => {
  if (props.chapter.chapterId === c.parentId || props.chapter.chapterId === c.chapterId) {
    isCollapsed.value = false
    props.callBackExpandParent()
  }
}, { immediate: true })
</script>

<style scoped>
.ci { margin-left: 4px; }
.ci__node { display: flex; align-items: center; gap: 4px; border-radius: var(--r-sm); padding: 2px 4px; }
.ci__node:hover { background: var(--bg); }
.ci__node.on { background: var(--pri-50); }
.ci__toggle {
  width: 24px; height: 24px; flex: none; border: 0; background: transparent;
  color: var(--ink-3); cursor: pointer; display: grid; place-items: center; padding: 0;
}
.ci__spacer { display: block; width: 12px; }
.ci__name {
  display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1;
  border: 0; background: transparent; padding: 4px 2px; cursor: pointer;
  font-size: 12.5px; color: var(--ink-2); text-align: left;
}
.ci__name :deep(.ant-tag) { margin: 0; flex: none; }
.ci__idx { font-style: normal; color: var(--ink-4); flex: none; font-variant-numeric: tabular-nums; }
.ci__text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ci__children { padding-left: 12px; border-left: 1px solid var(--line-3); }
</style>
