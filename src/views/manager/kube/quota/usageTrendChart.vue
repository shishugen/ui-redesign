<template>
  <div class="usage-trend">
    <div v-if="title" class="trend-head">
      <span class="trend-title">{{ title }}</span>
      <span v-if="totalMinutes" class="trend-total">{{ t('合计') }} {{ formatMinutes(totalMinutes) }}</span>
    </div>

    <!-- 每个池各用了多少：堆叠柱只看得出高低和占比，「本地容器一共 3 小时」这种数
         得单列一行才读得出来。数字与下面那根柱同源（都是 props.series），不会两边对不上 -->
    <div v-if="poolTotals.length" class="trend-pools">
      <span v-for="item in poolTotals" :key="item.code" class="tp-item">
        <a-tag :bordered="false" :color="poolColor(item.code)">{{ poolLabel(item.code) }}</a-tag>
        <b>{{ formatMinutes(item.minutes) }}</b>
      </span>
    </div>

    <a-spin :spinning="loading">
      <!-- 日表还一条数据都没有时坚决不画图：画一排贴着 0 的柱，
           看的人读到的是「这群人这些天没用过机器」，而真相是「这套统计还没上线」 -->
      <a-empty
        v-if="!plot"
        :image="simpleEmpty"
        :description="emptyDescription"
        class="trend-empty" />
      <div v-else :ref="setHost" class="trend-canvas" :style="{ height: `${height}px` }"></div>
    </a-spin>

    <div v-if="hint" class="trend-hint">{{ hint }}</div>
  </div>
</template>

<script setup>
/**
 * 用量趋势图：一个统计窗口内，每天每个额度池各消耗了多少分钟。
 * <p>
 * 三处页面共用（角色用量、班级用量、学生「我的资源」），因为它们要回答的是同一个问题，
 * 差的只是「这批人是谁」—— 那件事由调用方的接口决定，图只认传进来的序列。
 * <p>
 * 画法是一张**按天堆叠的柱状图**：一根柱的高度就是这一天的总量，柱内按池分色分段。
 * <p>
 * 两个刻意的做法：
 * <ul>
 *   <li>**横轴从有数据那天起画**：窗口起点早于日表起始日的那一段根本不进坐标，
 *       免得左边一大片空白被读成「那几天没用」；</li>
 *   <li>**窗口内的日子按 0 画**：日表只在真有消耗时写行，所以「没有行」既可能是那天没用、
 *       也可能是计量任务停过。前者画 0 是对的，后者由下面那行提示明说
 *       （coveredDays 比窗口天数少就是断档），不靠图上补一串假 0 蒙过去。</li>
 * </ul>
 */
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { Empty } from 'ant-design-vue'
import * as echarts from 'echarts/core'
import { TooltipComponent, LegendComponent, GridComponent, DataZoomComponent } from 'echarts/components'
import { BarChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { t, locale } from '@/i18n'
import { formatMinutes, poolColor } from './quotaUtils'
import { daySpan, loadPoolNameMap } from './usageWindow'

echarts.use([TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, BarChart, CanvasRenderer])

const props = defineProps({
  /** 后端 UsageDailyVo 的元数据：{fromDay, today, earliestDay, coveredDays, days} */
  meta: { type: Object, default: null },
  /** 后端 series：[{day, resourceType, minutes}] */
  series: { type: Array, default: () => [] },
  /** 池 code → 中文名，调用方从自己的数据行里给；没有就原样显示 code */
  poolNames: { type: Object, default: () => ({}) },
  title: { type: String, default: '' },
  /** useUsageWindow().windowHint：数的是哪几天、完不完整 */
  hint: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  height: { type: Number, default: 260 }
})

const simpleEmpty = Empty.PRESENTED_IMAGE_SIMPLE

const host = ref(null)
let chart = null

function setHost(el) {
  host.value = el
}

/**
 * 池名兜底：调用方那份是从自己的数据行里推的，可能比序列晚到；这时用后端清单，
 * 不把 local 这种原始 code 摆给用户看。拉失败就维持原行为（显示调用方给的或 code），
 * 不至于为一个图的标题去弹错误、把整页的数都遮住。
 */
const fallbackPoolNames = ref({})
loadPoolNameMap()
  .then((map) => {
    fallbackPoolNames.value = map
  })
  .catch(() => {})

/** 日粒度表里的日期字符串固定 yyyy-MM-dd，定长，字典序就是时间序，可以直接比 */
function plotStart(meta) {
  if (!meta.fromDay) {
    return ''
  }
  if (!meta.earliestDay) {
    return meta.fromDay
  }
  return meta.earliestDay > meta.fromDay ? meta.earliestDay : meta.fromDay
}

/**
 * 把坐标与序列一次算好：坐标 = [有数据的第一天, 今天]，序列按池拆。
 * 返回 null 表示这张图不该画（还没有任何日粒度数据）。
 */
const plot = computed(() => {
  const meta = props.meta
  if (!meta || !meta.earliestDay) {
    return null
  }
  const start = plotStart(meta)
  const count = daySpan(start, meta.today)
  if (!count) {
    return null
  }
  const days = new Array(count)
  // 从 start 逐日 +1 生成，不用乘除算毫秒：跨夏令时/闰秒都不会错位一天
  const base = new Date(`${start}T00:00:00`)
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000)
    days[i] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const index = new Map(days.map((d, i) => [d, i]))

  const pools = []
  const byPool = new Map()
  for (const point of props.series) {
    const slot = index.get(point.day)
    if (slot === undefined) {
      // 序列里有坐标外的日子只有两种可能：窗口起点之后又早于今天被算漏，或脏数据。
      // 宁可丢掉这个点，也不把坐标拉长到一个不该出现的日期上
      continue
    }
    const code = point.resourceType || ''
    if (!byPool.has(code)) {
      byPool.set(code, new Array(count).fill(0))
      pools.push(code)
    }
    byPool.get(code)[slot] += Number(point.minutes || 0)
  }
  return {
    days,
    pools,
    series: pools.map((code) => ({ code, data: byPool.get(code) }))
  }
})

