<template>
  <div v-if="rows.length" class="sched">
    <div v-for="(s, i) in rows" :key="i" class="sched__row">
      <div class="sched__time">
        <b>{{ short(s.beginTime) }}</b>
        <i />
        <span>{{ short(s.actualEndTime || s.endTime) }}</span>
      </div>
      <div class="sched__body">
        <div class="sched__top">
          <span class="sched__name">{{ courseName(s) }}</span>
          <span class="tag" :class="live(s) ? 'ok' : 'pri'">
            <span v-if="live(s)" class="dot ok" />{{ live(s) ? t('进行中') : t('已排课') }}
          </span>
        </div>
        <div class="sched__meta">
          <span>{{ s.scheduleUserName || s.teacherName || t('教师未返回') }}</span>
          <i>·</i>
          <span>{{ s.classesName || s.className || t('班级未返回') }}</span>
        </div>
      </div>
      <button class="sched__raw" :title="t('查看接口返回的原始字段')" @click="showRaw(s)">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6.2 3.4H4.6A1.6 1.6 0 0 0 3 5v6a1.6 1.6 0 0 0 1.6 1.6h1.6M9.8 3.4h1.6A1.6 1.6 0 0 1 13 5v6a1.6 1.6 0 0 1-1.6 1.6H9.8M6.8 6.6 5.4 8l1.4 1.4M9.2 6.6 10.6 8 9.2 9.4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
  <div v-else class="empty">
    <div class="empty__mark">·</div>
    <div class="empty__t">{{ t('今天没有排课记录') }}</div>
    <div class="empty__d">getScheduleByDay · searchDate {{ today }}</div>
  </div>

  <a-modal v-model:open="rawOpen" :title="t('接口返回的原始字段')" :footer="null" width="620">
    <pre class="raw">{{ rawText }}</pre>
  </a-modal>
</template>

<script setup>
import { t } from '@/i18n'
import { ref } from 'vue'

defineProps({
  rows: { type: Array, default: () => [] },
  today: { type: String, default: '' }
})

const rawOpen = ref(false)
const rawText = ref('')

const courseName = s => s.courseName || s.course?.courseName || t('（接口未返回课程名）')
const live = s => Number(s.currState) === 1
const short = v => {
  if (!v) return '--:--'
  const str = String(v).replace('T', ' ')
  return str.length > 11 ? str.slice(11, 16) : str.slice(0, 5)
}

function showRaw(s) {
  rawText.value = JSON.stringify(s, null, 2)
  rawOpen.value = true
}
</script>

<style lang="scss" scoped>
.sched { display: flex; flex-direction: column; }
.sched__row {
  display: grid; grid-template-columns: 62px minmax(0, 1fr) 26px;
  gap: 14px; align-items: center;
  padding: 13px 18px; border-bottom: 1px solid var(--line-3);
  transition: background .14s ease;
}
.sched__row:last-child { border-bottom: 0; }
.sched__row:hover { background: var(--bg-soft); }

.sched__time {
  display: flex; flex-direction: column; align-items: flex-start;
  line-height: 1.2; position: relative; padding-left: 12px;
}
.sched__time::before {
  content: ""; position: absolute; left: 0; top: 3px; bottom: 3px; width: 3px;
  border-radius: 99px; background: #B9C8FB;
}
.sched__row:hover .sched__time::before { background: var(--pri); }
.sched__time b {
  font-size: 14px; font-weight: 650; color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.sched__time span { font-size: 12px; color: var(--ink-4); font-variant-numeric: tabular-nums; margin-top: 2px; }
.sched__time i { display: none; }

.sched__body { min-width: 0; }
.sched__top { display: flex; align-items: center; gap: 8px; }
.sched__name {
  font-size: 13.5px; font-weight: 550; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.sched__meta {
  margin-top: 4px; font-size: 12px; color: var(--ink-3);
  display: flex; gap: 6px; align-items: center;
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.sched__meta i { color: var(--line-2); font-style: normal; }

.sched__raw {
  width: 26px; height: 26px; display: grid; place-items: center;
  border: 1px solid transparent; background: transparent; border-radius: 6px;
  color: var(--ink-4); cursor: pointer; opacity: 0; transition: .14s ease;
}
.sched__row:hover .sched__raw { opacity: 1; }
.sched__raw:hover { color: var(--pri); border-color: var(--pri-200); background: var(--pri-50); }
.sched__raw svg { width: 15px; height: 15px; }

.raw {
  max-height: 440px; overflow: auto; margin: 0;
  background: var(--bg-soft); border: 1px solid var(--line); border-radius: var(--r);
  padding: 14px; font-family: var(--mono); font-size: 12px; line-height: 1.7;
  color: var(--ink-2); white-space: pre-wrap; word-break: break-all;
}
</style>
