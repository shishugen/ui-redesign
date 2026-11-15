<template>
  <div class="cal">
    <div class="cal__head">
      <span class="cal__m">{{ monthLabel }}</span>
      <span class="cal__legend"><i class="cal__key" /> {{ t('有排课') }}</span>
    </div>
    <div class="cal__grid">
      <div v-for="w in weekdays" :key="w" class="cal__wd">{{ t(w) }}</div>
      <div v-for="(c, i) in cells" :key="i" class="cal__d" :class="c.cls">
        <span>{{ c.text }}</span>
        <i v-if="c.has" class="cal__mark" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { computed } from 'vue'

const props = defineProps({
  dates: { type: Array, default: () => [] }
})

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const now = new Date()
const year = now.getFullYear()
const month = now.getMonth()
const todayNum = now.getDate()
const daysInMonth = new Date(year, month + 1, 0).getDate()
const offset = (new Date(year, month, 1).getDay() + 6) % 7 // 周一开头

const monthLabel = computed(() => t('{year} 年 {month} 月', { year, month: month + 1 }))

const cells = computed(() => {
  const out = []
  for (let i = 0; i < offset; i++) out.push({ text: '', cls: 'is-out', has: false })
  for (let n = 1; n <= daysInMonth; n++) {
    const has = props.dates.includes(n)
    out.push({
      text: n,
      cls: `${n === todayNum ? 'is-today' : ''} ${has ? 'is-has' : ''}`.trim(),
      has
    })
  }
  while (out.length % 7) out.push({ text: '', cls: 'is-out', has: false })
  return out
})
</script>

<style lang="scss" scoped>
.cal { padding: 14px 16px 16px; }
.cal__head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 10px;
}
.cal__m { font-size: 13px; font-weight: 600; color: var(--ink); }
.cal__legend {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; color: var(--ink-4);
}
.cal__key { width: 6px; height: 6px; border-radius: 50%; background: var(--pri); }

.cal__grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.cal__wd {
  text-align: center; font-size: 11px; color: var(--ink-4);
  padding: 4px 0 6px;
}
.cal__d {
  position: relative; aspect-ratio: 1 / 1;
  display: grid; place-items: center;
  border-radius: var(--r-xs);
  font-size: 12px; color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  transition: background .14s ease;
}
.cal__d:hover { background: var(--bg); }
.cal__d.is-out { color: transparent; }
.cal__d.is-has { background: var(--pri-50); color: var(--pri); font-weight: 600; }
.cal__d.is-today {
  background: var(--pri); color: #fff; font-weight: 650;
  box-shadow: 0 4px 10px rgba(47, 84, 235, .28);
}
.cal__mark {
  position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
  width: 4px; height: 4px; border-radius: 50%; background: var(--pri);
}
.cal__d.is-today .cal__mark { background: rgba(255, 255, 255, .9); }
</style>