const totalMinutes = computed(() =>
  (props.series || []).reduce((sum, point) => sum + Number(point.minutes || 0), 0)
)

/**
 * 按池合计，用的就是画柱那份 series —— 不再从后端另要一组合计数：
 * 一个窗口两套算法，迟早会算出两个不一样的数（明细行的「窗口内已用」来自同一张日表的
 * 另一条聚合语句，两边对不上时谁都不知道该信哪个）。
 * 排序按用量降序：读的人第一眼要落在用得最多的那个池上。
 */
const poolTotals = computed(() => {
  const totals = new Map()
  for (const point of props.series || []) {
    const code = point.resourceType || ''
    totals.set(code, (totals.get(code) || 0) + Number(point.minutes || 0))
  }
  return [...totals.entries()]
    .filter(([, minutes]) => minutes > 0)
    .map(([code, minutes]) => ({ code, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
})

/** 有数据但这一批人窗口内确实没用过：这时 0 是真话，和上面「还没上线」是两件事 */
const emptyDescription = computed(() => {
  const meta = props.meta
  if (!meta) {
    return t('还没有取统计窗口的数据')
  }
  if (!meta.earliestDay) {
    return t('日粒度统计还没有任何数据（这套统计上线后，每产生一段消耗才会有一天）')
  }
  return t('这个窗口内没有任何日粒度消耗')
})

function poolLabel(code) {
  return props.poolNames[code] || fallbackPoolNames.value[code] || code || t('未标注池')
}

/**
 * 柱色沿用表格里那个标签色，图与表看着是同一件事。
 * key 是后端 KubeResourceTypeEnum 的池码（与课程侧 image_source 同一串值）
 */
const POOL_BAR_COLOR = {
  scnet: '#1677ff',
  notebook: '#722ed1',
  local: '#52c41a'
}

function barColor(code) {
  if (POOL_BAR_COLOR[code]) {
    return POOL_BAR_COLOR[code]
  }
  // 新池在后端枚举里加了、前端这份表还没跟上时，退到标签色那套映射，不要整根柱无色
  const fallback = { blue: '#1677ff', purple: '#722ed1', green: '#52c41a' }
  return fallback[poolColor(code)] || '#8c8c8c'
}

/**
 * y 轴刻度缩写：分钟过万写成「1.2万」，否则原样数字。
 * <p>
 * 只改刻度的写法，不换单位也不做换算 —— 日表存的是分钟、对账语句比的也是分钟，
 * 刻度一旦换成小时，就会有人拿图上的数去对卡片上的「5小时43分」，两套口径迟早对不平。
 */
function axisMinutes(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || Math.abs(n) < 10000) {
    return String(value)
  }
  const wan = n / 10000
  // 整万就不带小数点；1.25万 这种读三位小数比读一位更累
  return `${Number.isInteger(wan) ? wan : wan.toFixed(1)}${t('万')}`
}

function buildOption() {
  const p = plot.value
  if (!p) {
    return null
  }
  const long = p.days.length > 60
  return {
    grid: { left: 8, right: 16, top: 32, bottom: long ? 42 : 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      // 只列真有消耗的池：三个池天天挂着「0 分」会把「这个池没动」冲成一片噪声
      formatter: (params) => {
        const rows = (params || []).filter((item) => item.value > 0)
        const title = params && params.length ? params[0].axisValue : ''
        if (!rows.length) {
          return `${title}<br/>${t('这一天没有消耗')}`
        }
        const rows2 = rows.map((item) => `${item.marker}${item.seriesName}：${formatMinutes(item.value)}`)
        // 堆叠柱的柱高就是总量，鼠标停在柱子上却看不到那个高度对应的数，得补一行合计；
        // 只有一个池时柱高就是它自己，再写一遍纯属噪声
        if (rows.length > 1) {
          const total = rows.reduce((sum, item) => sum + Number(item.value || 0), 0)
          rows2.push(`${t('合计')}：${formatMinutes(total)}`)
        }
        return [title, ...rows2].join('<br/>')
      }
    },
    legend: { top: 0, data: p.pools.map(poolLabel) },
    xAxis: {
      type: 'category',
      data: p.days,
      // 近一年有 365 个刻度，去年份留 MM-DD；interval 交给 echarts 自动抽稀
      axisLabel: { formatter: (value) => String(value).slice(5) },
      axisTick: { alignWithLabel: true }
    },
    yAxis: { type: 'value', name: t('分钟'), minInterval: 1, axisLabel: { formatter: axisMinutes } },
    // 长窗口默认缩到最近 30 天，否则三百多根柱挤在一个屏幕上只剩一片密实，读不出数
    dataZoom: long
      ? [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8, startValue: p.days[Math.max(0, p.days.length - 30)] }]
      : [{ type: 'inside' }],
    series: p.series.map((item) => ({
      name: poolLabel(item.code),
      type: 'bar',
      stack: 'total',
      data: item.data,
      // 堆叠：一根柱的高度就是当天总量，柱内按池分色分段。并列柱在近一年会有三百多根×池数，
      // 又看不出总量；只画合计一根又会丢掉「哪个池用掉的」这一维，所以选堆叠。
      // 0 的那几天本来就不会有柱（日表只在真有消耗时写行），不需要折线那套 connectNulls 顾虑；
      // 段与段之间描一条白缝，同色相邻或色差不够时也能看出边界。
      barMaxWidth: 56,
      itemStyle: { color: barColor(item.code), borderColor: '#fff', borderWidth: 1 }
    }))
  }
}

function render() {
  const option = buildOption()
  if (!option || !host.value) {
    // 图不该出现时把已画的实例释放掉，否则 v-if 把画布摘了、echarts 还攥着旧尺寸
    if (chart) {
      chart.dispose()
      chart = null
    }
    return
  }
  if (!chart) {
    chart = echarts.init(host.value)
  }
  chart.setOption(option, true)
}

function handleResize() {
  if (chart) {
    chart.resize()
  }
}

// 画布是 v-if 控制的，元素出现要在 nextTick 之后，所以这里等一拍再 init
watch(
  plot,
  async () => {
    await nextTick()
    render()
  },
  { immediate: true }
)

watch(() => props.height, render)

/**
 * 名字变了也得重画。不 watch 这两个，图会一直挂着原始 code，直到用户点一次查询
 * 让序列变一次才恢复 —— 那是个「没人碰它自己就好了」的假象，最难排查也最容易
 * 被当成「后端返回的就是英文」。
 * <p>
 * poolNames 三个调用方给的都是 computed（每次重算换新对象），deep 不是必须，
 * 但留着防后来人原地改 map：这张表最多三个键，代价可以忽略。
 */
watch(() => props.poolNames, render, { deep: true })
watch(fallbackPoolNames, render)
// 换语言：tooltip / 图例 / 轴名的文案都是渲染时求值的，不重画就停在旧语言
watch(locale, render)

window.addEventListener('resize', handleResize)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style scoped>
.usage-trend {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.trend-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.trend-title {
  font-weight: 600;
  color: var(--ink);
}

.trend-total {
  color: var(--ink-3);
  font-size: 12px;
}

.trend-pools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}

.tp-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
}

.tp-item b {
  color: var(--ink);
}

.trend-canvas {
  width: 100%;
}

.trend-empty {
  padding: 18px 0;
}

/* 窗口口径就写在图下面：这一档完不完整，不该要人点进下拉才知道 */
.trend-hint {
  color: var(--ink-3);
  font-size: 12px;
  line-height: 1.6;
}
</style>
