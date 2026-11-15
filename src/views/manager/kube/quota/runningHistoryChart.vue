<template>
  <div class="running-chart">
    <a-spin :spinning="loading">
      <!-- 一条线都不该画时坚决不给空白画布：曲线没有采样行 = 这个窗口里就没开过机器，
           写一句实话比一根贴 0 的线读起来更准确 -->
      <a-empty
        v-if="!plot"
        :image="simpleEmpty"
        :description="t('这个窗口内没有变化点（该时段这个主体没开过机器，或历史早于统计上线）')"
        class="chart-empty" />
      <div v-else :ref="setHost" class="chart-canvas" :style="{ height: `${height}px` }"></div>
    </a-spin>
  </div>
</template>

<script setup>
/**
 * 在用并发历史阶梯线：x 是【变化发生的时刻】，y 是「从这一刻起开着几台」，每个池一条线。
 * 一个主体可以给好几行：每个池一条，外加一条 resource_type 为空串的「跨池总并发」（虚线）。
 * 那条虚线不是把三条实线相加得来的：各池峰值时刻不同，相加是个凭空多出来的数 —— 后端已经按
 * 同一份事实替你算好了这一行，前端只负责画。
 * <p>
 * 与日堆叠柱的用量趋势图（usageTrendChart）是两件事，不共用：那张图回答「一天用了多少分钟」，
 * 这张回答「某一时刻开着几台」—— 柱可以累加，并发不可以，硬套会把两个口径混成一根轴。
 * <p>
 * 【v3（甲）起这张图的两条命】：明细行从「每 5 分钟一个采样点」变成「值变了才有一行」，
 * 于是不存段长而要能读出来，全靠前两条：
 * <ul>
 *   <li>**横轴必须是 time**：行与行之间的距离就是「这个值持续了多久」，用下标均摊的
 *       category 轴会把一段 13 小时的同值画成紧挨的两格 —— 那不是难看，是把「一直没变」
 *       说成「马上就变了」；</li>
 *   <li>**阶梯线就是延续本身**：step: 'end' 从本点水平拉到下一点再垂直跳，库里不需要任何
 *       标记位也能读对。但【读得对不等于看着不缺】：一条 4 小时长的水平线上只挂着两端两个点，
 *       看的人会觉得中间“少了好几个时间点”。所以展示层还是把变化点前向填充成等距网格
 *       （pickGridMs）—— 补出来的点带 filled 标记，tooltip 写的是“延续自哪一次变化”而不是
 *       假装那一刻采过一次。库依旧只存变化点，一个点也没多存。</li>
 * </ul>
 * 最后一段用 extendToNow 补一个「延续到此刻」的封口点：阶梯线只能把水平段拉到下一个点的
 * x 上，没有这个点，曲线就吊在最后一个变化时刻，看着像「到那儿就没机器了」——
 * 而归零行恰好就是这个语义的相反面（真没机器了时会写一行 0）。这个点不写库，只画。
 * 注意它与网格补点不同：网格补点只在这个形状自己有行的区间内填，行之前/行之后都不造点。
 * 但它只能在【今天真的有行】时画：日界必写送了一条能用的判据 —— 采样器活着的话，
 * 一个形状今天在跑就一定有今天的行。所以最后一个点早于今天 = 它今天没在跑（或采样器停了几天），
 * 此时延长到此刻会把一条两天前的旧台数说成「现在还开着这么多」——那是假，不延。
 */
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { Empty } from 'ant-design-vue'
import * as echarts from 'echarts/core'
import { TooltipComponent, LegendComponent, GridComponent, DataZoomComponent } from 'echarts/components'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { t, locale } from '@/i18n'
import { poolColor, formatMinutes } from './quotaUtils'
import { pickGridMs, fillToGrid, fillableGapMs } from './runningHistoryGrid'

echarts.use([TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, LineChart, CanvasRenderer])

