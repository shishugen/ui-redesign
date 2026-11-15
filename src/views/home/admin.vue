<template>
  <div class="page page-in">
    <PageHead
      :crumb="[t('控制台'), t('运行总览')]"
      :title="t('{greet}，{name}', { greet: greeting, name: session.displayName })"
      :sub="t('平台规模、课程构成与服务状态。所有数字都取自后端接口，接口没返回就显示「—」，不做任何补数。')"
    >
      <template #meta>
        <SourceBadge :apis="apiStatus" :updated-at="updatedAt" />
      </template>
      <template #acts>
        <a-button :loading="loading" @click="reload">
          <ReloadOutlined />{{ t('刷新') }}
        </a-button>
        <a-button type="primary" @click="router.push('/clazz')">{{ t('班级管理') }}</a-button>
      </template>
    </PageHead>

    <div v-if="note" class="note">
      <span class="dot warn" />
      <span>{{ note }}</span>
    </div>

    <div class="kpi-grid" :class="{ 'is-loading': loading }">
      <StatCard :label="t('课程总数')" :value="fmt(stats.course)" :unit="t('门')" icon="course" tone="pri" :fail="fail('课程总数')" :hint="t('课程库 · 不含案例')" />
      <StatCard :label="t('案例总数')" :value="fmt(stats.case)" :unit="t('个')" icon="case" tone="violet" :fail="fail('案例总数')" :hint="t('案例库口径')" />
      <StatCard :label="t('可用模型')" :value="fmt(stats.model)" :unit="t('个')" icon="model" tone="green" :fail="fail('模型清单') && fail('可用模型')" :hint="t('AI 服务下发')" />
      <StatCard :label="t('班级总数')" :value="fmt(stats.class)" :unit="t('个')" icon="class" tone="amber" :fail="fail('班级列表')" :hint="t('教务班级组织')" />
      <StatCard :label="t('教师人数')" :value="fmt(stats.teacher)" :unit="t('人')" icon="teacher" tone="pri" :fail="fail('教师列表')" :hint="t('教师账号')" />
      <StatCard :label="t('学员人数')" :value="fmt(stats.student)" :unit="t('人')" icon="student" tone="rose" :fail="fail('学员统计')" :hint="t('学员账号')" />
    </div>

    <div class="grid main-side">
      <div class="stack">
        <PanelCard :title="t('课程构成')" :sub="t('共 {n} 门课程', { n: courseRows.length })">
          <template #acts>
            <a-segmented v-model:value="distTab" size="small" :options="distOptions" />
          </template>
          <div v-if="bars.length" class="bars">
            <div
              v-for="(b, i) in bars" :key="b.key" class="bar-row"
              :class="{ 'is-top': i === 0 && b.count > 0, 'is-zero': !b.count }"
            >
              <span class="bar-row__lab" :title="t(b.label)">{{ t(b.label) }}</span>
              <span class="bar-row__track"><i :style="{ width: b.pct + '%' }" /></span>
              <span class="bar-row__val">{{ b.count }}</span>
            </div>
          </div>
          <div v-else class="empty">
            <div class="empty__mark">·</div>
            <div class="empty__t">{{ t('课程接口没有返回可聚合的数据') }}</div>
            <div class="empty__d">{{ failReason('课程列表') || t('rows 为空') }}</div>
          </div>
          <template #foot>
            <span class="src">{{ distTab === 'type' ? t('按后端字典 sys_course_type 归类') : t('按后端字典 sys_course_difficulty 归类') }}</span>
          </template>
        </PanelCard>

        <PanelCard :title="t('课程清单')" :sub="t('最近 {n} 门', { n: Math.min(courseRows.length, 8) })" flush>
          <template #acts>
            <span class="chip">{{ courseRows.length }}</span>
          </template>
          <div v-if="courseRows.length" class="rows">
            <div v-for="(c, i) in courseRows.slice(0, 8)" :key="c.courseId ?? i" class="row">
              <span class="row__idx">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="row__name">{{ c.courseName || c.name || t('（接口未返回课程名）') }}</span>
              <span class="tag pri">{{ typeLabel(c.type) }}</span>
              <span class="tag">{{ diffLabel(c.difficulty) }}</span>
            </div>
          </div>
          <div v-else class="empty">
            <div class="empty__mark">·</div>
            <div class="empty__t">{{ t('课程接口没有返回数据') }}</div>
            <div class="empty__d">{{ failReason('课程列表') || t('rows 为空') }}</div>
          </div>
        </PanelCard>
      </div>

      <div class="stack">
        <PanelCard :title="t('服务监控')" :sub="t('本机后端 · 实时')" flush>
          <div class="svc">
            <div v-for="m in metrics" :key="m.label" class="metric">
              <div class="metric__top">
                <span>{{ t(m.label) }}</span>
                <b>{{ m.text }}</b>
              </div>
              <div class="metric__track"><i :class="m.tone" :style="{ width: m.pct }" /></div>
            </div>
          </div>
        </PanelCard>

        <PanelCard :title="t('模型清单')" :sub="t('AI 服务下发')" flush>
          <template #acts><span class="chip">{{ modelRows.length }}</span></template>
          <div v-if="modelRows.length" class="rows">
            <div v-for="(m, i) in modelRows.slice(0, 6)" :key="i" class="row model-row">
              <span class="dot" :class="modelState(m) ? 'ok' : 'off'" />
              <span class="row__name">{{ modelName(m) }}</span>
              <span class="tag">{{ modelType(m) }}</span>
            </div>
          </div>
          <div v-else class="empty empty--sm">
            <div class="empty__t">{{ t('AI 服务没有返回模型清单') }}</div>
            <div class="empty__d">{{ failReason('模型清单') || '/gpt-api/models/list' }}</div>
          </div>
        </PanelCard>

        <PanelCard :title="t('通知公告')" flush>
          <template #acts><span class="chip">{{ noticeRows.length }}</span></template>
          <div v-if="noticeRows.length" class="rows">
            <div v-for="(n, i) in noticeRows.slice(0, 5)" :key="i" class="row notice-row">
              <span class="dot" :class="i === 0 ? 'pri' : 'off'" />
              <span class="row__name notice-name">{{ n.noticeTitle || n.title || t('（接口未返回标题字段）') }}</span>
              <span class="row__meta">{{ (n.createTime || '').slice(5, 10) }}</span>
            </div>
          </div>
          <div v-else class="empty empty--sm">
            <div class="empty__t">{{ t('公告接口未返回数据') }}</div>
            <div class="empty__d">{{ failReason('通知公告') || t('rows 为空') }}</div>
          </div>
        </PanelCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ReloadOutlined } from '@ant-design/icons-vue'
