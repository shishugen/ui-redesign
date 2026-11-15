<template>
  <div class="ct">
    <button type="button" class="ct__main" :title="courseTitle" @click="open = true">
      <img class="ct__cover" :src="coverSrc" :alt="t('课程封面')" @error="onImgError" />
      <div class="ct__info">
        <div class="ct__name">
          <a-tag :bordered="false" :color="classify.color">{{ classify.label }}</a-tag>
          <span>{{ course.courseName || '—' }}</span>
        </div>
        <div class="ct__desc">{{ course.introduction || '—' }}</div>
      </div>
    </button>

    <a-modal v-model:open="open" :title="course.courseName || t('课程详情')" :footer="null" width="720px">
      <div class="ct__detail">
        <img class="ct__detail-cover" :src="detailSrc" :alt="t('课程封面')" @error="onDetailImgError" />
        <div class="ct__detail-body">
          <div class="ct__labels">
            <a-tag v-for="id in courseLabels" :key="id" color="processing">{{ labelName(id) }}</a-tag>
            <span v-if="!courseLabels.length" class="ct__none">{{ t('暂无标签') }}</span>
          </div>
          <!-- 后台富文本：按 D7「容器换肤、内容不动」，不覆盖内联样式 -->
          <div class="ct__html" v-html="course.introduction || ''" />
          <div class="ct__kv">
            <span class="ct__k">{{ t('审核状态') }}</span>
            <a-tag :color="stateTag.color">{{ stateTag.label }}</a-tag>
          </div>
          <div class="ct__kv">
            <span class="ct__k">{{ t('审核意见') }}</span>
            <span class="ct__v">{{ course.comment || '—' }}</span>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { t } from '@/i18n'
import { previewUrl } from '@/api/cloud/file'
import { toSubString } from '@/utils/aigc.js'
import defaultImg from '@/assets/images/default_course.png'

const props = defineProps({
  course: { type: Object, required: true },
  labelList: { type: Array, default: () => [] }
})

const open = ref(false)
const coverFailed = ref(false)
const detailFailed = ref(false)

const coverSrc = computed(() =>
  coverFailed.value || !props.course.previewImg ? defaultImg : `${previewUrl}${props.course.previewImg}`
)
const detailSrc = computed(() =>
  detailFailed.value || !props.course.coverImg ? defaultImg : `${previewUrl}${props.course.coverImg}`
)
function onImgError() { coverFailed.value = true }
function onDetailImgError() { detailFailed.value = true }

const classify = computed(() => {
  const v = parseInt(props.course.classify)
  if (v === 0) return { label: t('实践'), color: 'warning' }
  if (v === 1) return { label: t('案例'), color: 'processing' }
  return { label: '—', color: 'default' }
})
const stateTag = computed(() => {
  const map = {
    0: { label: t('未提交'), color: 'default' },
    1: { label: t('审核中'), color: 'orange' },
    2: { label: t('已通过'), color: 'green' },
    3: { label: t('未通过'), color: 'red' }
  }
  return map[props.course.state] || { label: t('未知'), color: 'default' }
})
const courseLabels = computed(() => (props.course.labels ? String(props.course.labels).split(',') : []))
function labelName(id) {
  const hit = props.labelList.find(x => String(x.labelId) === String(id))
  return hit ? hit.labelName : id
}
const courseTitle = computed(() =>
  toSubString(`《${props.course.courseName}》${props.course.introduction || ''}`, 100)
)
</script>

<style scoped>
.ct { text-align: left; }
.ct__main {
  display: flex; align-items: flex-start; gap: 12px; width: 100%;
  border: 0; background: transparent; padding: 8px 4px; cursor: pointer; text-align: left;
}
.ct__main:hover .ct__name span { color: var(--pri); }
.ct__cover { width: 132px; height: 66px; border-radius: var(--r-sm); object-fit: cover; border: 1px solid var(--line); flex: none; }
.ct__info { min-width: 0; flex: 1; }
.ct__name { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 500; color: var(--ink); }
.ct__name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct__desc {
  font-size: 12px; color: var(--ink-3); line-height: 1.6; margin-top: 6px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ct__detail { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 18px; }
.ct__detail-cover { width: 200px; height: 260px; object-fit: cover; border-radius: var(--r); border: 1px solid var(--line); }
.ct__detail-body { min-width: 0; }
.ct__labels { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.ct__none { font-size: 12px; color: var(--ink-4); }
.ct__html { font-size: 13px; color: var(--ink-2); line-height: 1.8; overflow: auto; max-height: 220px; }
.ct__kv { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.ct__k { font-size: 12px; color: var(--ink-4); width: 72px; flex: none; }
.ct__v { font-size: 13px; color: var(--ink-2); }
@media (max-width: 640px) { .ct__detail { grid-template-columns: 1fr; } }
</style>
