<template>
  <div class="dtrp">
    <div v-for="(day, dayIndex) in scheduleDates" :key="dayIndex" class="dtrp__day">
      <div class="dtrp__day-hd">
        <a-tag color="blue">{{ t('第 {n} 天', { n: dayIndex + 1 }) }}</a-tag>
        <a-date-picker :value="day.scheduleDate" value-format="YYYY-MM-DD"
                       :disabled-date="disabledDate" :placeholder="t('请选择日期')"
                       :aria-label="t('第 {n} 天实验日期', { n: dayIndex + 1 })"
                       @update:value="(v) => emit('date-change', dayIndex, v)" />
      </div>

      <div class="dtrp__ranges">
        <div class="dtrp__tools">
          <a-button type="dashed" size="small" @click="emit('add-range', dayIndex)">
            <template #icon><PlusOutlined /></template>{{ t('添加时段') }}
          </a-button>
          <span class="dtrp__tip">{{ t('（时间段间隔建议大于 10 分钟）') }}</span>
        </div>

        <div v-for="(range, rangeIndex) in day.timeRanges" :key="rangeIndex" class="dtrp__row">
          <a-select :value="range.startHM" :options="timeOptions" show-search allow-clear
                    :placeholder="t('开始时间')" style="width: 108px"
                    :aria-label="t('第 {n} 个时段开始时间', { n: rangeIndex + 1 })"
                    @update:value="(v) => emit('range-change', dayIndex, rangeIndex, 'startHM', v)" />
          <span class="dtrp__sep">~</span>
          <a-select :value="range.endHM" :options="filteredEndTimeOptions(range.startHM)" show-search allow-clear
                    :placeholder="t('结束时间')" style="width: 108px"
                    :aria-label="t('第 {n} 个时段结束时间', { n: rangeIndex + 1 })"
                    @update:value="(v) => emit('range-change', dayIndex, rangeIndex, 'endHM', v)" />
          <span class="dtrp__duration">{{ t('（{v}）', { v: calcDuration(range.startHM, range.endHM) }) }}</span>
          <a-tag v-if="stateMap[range.state]" :color="stateMap[range.state].color">
            {{ t(stateMap[range.state].text) }}
          </a-tag>
          <a-button type="text" danger size="small" :disabled="!range.itemId || range.state != 1"
                    :aria-label="t('结束第 {n} 个时段', { n: rangeIndex + 1 })"
                    @click="emit('end-range', range)">
            <template #icon><StopOutlined /></template>
          </a-button>
          <a-button type="text" danger size="small" :disabled="day.timeRanges.length <= 1"
                    :aria-label="t('删除第 {n} 个时段', { n: rangeIndex + 1 })"
                    @click="emit('remove-range', dayIndex, rangeIndex)">
            <template #icon><DeleteOutlined /></template>
          </a-button>
        </div>
      </div>

      <div class="dtrp__day-acts">
        <a-button type="link" size="small" :aria-label="t('复制第 {n} 天', { n: dayIndex + 1 })"
                  @click="emit('copy-day', day)">
          <template #icon><CopyOutlined /></template>{{ t('复制') }}
        </a-button>
        <a-button type="link" danger size="small" :disabled="scheduleDates.length <= 1"
                  :aria-label="t('删除第 {n} 天', { n: dayIndex + 1 })"
                  @click="emit('remove-day', dayIndex)">
          <template #icon><DeleteOutlined /></template>{{ t('删除') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup name="DateTimeRangePicker">
import { computed } from 'vue'
import { t } from '@/i18n'
import { CopyOutlined, DeleteOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons-vue'

// 与旧页的差异：旧组件直接 mutate props.scheduleDates 并通过 4 个 callback* 函数 prop 回传，
// 违反单向数据流。这里改为纯受控组件 + 标准 emits，由父组件改自己的数组（见 records/P153.md §4）。
const props = defineProps({
  scheduleDates: { type: Array, default: () => [] },
  minuteStep: { type: Number, default: 30 },
  stateMap: { type: Object, default: () => ({}) }
})
const emit = defineEmits([
  'date-change', 'range-change', 'add-range', 'remove-range',
  'end-range', 'copy-day', 'remove-day'
])

const disabledDate = (current) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return current && current < today
}
const timeOptions = computed(() => {
  const list = []
  const step = Math.max(1, props.minuteStep || 30)
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      list.push({ label: v, value: v })
    }
  }
  return list
})
const filteredEndTimeOptions = (begin) => {
  const base = begin || '00:00'
  return timeOptions.value.filter(x => x.value > base)
}
const timeToMinutes = (v) => {
  if (!v) return 0
  const [h, m] = String(v).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const calcDuration = (start, end) => {
  const diff = timeToMinutes(end) - timeToMinutes(start)
  if (!start || !end || diff <= 0) return t('0分钟')
  const h = Math.floor(diff / 60), m = diff % 60
  if (h && m) return t('{h}小时{m}分钟', { h, m })
  if (h) return t('{h}小时', { h })
  return t('{m}分钟', { m })
}
</script>

<style scoped>
.dtrp { display: flex; flex-direction: column; gap: 10px; }
.dtrp__day { display: flex; gap: 12px; align-items: flex-start; padding: 10px;
  border: 1px solid var(--line); border-radius: var(--r); background: var(--bg-soft); }
.dtrp__day-hd { display: flex; align-items: center; gap: 6px; flex: 0 0 210px; }
.dtrp__ranges { flex: 1; min-width: 0; }
.dtrp__tools { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.dtrp__tip, .dtrp__duration { font-size: 11.5px; color: var(--ink-4); white-space: nowrap; }
.dtrp__row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.dtrp__sep { color: var(--ink-4); }
.dtrp__day-acts { flex: 0 0 auto; display: flex; flex-direction: column; }
@media (max-width: 900px) {
  .dtrp__day { flex-direction: column; }
  .dtrp__day-hd { flex: none; }
  .dtrp__day-acts { flex-direction: row; }
}
</style>