import PageHead from '@/components/PageHead.vue'
import StatCard from '@/components/StatCard.vue'
import PanelCard from '@/components/PanelCard.vue'
import SourceBadge from '@/components/SourceBadge.vue'
import { useSessionStore } from '@/stores/session'
import { useRealHome } from '@/composables/useRealHome'

const router = useRouter()
const session = useSessionStore()
const h = useRealHome()
const {
  loading, note, apiStatus, updatedAt,
  courseRows, modelRows, noticeRows, server, stats,
  typeDist, difficultyDist, fail, reload
} = h

const hour = new Date().getHours()
const greeting = computed(() => t(hour < 6 ? '凌晨' : hour < 11 ? '早上' : hour < 13 ? '中午' : hour < 18 ? '下午' : '晚上'))

const fmt = v => (v === null || v === undefined ? null : Number(v).toLocaleString())
const failReason = name => apiStatus.value.find(a => a.name === name && !a.ok)?.msg || ''

const distTab = ref('type')
const distOptions = computed(() => [{ label: t('按类型'), value: 'type' }, { label: t('按难度'), value: 'difficulty' }])

function toBars(list) {
  if (!list.length) return []
  const max = Math.max(...list.map(x => x.count), 1)
  return list.map(x => ({ ...x, pct: Math.round((x.count / max) * 100) }))
}
const bars = computed(() => toBars(distTab.value === 'type' ? typeDist.value : difficultyDist.value))

const typeMap = computed(() => Object.fromEntries((h.dictType.value || []).map(d => [String(d.dictValue), d.dictLabel])))
const diffMap = computed(() => Object.fromEntries((h.dictDifficulty.value || []).map(d => [String(d.dictValue), d.dictLabel])))
const typeLabel = v => (v === null || v === undefined || v === '' ? t('未分类') : (typeMap.value[String(v)] || String(v)))
const diffLabel = v => (v === null || v === undefined || v === '' ? t('未标注') : (diffMap.value[String(v)] || String(v)))

const modelName = m => m.model_name || m.name || m.modelName || m.model_id || t('未命名字段')
const modelType = m => m.model_type || m.type || m.provider || '—'
const modelState = m => {
  const s = m.status ?? m.state ?? m.enabled
  if (s === undefined || s === null) return true
  return !(s === 0 || s === '0' || s === false || s === 'disabled')
}

/** 服务监控：值原样读接口，读不到就 —，进度条按百分比截断 */
function serverNum(path) {
  const v = path.split('.').reduce((o, k) => (o == null ? null : o[k]), server.value)
  if (v === null || v === undefined || v === '') return null
  return typeof v === 'number' ? v : Number(v)
}
const metrics = computed(() => [
  { label: t('CPU 使用率'), key: 'cpu.used', tone: '' },
  { label: t('内存使用率'), key: 'mem.usage', tone: 'warn' },
  { label: t('JVM 使用率'), key: 'jvm.usage', tone: 'ok' }
].map(m => {
  const n = serverNum(m.key)
  const ok = Number.isFinite(n)
  return {
    ...m,
    text: ok ? `${n.toFixed(1)}%` : '—',
    pct: ok ? `${Math.min(Math.max(n, 0), 100)}%` : '0%'
  }
}))

onMounted(() => { if (!h.loaded.value) reload() })
</script>

<style lang="scss" scoped>
.page-hd { align-items: flex-start; }

/* 服务监控 */
.svc { padding: 18px; display: flex; flex-direction: column; gap: 16px; }
.metric__top {
  display: flex; align-items: baseline; justify-content: space-between;
  font-size: 12.5px; color: var(--ink-3); margin-bottom: 7px;
}
.metric__top b {
  font-size: 13.5px; font-weight: 600; color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.metric__track { height: 6px; background: var(--line-3); border-radius: 99px; overflow: hidden; }
.metric__track i {
  display: block; height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #6E8BFF, var(--pri));
  transition: width .6s cubic-bezier(.22, .7, .2, 1);
}
.metric__track i.warn { background: linear-gradient(90deg, #FFC078, var(--warn)); }
.metric__track i.ok { background: linear-gradient(90deg, #4AD3A6, var(--ok)); }

/* 模型列表 */
.model-row { gap: 10px; }
.model-row .row__name { font-size: 13px; }

/* 公告：标题可能长，允许两行 */
.notice-row { align-items: flex-start; }
.notice-name { white-space: normal; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

:deep(.ant-segmented-item-label) { padding: 0 10px; font-size: 12.5px; }
</style>