const props = defineProps({
  /** [{ ts, xLabel, pool, instances, users }]，调用方把明细变化点/日峰值两种行都归一到这个形状；
   *  ts 是必须有的：横轴已经按真实时间摆点，没有它这个点根本不知道画在哪 */
  rows: { type: Array, default: () => [] },
  /** 池 code → 中文名 */
  poolNames: { type: Object, default: () => ({}) },
  /** tooltip 里数值行后面的补充说明（日峰值档给「均值 N 台 · 累计 M 台」） */
  extraOf: { type: Function, default: null },
  /** 把每条线最后一段封到「此刻」：明细变化点档要（值真的还在延续），日峰值档不要（一天一格，
   *  往今天此刻拉一条线是把日峰值说成实时并发）。页面按自己的窗口档位传 */
  extendToNow: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  height: { type: Number, default: 240 }
})

const simpleEmpty = Empty.PRESENTED_IMAGE_SIMPLE
const host = ref(null)
let chart = null

function setHost(el) {
  host.value = el
}

const LINE_COLOR = {
  scnet: '#1677ff',
  notebook: '#722ed1',
  local: '#52c41a'
}

/** 跨池合并行的池 code 就是空串（后端那一行的 resource_type），它没有自己的颜色语义 */
function isTotal(code) {
  return !code
}

function lineColor(code) {
  if (LINE_COLOR[code]) {
    return LINE_COLOR[code]
  }
  if (isTotal(code)) {
    return '#595959'
  }
  const fallback = { blue: '#1677ff', purple: '#722ed1', green: '#52c41a' }
  return fallback[poolColor(code)] || '#8c8c8c'
}

function poolLabel(code) {
  // 空串是「该主体跨池合并总行」，不是没填池名 —— 后端存的就是空串，这里给它一个读得懂的名字
  if (isTotal(code)) {
    return props.poolNames[''] || t('总并发')
  }
  return props.poolNames[code] || code
}

const DAY_MS = 24 * 60 * 60 * 1000

function pad2(n) {
  return String(n).padStart(2, '0')
}

/**
 * 时间戳 → 给人读的刻度。
 * 去掉年份是为了省地方，带不带日期取决于窗口宽度而不是“总是带”。
 */
