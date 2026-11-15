<template>
  <!-- P034：课程分配列表的「课程信息」单元格（同名同路径重写，props 契约与旧页一致） -->
  <div class="ct" :title="hoverTitle">
    <div class="ct__cover">
      <a-image :src="coverSrc" :preview="false" :fallback="defaultImg"
               :alt="t('{name} 课程封面', { name: course.courseName || '' })" />
    </div>

    <div class="ct__main">
      <div class="ct__hd">
        <a-tag :bordered="false" :color="classify.color" class="ct__kind">{{ classify.label }}</a-tag>
        <span class="ct__name" :title="course.courseName">{{ course.courseName || '—' }}</span>
      </div>
      <p v-if="intro" class="ct__intro">{{ intro }}</p>
      <p v-else class="ct__intro ct__intro--none">{{ t('暂无简介') }}</p>
    </div>
  </div>
</template>

<script setup name="AssignCourseTable">
import { computed } from 'vue'
import { t } from '@/i18n'
import { previewUrl } from '@/api/cloud/file.js'
import { toSubString } from '@/utils/aigc.js'
import defaultImg from '@/assets/images/default_course.png'

const props = defineProps({
  course: {
    type: Object,
    required: true,
    default: () => ({ courseId: null, courseName: null, courseCode: null, cover: null, introduction: null })
  },
  // 旧页契约保留：父级仍会传标签列表（当前单元格不渲染标签，仅为不破坏调用方）
  labelList: { type: Array, default: () => [] }
})

const coverSrc = computed(() => (props.course.previewImg ? previewUrl + props.course.previewImg : defaultImg))
const intro = computed(() => toSubString(props.course.introduction || '', 90))
const hoverTitle = computed(() => toSubString(`《${props.course.courseName || ''}》${props.course.introduction || ''}`, 100))

const classify = computed(() => (Number(props.course.classify) === 1
  ? { label: t('案例'), color: 'processing' }
  : { label: t('实践'), color: 'warning' }))
</script>

<style scoped>
.ct { display: flex; gap: 12px; align-items: flex-start; text-align: left; min-width: 0; }

.ct__cover {
  flex: none; width: 148px; height: 78px; border-radius: var(--r-sm);
  overflow: hidden; background: var(--bg); border: 1px solid var(--line-3);
}
.ct__cover :deep(.ant-image),
.ct__cover :deep(.ant-image-img) { width: 100%; height: 100%; display: block; object-fit: cover; }

.ct__main { min-width: 0; flex: 1; }
.ct__hd { display: flex; align-items: center; gap: 6px; min-width: 0; }
.ct__kind { margin: 0; flex: none; font-size: 11px; }
.ct__name {
  min-width: 0; font-size: 13.5px; font-weight: 600; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.ct__intro {
  margin: 6px 0 0; font-size: 12px; line-height: 1.6; color: var(--ink-3);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ct__intro--none { color: var(--ink-4); }

@media (max-width: 720px) {
  .ct__cover { width: 96px; height: 56px; }
}
</style>
