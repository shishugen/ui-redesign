<template>
  <!-- 列表视图的「课程信息」单元格：封面 + 类型 + 名称 + 简介 + 标签 -->
  <div class="ct" :title="cardTitle" @click="props.detailCallBack(props.course)">
    <a-image :width="150" :height="80" :preview="false" :src="cover" :fallback="defaultImg" />
    <div class="ct__main">
      <div class="ct__name">
        <a-tag :bordered="false" :color="classifyLabel(props.course.classify).color">
          {{ classifyLabel(props.course.classify).label }}
        </a-tag>
        <b>{{ props.course.courseName }}</b>
      </div>
      <p class="ct__desc">{{ props.course.introduction || '—' }}</p>
      <div class="ct__tags">
        <a-tag v-for="id in courseLabels.slice(0, 5)" :key="id">{{ getLabelName(id) }}</a-tag>
        <a-tag v-if="courseLabels.length > 5">+{{ courseLabels.length - 5 }}</a-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { previewUrl } from '@/api/cloud/file.js'
import { toSubString } from '@/utils/aigc'
import defaultImg from '@/assets/images/default_course.png'
import { t } from '@/i18n'

const props = defineProps({
  course: { type: Object, required: true },
  labelList: { type: Array, default: () => [] },
  detailCallBack: { type: Function, default: () => {} }
})
const cover = computed(() => props.course.previewImg ? previewUrl + props.course.previewImg : defaultImg)
const cardTitle = computed(() => toSubString('《' + (props.course.courseName || '') + '》' + (props.course.introduction || ''), 100))
const courseLabels = computed(() => props.course.labels ? String(props.course.labels).split(',') : [])
const getLabelName = (id) => props.labelList.find(i => String(i.labelId) === String(id))?.labelName || '—'
function classifyLabel(c) {
  return ({ 0: { label: t('实践'), color: 'warning' }, 1: { label: t('案例'), color: 'processing' } })[parseInt(c)] || { label: '—', color: 'default' }
}
</script>

<style scoped>
.ct { display: flex; align-items: flex-start; gap: 14px; cursor: pointer; text-align: left; padding: 8px 0; }
.ct :deep(.ant-image-img) { object-fit: cover; border-radius: var(--r-xs); }
.ct__main { flex: 1; min-width: 0; }
.ct__name { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--ink); }
.ct__desc {
  margin: 4px 0; font-size: 12px; color: var(--ink-3); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ct__tags { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