function fmtTs(ts, spanDays) {
  const n = Number(ts)
  if (!Number.isFinite(n)) {
    return String(ts)
  }
  const d = new Date(n)
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  const md = `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  if (spanDays <= 2) {
    // 两天以内看时分就够，但跳日那个刻度还是得说出日期，否则 00:00 不知道是哪天
    return hm === '00:00' ? md : hm
  }
  if (spanDays <= 60) {
    return `${md} ${hm}`
  }
  return `${d.getFullYear()}-${md}`
}

/**
 * 点序就是段：同一形状里「下一行的时间」就是本行的结束时刻。
 * 库里不存段长也不存延续标记，这里现算 —— 排序 + 取后一个，仅此而已。
 */
const plot = computed(() => {
  const rows = (props.rows || []).filter((r) => r && Number.isFinite(r.ts))
  if (!rows.length) {
    return null
  }
  const pools = []
  const byPool = new Map()
  for (const r of rows) {
    const code = r.pool || ''
    let pts = byPool.get(code)
    if (!pts) {
      pts = []
      byPool.set(code, pts)
      pools.push(code)
    }
    const val = Number(r.instances || 0)
    const last = pts[pts.length - 1]
    // 同一时刻多个点（多实例轮重复写、或同值点）只留台数更大的那个：并发读峰值不读巧合
    if (last && last.ts === r.ts) {
      if (val >= last.instances) {
        last.instances = val
        last.row = r
      }
      continue
    }
    pts.push({ ts: r.ts, instances: val, row: r, untilTs: null })
  }
  let minTs = Infinity
  let maxTs = -Infinity
  for (const pts of byPool.values()) {
    pts.sort((a, b) => a.ts - b.ts)
    for (let i = 0; i < pts.length - 1; i++) {
      pts[i].untilTs = pts[i + 1].ts
    }
    minTs = Math.min(minTs, pts[0].ts)
    maxTs = Math.max(maxTs, pts[pts.length - 1].ts)
  }

  const now = Date.now()
  // 逐条线自己判，而且只在「这条线最后一个点就是今天写的」时延长：今天有行 = 今天在跑
  // （日界必写保证的）。最后一个点落在昨天或更早，要么它今天真的没在跑，要么采样器停了几天、
  // 归零行没补上 —— 两种都不能把那个旧台数平到此刻（那等于替系统宣称「现在还开着 N 台」）；
  // 也不能因此让在跑的那条线不封口，所以是 continue 而不是整批取消
  const sameDayAsNow = (ts) => new Date(ts).toDateString() === new Date(now).toDateString()
  if (props.extendToNow && now > maxTs) {
    for (const pts of byPool.values()) {
      const last = pts[pts.length - 1]
      if (!sameDayAsNow(last.ts)) {
        continue
      }
      last.untilTs = now
      pts.push({
        ts: now,
        instances: last.instances,
        untilTs: null,
        synthetic: true,
        row: { ...(last.row || {}), ts: now }
      })
      maxTs = now
    }
  }
  // 【展示层补点】把变化点前向填充成等距时刻：库里一行没多存，但图上 8:00~12:00 之间的
  // 每一个网格时刻都有一个点，跟逐点存时看起来完全一样（规则与单测在 runningHistoryGrid.js）。
  // 它必须在封口之后跑：延长中的那一段也要有格点，否则“值一直持续到此刻”这个最长的一段
  // 反而只剩两端两个点，等于刚补上的东西丢在最需要它的地方
  const gridMs = pickGridMs(minTs, maxTs)
  if (gridMs > 0) {
    for (const [code, pts] of byPool) {
      byPool.set(code, fillToGrid(pts, gridMs))
    }
  }
  // 采样盲区（长得反常的段）不补点，但得让看的人知道那段没数据而不是“没变化”：
  // 这里把实际被拦下来的段数带出去，图上没地方写，至少控制台里查得到（项目习惯用日志定位）
  if (import.meta.env && import.meta.env.DEV) {
    const capped = [...byPool.values()].reduce((n, pts) => {
      for (let i = 1; i < pts.length; i++) {
        if (pts[i].ts - pts[i - 1].ts > fillableGapMs(gridMs)) {
          n++
        }
      }
      return n
    }, 0)
    if (capped > 0) {
      console.info(`[并发历史] ${capped} 段长于 ${Math.round(fillableGapMs(gridMs) / 60000)} 分钟，` +
        '按采样盲区处理（不补点，只保留两端真点）')
    }
  }
  return {
    pools,
    minTs,
    maxTs,
    spanDays: Math.max(1, Math.round((maxTs - minTs) / DAY_MS)),
    series: pools.map((code) => {
      const pts = byPool.get(code)
      return { code, data: pts.map((pt) => [pt.ts, pt.instances]), meta: pts }
    })
  }
})

function buildOption() {
  const p = plot.value
  if (!p) {
    return null
  }
  // 刻度密度按容器宽度算，不交给 echarts 默认值：它拿 28 小时只给“每 4 小时一个标签”，
  // 于是 9 点、10 点、11 点在轴上根本不存在，一串变化全挤在 08:00 和 12:00 中间读不出时刻
  const width = (chart && chart.getWidth && chart.getWidth())
    || (typeof window !== 'undefined' ? window.innerWidth : 1200)
  const splitNumber = Math.max(5, Math.min(30, Math.floor(width / 65)))
  // 缩放条只要跨度看得到就常显。原来按 spanDays > 1 判，而「近 24 小时」算出来正好是 1 天，
  // 把最需要框选细看的窗口挡在门外（只剩滚轮缩放，看的人不知道能缩）
  const zoomable = p.maxTs - p.minTs > 8 * 3600 * 1000
  return {
    grid: { left: 8, right: 16, top: 32, bottom: zoomable ? 42 : 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const first = params && params.length ? params[0] : null
        const title = first ? fmtTs(first.axisValue, p.spanDays) : ''
        const lines = []
        for (const item of params || []) {
          if (item.value === null || item.value === undefined) {
            continue
          }
          const s = p.series[item.seriesIndex]
          const pt = s && s.meta[item.dataIndex]
          if (!pt) {
            continue
          }
          const row = pt.row || {}
          const users = row.users !== undefined && row.users !== null ? ` / ${row.users} ${t('人')}` : ''
          // 时间轴 + axis 触发时，每条线拿的是「自己最近的那个点」，而各形状的变化时刻本来就不同步
          // —— 所以每行必须写清自己那个值是从什么时候起算的，只共用一个标题会骗人
          let line = `${item.marker}${item.seriesName}：${item.value} ${t('台')}${users}`
          if (pt.synthetic) {
            line += ` · ${t('延续中（没再变化，不是新写的一个点）')}`
          } else if (pt.filled) {
            // 补出来的点不能自称“这一刻采过一次”：说清它的值是从哪个变化点延续过来的
            line += ` · ${t('延续自')} ${row.xLabel || fmtTs(pt.ts, p.spanDays)}`
          } else {
            line += ` · ${t('自')} ${row.xLabel || fmtTs(pt.ts, p.spanDays)}`
            if (pt.untilTs) {
              line += ` · ${t('持续')} ${formatMinutes(Math.round((pt.untilTs - pt.ts) / 60000))}`
            }
          }
          if (props.extraOf && row) {
            const extra = props.extraOf(row)
            if (extra) {
              line += `<br/><span style="margin-left:14px;color:#64748B">${extra}</span>`
            }
          }
          lines.push(line)
        }
        return lines.length ? [title, ...lines].join('<br/>') : `${title}<br/>${t('这一刻没有开机器')}`
      }
    },
    legend: { top: 0, data: p.pools.map(poolLabel) },
    xAxis: {
      // 【不是修饰，是甲能不能读对的分水岭】category 轴把点摊成等距槽位，
      // 行距（= 这个值持续了多久）就丢了；time 轴上水平段的长度就是时长本身
      type: 'time',
      // 不写死 interval：写死后 dataZoom 放大就不会重算刻度了，交给 echarts 按当前视窗选
      // “整小时/整天”这种好看的分度，只把上限密度按宽度给它
      splitNumber,
      // 密度交给上面的 splitNumber，formatter 只管省年份
      axisLabel: { hideOverlap: true, formatter: (value) => fmtTs(value, p.spanDays) }
    },
    yAxis: { type: 'value', name: t('台数'), minInterval: 1 },
    dataZoom: zoomable
      ? [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }]
      : [{ type: 'inside' }],
    series: p.series.map((item) => ({
      name: poolLabel(item.code),
      type: 'line',
      // 阶梯而不是平滑折线：两个变化点之间开着多少台是确定的（就是这个值），
      // 但它是「整段都是这个值」而不是「从上一个值渐变过去」，斜线是在编造过程
      step: 'end',
      data: item.data,
      // connectNulls 从这张图上消失了：旧版靠 null 填槽位来表达「这段时间没机器」，
      // 时间轴上没有槽位，而“没行”现在的意思是“值没变”，真没机器时写的是【一行 0】
      symbol: 'circle',
      symbolSize: 3,
      // 跨池总并发那条线（code 为空串）走虚线加粗：它和各池线不在一个口径上，
      // 视觉上必须一眼分得开，否则很容易被读成「第四个池」
      lineStyle: {
        color: lineColor(item.code),
        width: isTotal(item.code) ? 2 : 1.5,
        type: isTotal(item.code) ? 'dashed' : 'solid'
      },
      itemStyle: { color: lineColor(item.code) }
    }))
  }
}

function render() {
  const option = buildOption()
  if (!option || !host.value) {
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

watch(
  plot,
  async () => {
    await nextTick()
    render()
  },
  { immediate: true }
)
watch(() => [props.height, props.poolNames], render, { deep: true })
// 换语言：tooltip 与图例都是渲染时求值的，不重画就停在旧语言
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
.running-chart {
  width: 100%;
}

.chart-canvas {
  width: 100%;
}

.chart-empty {
  padding: 18px 0;
}
</style>
