<template>
  <div class="hw">
    <div class="hw__body">
      <nav class="hw__pane" :aria-label="t('章节列表')">
        <div class="hw__pane-hd">
          <span>{{ t('章节（{n}）', { n: chapters.length }) }}</span>
          <a-button size="small" type="text" :aria-label="t('刷新章节作业状态')" @click="loadStatuses">
            <template #icon><SyncOutlined /></template>
          </a-button>
        </div>
        <div v-if="statusLoading" class="hw__loading" aria-busy="true"><a-spin size="small" /> {{ t('正在加载') }}</div>
        <div v-else-if="statusError" class="hw__err" role="alert">
          <span>{{ statusError }}</span>
          <a-button size="small" @click="loadStatuses">{{ t('重试') }}</a-button>
        </div>
        <ul v-else class="hw__list">
          <li v-for="ch in chapters" :key="ch.chapterId">
            <button type="button" class="hw__item" :class="{ 'hw__item--on': ch.chapterId === activeChapterId }"
                    :aria-current="ch.chapterId === activeChapterId ? 'true' : undefined"
                    :title="ch.chapterName" @click="selectChapter(ch)">
              <span class="hw__name">{{ ch.chapterName }}</span>
              <span v-if="statusMap[ch.chapterId]" class="hw__dot" :class="'hw__dot--' + statusMap[ch.chapterId].tone">
                {{ statusMap[ch.chapterId].text }}
              </span>
              <span v-else class="hw__none">—</span>
            </button>
          </li>
          <li v-if="!chapters.length" class="hw__empty" role="status">
            <b>{{ t('该课程还没有章节') }}</b>
            <span>{{ t('先到「章节编辑」添加章节，才能为章节配置作业。') }}</span>
            <span>{{ t('作业跟着章节走，一章一份。') }}</span>
          </li>
        </ul>
      </nav>

      <div class="hw__detail">
        <div v-if="!activeChapterId" class="hw__pick" role="status">
          <b>{{ t('从左侧选择一个章节') }}</b>
          <span>{{ t('选中后可设置开放时间、卷池、发布与进度统计。') }}</span>
        </div>
        <HomeworkDrawer v-else :key="String(activeChapterId)" :course-id="courseId" :chapter-id="activeChapterId"
                        :chapter-name="activeChapterName" :course-name="courseName" :can-edit="canEdit"
                        @changed="loadStatuses" />
      </div>
    </div>
  </div>
</template>

<script setup name="HomeworkManage">
import { ref, onMounted, watch } from 'vue'
import { t } from '@/i18n'
import { SyncOutlined } from '@ant-design/icons-vue'
import { getCourseChapterStatus } from '@/api/exam/homework'
import HomeworkDrawer from './HomeworkDrawer.vue'

const props = defineProps({
  courseId: { type: [String, Number], default: '' },
  courseName: { type: String, default: '' },
  chapters: { type: Array, default: () => [] },
  canEdit: { type: Boolean, default: false }
})

const activeChapterId = ref('')
const activeChapterName = ref('')
const statusLoading = ref(false)
const statusError = ref('')
const statusMap = ref({})

const selectChapter = (ch) => {
  if (!ch || ch.chapterId == null) return
  activeChapterId.value = ch.chapterId
  activeChapterName.value = ch.chapterName || ''
}

// 一次请求取全课状态；失败时清空状态点而不是伪装成一排「未发布」
async function loadStatuses() {
  if (!props.courseId || !props.chapters.length) { statusMap.value = {}; return }
  statusLoading.value = true
  statusError.value = ''
  try {
    const res = await getCourseChapterStatus(props.courseId)
    const byChapter = {}
    ;(res.data || []).forEach(row => {
      if (row && row.chapterId != null) byChapter[String(row.chapterId)] = Number(row.status) || 0
    })
    statusMap.value = props.chapters.reduce((map, ch) => {
      const s = byChapter[String(ch.chapterId)] || 0
      map[ch.chapterId] = s === 1 ? { tone: 'ok', text: t('已发布') }
        : s === 2 ? { tone: 'off', text: t('已关闭') } : { tone: 'wait', text: t('未发布') }
      return map
    }, {})
  } catch (e) {
    statusMap.value = {}
    statusError.value = e?.message || t('章节状态接口不可用')
  } finally { statusLoading.value = false }
}

watch(() => props.chapters, () => {
  if (!props.chapters.some(c => c.chapterId === activeChapterId.value)) {
    activeChapterId.value = props.chapters[0]?.chapterId ?? ''
    activeChapterName.value = props.chapters[0]?.chapterName || ''
  }
  loadStatuses()
})
onMounted(() => {
  if (props.chapters.length) selectChapter(props.chapters[0])
  loadStatuses()
})
defineExpose({ loadStatuses })
</script>

<style scoped>
.hw { min-height: 60vh; }
.hw__body { display: flex; gap: 12px; align-items: flex-start; }
.hw__pane { width: 240px; flex: 0 0 240px; border: 1px solid var(--line); border-radius: var(--r);
  background: var(--panel); }
.hw__pane-hd { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px;
  font-weight: 600; font-size: 12.5px; color: var(--ink-2); border-bottom: 1px solid var(--line); }
.hw__list { list-style: none; margin: 0; padding: 6px; max-height: 70vh; overflow-y: auto; }
.hw__item { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;
  min-height: 38px; padding: 7px 10px; border: 0; border-radius: var(--r-xs); background: transparent;
  cursor: pointer; text-align: left; color: var(--ink-2); font-size: 12.5px; }
.hw__item:hover { background: var(--bg-soft); }
.hw__item:focus-visible { outline: 2px solid var(--pri); outline-offset: -2px; }
.hw__item--on { background: var(--pri-50); color: var(--pri-ink); font-weight: 600; }
.hw__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hw__dot { flex: none; font-size: 11px; padding: 1px 6px; border-radius: 999px; white-space: nowrap; }
.hw__dot--ok { background: var(--ok-soft); color: var(--ok); }
.hw__dot--off { background: var(--bg); color: var(--ink-4); }
.hw__dot--wait { background: var(--warn-soft); color: var(--warn); }
.hw__none { color: var(--ink-4); }
.hw__empty, .hw__pick, .hw__err, .hw__loading { display: flex; flex-direction: column; gap: 6px;
  padding: 22px 14px; text-align: center; color: var(--ink-3); font-size: 12.5px; }
.hw__empty b, .hw__pick b { color: var(--ink-2); font-size: 13px; }
.hw__pick { border: 1px dashed var(--line-2); border-radius: var(--r); background: var(--bg-soft); }
.hw__err { color: var(--danger); }
.hw__detail { flex: 1; min-width: 0; }
@media (max-width: 900px) {
  .hw__body { flex-direction: column; }
  .hw__pane { width: 100%; flex: none; }
  .hw__list { max-height: 220px; }
}
</style>
