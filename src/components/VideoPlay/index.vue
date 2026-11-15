<template>
  <div class="vp">
    <longze-video-play
      ref="videoRef"
      v-bind="options"
      :poster="videoPoster"
      @play="onPlay"
      @pause="onPause"
      @timeupdate="onTimeupdate"
      @canplay="onCanplay"
      @error="onError"
      @ended="onEnded"
    />
  </div>
</template>

<script setup name="VideoPlay">
import { computed, ref } from 'vue'

const props = defineProps({
  // 播放参数
  videoOptions: { type: Object, default: () => ({}) },
  // 封面图
  videoPoster: { type: String, default: '' },
  playCallback: { type: Function, default: () => {} },
  pauseCallback: { type: Function, default: () => {} },
  currentTimeCallback: { type: Function, default: () => {} },
  endedCallback: { type: Function, default: () => {} }
})

// 与旧页保持同一套默认值，外部传参覆盖
const options = computed(() => ({
  width: '100%',
  height: '100%',
  color: '#2F54EB',
  title: '',
  src: '',
  type: 'video/mp4',
  muted: false,
  webFullScreen: false,
  currentTime: 0,
  speed: true,
  speedRate: ['0.75', '1.0', '1.25', '1.5', '2.0'],
  autoPlay: false,
  loop: false,
  mirror: false,
  ligthOff: false,
  volume: 0.3,
  control: true,
  controlBtns: [
    'audioTrack', 'quality', 'speedRate', 'volume',
    'setting', 'pip', 'pageFullScreen', 'fullScreen'
  ],
  ...props.videoOptions
}))

const videoRef = ref()
const onPlay = () => props.playCallback()
const onPause = () => props.pauseCallback()
const onTimeupdate = (ev) => props.currentTimeCallback(ev?.target?.currentTime ?? 0)
const onCanplay = () => {}
const onEnded = () => props.endedCallback()
const onError = () => { /* 播放失败由播放器自身提示 */ }
</script>

<style scoped>
.vp { width: 100%; height: 100%; }
</style>
