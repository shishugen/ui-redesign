<template>
  <div class="cf">
    <a-tabs v-model:activeKey="activeName">
      <a-tab-pane key="course" :tab="t('课程附件')">
        <FileList :course-id="String(currCourse.courseId)" :relation-type="0" :can-edit="canEdit" />
      </a-tab-pane>

      <a-tab-pane v-if="Number(currCourse.classify) === 0" key="chapter" :tab="t('章节附件')">
        <div class="cf__hd">
          <span class="cf__tip">{{ t('仅展示附件配置的章节') }}</span>
          <a-button size="small" :aria-label="expandLabel" @click="handleExpand">
            <template #icon>
              <UpOutlined v-if="!forceCollapse" />
              <DownOutlined v-else />
            </template>
            {{ forceCollapse ? t('展开') : t('折叠') }}
          </a-button>
        </div>
        <div v-if="chapterTreeData.length">
          <ChapterTreeItems
            v-for="(chapter, index) in chapterTreeData"
            :key="chapter.chapterId"
            show-type="file"
            :show-children="false"
            :chapter="chapter"
            :chapter-index="String(index + 1)"
            :force-collapse="forceCollapse"
            :force-collapse-level="forceCollapseLevel"
            :can-edit="canEdit"
          />
        </div>
        <div v-else class="cf__empty" role="status">{{ t('暂无章节') }}</div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup name="CourseFile">
import { ref, computed } from 'vue'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import ChapterTreeItems from '../components/ChapterTreeItems.vue'
import FileList from '../components/FileList/index.vue'

const props = defineProps({
  currCourse: {
    type: Object,
    default: () => ({ courseId: '', courseName: '', classify: 0 }),
    required: true
  },
  chapterTreeData: { type: Array, default: () => [] },
  canEdit: { type: Boolean, default: false }
})

const activeName = ref('course')
const forceCollapse = ref(false)
const forceCollapseLevel = ref(0)
const expandLabel = computed(() => (forceCollapse.value ? t('展开全部章节') : t('折叠全部章节')))

function handleExpand() { forceCollapse.value = !forceCollapse.value }
</script>

<style scoped>
.cf { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 14px; }
.cf__hd {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin: 4px 2px 10px;
}
.cf__tip { font-size: 12px; color: var(--warn); }
.cf__empty { padding: 26px 12px; text-align: center; font-size: 12.5px; color: var(--ink-4); }
</style>
