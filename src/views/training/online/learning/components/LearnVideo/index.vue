<template>
  <div class="video">
    <VideoPlayer
      v-if="fileId"
      :video-options="videoOptions"
      :play-callback="playCallback"
      :pause-callback="pauseCallback"
      :current-time-callback="currentTimeCallback"
    />
    <div v-else class="video__empty" role="status">{{ t('未选择视频') }}</div>
  </div>
</template>

<script setup name="LearnVideo">
// 视频学习：公共 VideoPlay 的薄包装，props 契约与旧页完全一致
// （options 里的 width/height/src/currentTime 由父面板按可用区域传进来）。
import { computed } from 'vue'
import VideoPlayer from '@/components/VideoPlay/index.vue'
import { t } from '@/i18n'

const props = defineProps({
  fileId: { type: String, default: '' },
  options: { type: Object, default: () => ({}) },
  playCallback: { type: Function, default: () => {} },
  pauseCallback: { type: Function, default: () => {} },
  currentTimeCallback: { type: Function, default: () => {} },
  // 旧页未声明，父组件也没传；补默认值只为让 props 表完整
  endedCallback: { type: Function, default: () => {} }
})

const videoOptions = computed(() => Object.assign({
  width: '100%',
  height: '100%',
  src: ''
}, props.options))
</script>

<style scoped>
.video { width: 100%; height: 100%; background: var(--bg); }
.video__empty {
  padding: 40px 16px; text-align: center;
  font-size: 12.5px; color: var(--ink-4);
}
</style>
