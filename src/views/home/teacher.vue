<template>
  <div class="page page-in">
    <PageHead
      :crumb="[t('控制台'), t('教师工作台')]"
      :title="t('{greet}，{name}', { greet: greeting, name: session.displayName })"
      :sub="t('{today} · 今天的排课、班级、实验报告与公告都读后端真实接口，没有返回就空着。', { today })"
    >
      <template #meta>
        <SourceBadge :apis="apiStatus" :updated-at="updatedAt" />
      </template>
      <template #acts>
        <a-button :loading="loading" @click="reload"><ReloadOutlined />{{ t('刷新') }}</a-button>
      </template>
    </PageHead>

    <div v-if="note" class="note">
      <span class="dot warn" />
      <span>{{ note }}</span>
    </div>

    <div class="kpi-grid" :class="{ 'is-loading': loading }">
      <StatCard :label="t('平台课程')" :value="fmt(stats.course)" :unit="t('门')" icon="course" tone="pri" :fail="fail('课程总数')" :hint="t('课程库 · 不含案例')" />
      <StatCard :label="t('今日排课')" :value="fmt(stats.schedule)" :unit="t('条')" icon="schedule" tone="green" :fail="fail('个人排课') && fail('班级排课')" :hint="t('按今日课表统计')" />
      <StatCard :label="t('班级总数')" :value="fmt(stats.class)" :unit="t('个')" icon="class" tone="amber" :fail="fail('班级列表')" :hint="t('教务班级组织')" />
      <StatCard :label="t('实验报告')" :value="fmt(stats.report)" :unit="t('份')" icon="report" tone="violet" :fail="fail('实验报告')" :hint="t('实验报告总数')" />
    </div>

    <div class="grid main-side">
      <div class="stack">
        <PanelCard :title="t('今日排课 · {today}', { today })" :sub="t('{n} 条', { n: scheduleRows.length })" flush>
          <ScheduleList :rows="scheduleRows" :today="today" />
        </PanelCard>

        <PanelCard :title="t('我的班级')" :sub="t('{n} 个', { n: classRows.length })" flush>
          <div v-if="classRows.length" class="rows">
            <div v-for="(c, i) in classRows.slice(0, 8)" :key="i" class="row">
              <span class="row__idx">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="row__name">{{ c.classesName || c.className || c.deptName || c.name || t('（接口未返回名称）') }}</span>
              <span v-if="c.studentCount !== undefined && c.studentCount !== null" class="tag">{{ c.studentCount }} {{ t('人') }}</span>
            </div>
          </div>
          <div v-else class="empty">
            <div class="empty__mark">·</div>
            <div class="empty__t">{{ t('班级接口未返回数据') }}</div>
            <div class="empty__d">{{ t('listAllClasses · rows 为空') }}</div>
          </div>
        </PanelCard>
      </div>

      <div class="stack">
        <PanelCard :title="t('课表日历')" :sub="t('按真实排课日期标注')" flush>
          <CalendarPanel :dates="scheduleDays" />
          <template #foot><span class="src">{{ t('本月') }} {{ scheduleDays.length }} {{ t('天有排课') }}</span></template>
        </PanelCard>

        <PanelCard :title="t('实验报告')" :sub="t('{n} 份', { n: reportRows.length })" flush>
          <div v-if="reportRows.length" class="rows">
            <div v-for="(r, i) in reportRows.slice(0, 5)" :key="i" class="row">
              <span class="dot" :class="i === 0 ? 'pri' : 'off'" />
              <span class="row__name">{{ r.reportName || r.title || r.courseName || t('（接口未返回名称）') }}</span>
              <span class="row__meta">{{ (r.createTime || '').slice(5, 10) }}</span>
            </div>
          </div>
          <div v-else class="empty empty--sm">
            <div class="empty__t">{{ t('报告接口未返回数据') }}</div>
            <div class="empty__d">{{ failReason('实验报告') || t('rows 为空') }}</div>
          </div>
        </PanelCard>

        <PanelCard :title="t('平台通知')" flush>
          <div v-if="noticeRows.length" class="rows">
            <div v-for="(n, i) in noticeRows.slice(0, 4)" :key="i" class="row notice-row">
              <span class="dot" :class="i === 0 ? 'pri' : 'off'" />
              <span class="row__name notice-name">{{ n.noticeTitle || n.title || t('（接口未返回标题字段）') }}</span>
            </div>
          </div>
          <div v-else class="empty empty--sm"><div class="empty__t">{{ t('公告接口未返回数据') }}</div></div>
        </PanelCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { computed, onMounted } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import PageHead from '@/components/PageHead.vue'
import StatCard from '@/components/StatCard.vue'
import PanelCard from '@/components/PanelCard.vue'
import SourceBadge from '@/components/SourceBadge.vue'
import CalendarPanel from '@/views/home/components/ScheduleCalendar/index.vue'
import ScheduleList from '@/components/ScheduleList.vue'
import { useSessionStore } from '@/stores/session'
import { useRealHome } from '@/composables/useRealHome'

const session = useSessionStore()
const h = useRealHome()
const {
  loading, note, scheduleRows, noticeRows, reportRows, classRows,
  stats, apiStatus, updatedAt, fail, reload, today
} = h

const hour = new Date().getHours()
const greeting = computed(() => t(hour < 6 ? '凌晨' : hour < 11 ? '早上' : hour < 13 ? '中午' : hour < 18 ? '下午' : '晚上'))

const fmt = v => (v === null || v === undefined ? null : Number(v).toLocaleString())
const failReason = name => apiStatus.value.find(a => a.name === name && !a.ok)?.msg || ''

const scheduleDays = computed(() => {
  const month = Number(today.split('-')[1])
  const out = []
  scheduleRows.value.forEach(s => {
    const v = s.beginTime || s.startTime
    if (!v) return
    const d = new Date(String(v).replace(/-/g, '/'))
    if (!isNaN(d.getTime()) && d.getMonth() + 1 === month) out.push(d.getDate())
  })
  return [...new Set(out)]
})

onMounted(() => { if (!h.loaded.value) reload() })
</script>

<style lang="scss" scoped>
.notice-row { align-items: flex-start; }
.notice-name { white-space: normal; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
</style>
