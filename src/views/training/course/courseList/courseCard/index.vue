<template>
  <div class="cc" :title="cardTitle" @click="props.detailCallBack(props.course)">
    <div class="cc__cover">
      <a-image :preview="false" :src="cover" :fallback="defaultImg" />
      <a-tag class="cc__pub" :color="statusLabel(props.course.status).color">
        {{ statusLabel(props.course.status).label }}
      </a-tag>
    </div>
    <div class="cc__body">
      <h3 class="cc__name">{{ props.course.courseName }}</h3>
      <p class="cc__desc">{{ props.course.introduction || '—' }}</p>
      <div class="cc__tags">
        <a-tag v-for="id in courseLabels.slice(0, 3)" :key="id" class="cc__tag">{{ getLabelName(id) }}</a-tag>
        <a-tag v-if="courseLabels.length > 3" class="cc__tag">+{{ courseLabels.length - 3 }}</a-tag>
      </div>
      <div class="cc__ft">
        <span class="cc__author"><UserOutlined />{{ props.course.createByName || '—' }}</span>
        <span class="cc__learn"><StarOutlined />{{ props.course.learningCount ?? '—' }} {{ t('人学习') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { UserOutlined, StarOutlined } from '@ant-design/icons-vue'
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
function statusLabel(s) {
  return ({ 0: { label: t('待上线'), color: 'default' }, 1: { label: t('上线中'), color: 'success' } })[s] || { label: '—', color: 'default' }
}
</script>

<style scoped>
.cc {
  display: flex; flex-direction: column; height: 100%; min-height: 252px;
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  box-shadow: var(--sh-1); overflow: hidden; cursor: pointer;
  transition: transform .2s ease, box-shadow .2s ease;
}
.cc:hover { transform: translateY(-3px); box-shadow: var(--sh-2); }
.cc__cover { position: relative; height: 116px; flex-shrink: 0; background: var(--bg); }
.cc__cover :deep(.ant-image), .cc__cover :deep(.ant-image-img) { width: 100%; height: 116px; object-fit: cover; }
.cc__pub { position: absolute; top: 10px; right: 10px; }
.cc__body { flex: 1; display: flex; flex-direction: column; gap: 7px; padding: 12px 14px; min-width: 0; }
.cc__name { margin: 0; font-size: 15px; font-weight: 650; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc__desc {
  margin: 0; min-height: 34px; font-size: 12px; color: var(--ink-3); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.cc__tags { display: flex; flex-wrap: wrap; gap: 4px; min-height: 22px; }
.cc__tag { max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc__ft {
  margin-top: auto; padding-top: 8px; border-top: 1px solid var(--line-3);
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  font-size: 12px; color: var(--ink-3);
}
.cc__author, .cc__learn { display: inline-flex; align-items: center; gap: 5px; min-width: 0; }
.cc__author { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
