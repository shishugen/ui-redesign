<template>
  <div class="kpi">
    <div class="kpi__top">
      <span class="kpi__ico" :class="toneClass" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" v-html="iconPath" />
      </span>
      <span class="kpi__lab">{{ t(label) }}</span>
    </div>
    <div class="kpi__val" :class="{ 'is-null': isNull }">
      {{ isNull ? '—' : value }}<small v-if="!isNull && unit">{{ t(unit) }}</small>
    </div>
    <div class="kpi__foot" :class="{ 'is-fail': fail }">
      <span class="dot" :class="fail ? 'err' : 'ok'" />
      <span :title="t(hint)">{{ fail ? (hint || t('接口未返回数据')) : (hint || t('已同步后端数据')) }}</span>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: null },
  unit: { type: String, default: '' },
  /** 图标：course | case | model | class | teacher | student | schedule | report | notice | monitor */
  icon: { type: String, default: 'course' },
  /** 配色：pri | green | amber | violet | rose */
  tone: { type: String, default: 'pri' },
  hint: { type: String, default: '' },
  fail: { type: Boolean, default: false }
})

const isNull = computed(() => props.value === null || props.value === undefined || props.value === '')
const toneClass = computed(() => ({
  green: 'is-green', amber: 'is-amber', violet: 'is-violet', rose: 'is-rose'
})[props.tone] || '')

const ICONS = {
  course: '<rect x="3.2" y="3.6" width="13.6" height="12.8" rx="2.2" stroke="currentColor" stroke-width="1.4"/><path d="M3.2 7.4h13.6" stroke="currentColor" stroke-width="1.4"/><path d="M6.6 11h6.8M6.6 13.6h4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  case: '<path d="M3.4 6.8h5l1.5 2h6.7v6.4a1.6 1.6 0 0 1-1.6 1.6H5a1.6 1.6 0 0 1-1.6-1.6V6.8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M3.4 6.8V5.2A1.6 1.6 0 0 1 5 3.6h3.4l1.4 1.8" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  model: '<path d="M10 2.8 16.4 6v8L10 17.2 3.6 14V6L10 2.8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 10.1 16.4 6M10 10.1v7.1M10 10.1 3.6 6" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  class: '<rect x="3" y="4.2" width="14" height="12" rx="2.2" stroke="currentColor" stroke-width="1.4"/><path d="M6.4 2.8v2.6M13.6 2.8v2.6M3 8h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M6.8 11.6h2.4M11 14h2.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  teacher: '<circle cx="10" cy="7" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M4.2 16.8c0-2.8 2.6-4.8 5.8-4.8s5.8 2 5.8 4.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  student: '<circle cx="7.4" cy="7.4" r="2.6" stroke="currentColor" stroke-width="1.4"/><path d="M2.8 16.4c0-2.4 2-4.2 4.6-4.2s4.6 1.8 4.6 4.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M13.6 5.4a2.4 2.4 0 0 1 0 4.6M14.6 12.6c1.6.4 2.6 1.7 2.6 3.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  schedule: '<rect x="3" y="4.2" width="14" height="12.4" rx="2.2" stroke="currentColor" stroke-width="1.4"/><path d="M6.6 2.8v2.6M13.4 2.8v2.6M3 8.2h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M7 11.4h2v2H7zM11 11.4h2v2h-2z" fill="currentColor" opacity=".65"/>',
  report: '<path d="M5 2.8h6.6L15.4 6.6v10.6H5V2.8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.4 2.8v4h4" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.6 11h4.8M7.6 13.6h3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  notice: '<path d="M4 8.2v3.6a1.4 1.4 0 0 0 1.4 1.4h1L9.6 16V4L6.4 6.8h-1A1.4 1.4 0 0 0 4 8.2Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M13 7.4a3.6 3.6 0 0 1 0 5.2M15.2 5.2a6.8 6.8 0 0 1 0 9.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  monitor: '<path d="M2.8 15.6h14.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4.4 13V8.4M8 13V5.2M11.6 13v-3.2M15.2 13V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
}
const iconPath = computed(() => ICONS[props.icon] || ICONS.course)
</script>
