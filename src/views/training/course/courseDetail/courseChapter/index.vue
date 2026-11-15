<template>
  <section class="cc">
    <header class="cc__hd">
      <div class="cc__hd-l">
        <h2 class="cc__title">{{ t('章节大纲') }}</h2>
        <span class="cc__sub">{{ t('共 {n} 个章节', { n: chapterCount }) }}</span>
      </div>
      <a-button v-if="chapterTreeData.length" size="small" :aria-label="expandLabel" :title="expandLabel"
                @click="handleExpand">
        <template #icon>
          <UpOutlined v-if="!forceCollapse" />
          <DownOutlined v-else />
        </template>
        {{ forceCollapse ? t('展开全部') : t('折叠全部') }}
      </a-button>
    </header>

    <div v-if="chapterTreeData.length" class="cc__body">
      <ChapterViewItem
        v-for="(chapter, index) in chapterTreeData"
        :key="chapter.chapterId"
        :chapter="chapter"
        :chapter-index="String(index + 1)"
        :force-collapse="forceCollapse"
        :force-collapse-level="forceCollapseLevel"
        :call-back-expand-parent="noop"
      />
    </div>

    <div v-else class="cc__empty" role="status">
      <div class="cc__empty-t">{{ t('这门课程还没有章节') }}</div>
      <div class="cc__empty-d">{{ t('章节由课程负责人在编辑页维护，发布后会显示在这里。') }}</div>
    </div>
  </section>
</template>

<script setup name="CourseChapter">
import { ref, computed } from 'vue'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import ChapterViewItem from '../components/ChapterViewItem.vue'

const props = defineProps({
  courseId: { type: String, default: '0' },
  // 树形章节数据
  chapterTreeData: { type: Array, default: () => [] }
})

// 展开 / 折叠状态与层级（沿用旧页语义：level 0 表示对所有层级生效）
const forceCollapse = ref(false)
const forceCollapseLevel = ref(0)
const expandLabel = computed(() => (forceCollapse.value ? t('展开全部章节') : t('折叠全部章节')))

function countNodes(list) {
  return (list || []).reduce((sum, n) => sum + 1 + countNodes(n.children), 0)
}
const chapterCount = computed(() => countNodes(props.chapterTreeData))
const noop = () => {}

function handleExpand() { forceCollapse.value = !forceCollapse.value }
</script>

<style scoped>
.cc { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-1); }
.cc__hd {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 13px 18px; border-bottom: 1px solid var(--line-3);
}
.cc__hd-l { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.cc__title { margin: 0; font-size: 13.5px; font-weight: 650; color: var(--ink); }
.cc__sub { font-size: 12px; color: var(--ink-4); }
.cc__body { padding: 10px 14px 16px; }
.cc__empty { padding: 40px 18px; text-align: center; }
.cc__empty-t { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.cc__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }
</style>
