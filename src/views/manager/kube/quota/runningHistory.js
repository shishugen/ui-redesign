/**
 * 并发历史的取数与口径换算。
 * <p>
 * 抽出来的唯一理由是「判据同源」：后台「用量统计」页要画班级/个人用机/全校三档，
 * 老师端班级用量页只看本班排课 —— 两处若各写一遍「整学期换日汇总、明细点不编均值、
 * 取数失败只清空不拦页面」，先出现的 bug 一定是「同一个班在两张图上对不上」。
 * <p>
 * 四条铁律都在这份文件里，页面上不要再各解释一次：
 * 一、口径与主体必须成对传：只有 class 档带班级ID，personal / school 档在后端那两行的
 *     class_id 恒是空串，带上班级反而取不到数；
 * 二、整学期（180 天）走日汇总：不是为了避开行数（明细表 v3 起只存变化点，一个主体
 *     一天就十几行，180 天也不到一万行），而是因为日峰值行能给出均值/累计/运行时长，
 *     明细点给不了；一屏两千个点的折线也读不出比 180 行日峰值更多的东西；
 * 三、总并发线（resource_type 空串）是后端从同一份事实算出来的，
 *     前端绝不能把三条池线相加当总并发（峰值时刻不同、跨池人数还会数两次）；
 * 四、【明细行是变化点而不是采样点】：一行只回答「从这一刻起开着几台」，
 *     它与下一行之间的每一刻都是这个值。所以每行必须带真实时间戳 ts 给图表当横轴 ——
 *     用下标均摊的 category 轴会把一段 13 小时的同值压成紧挨的两格，那是假。段长不存列，
 *     由「下一行的 ts」现算（本文件不算，图表里有排序好的点序，在那儿算）。
 */
import { ref } from 'vue'
import { t } from '@/i18n'
import { getClassRunningHistory, getClassRunningSummary } from '@/api/kube/classUsage'
import { formatMinutes } from './quotaUtils'

/** 窗口档位：label 与天数一份定义，两个页面的单选按钮都从这里渲染 */
export const HIST_WINDOW_OPTIONS = [
  { value: '24h', label: '近 24 小时', days: 1 },
  { value: '7d', label: '近 7 天', days: 7 },
  { value: '30d', label: '近 30 天', days: 30 },
  // term 的 180 天不是随手写的：明细表的保留期就是 180 天，比它更早的点已经被清掉了
  { value: 'term', label: '整学期（日峰值）', days: 180 }
]

/** 三档口径，取值与后端 stat_scope 逐字一致 */
export const HIST_SCOPE_OPTIONS = [
  { value: 'class', label: '班级排课' },
  { value: 'personal', label: '个人用机' },
  { value: 'school', label: '全校合计' }
]

/** 只有日汇总行带得出来的那几列，画在 tooltip 里。
 *  分母 sampleCount 在班级/个人/全校三档是【非零变化点数】、在按人档仍是【采样点数】（那边拿不到锚），
 *  所以这是「变化点等权均值」而不是时长加权：起 5 分钟就关的 3 台与跑满一天的 3 台同权。
 *  列名与补充文案必须把这件事说出来，不能叫「平均并发」就完事。*/
export function dailyAvg(row) {
  return row && row.sampleCount ? Math.round((row.sumInstances / row.sampleCount) * 10) / 10 : 0
}

function fmtDay(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toTs(t) {
  if (!t) return NaN
  if (typeof t === 'number') return t
  const s = String(t)
  // Safari 不认 2026-10-15 19:05:00 这种中划线日期串，先换成斜杠再试
  const ts = /[TZ]/.test(s) ? new Date(s).getTime() : new Date(s.replace(/-/g, '/')).getTime()
  return Number.isNaN(ts) ? new Date(s).getTime() : ts
}

/** 明细点的横轴标签：天宽以上带 MM-DD，以内只看 HH:mm 就够读 */
function fmtHistX(t) {
  const ts = toTs(t)
  if (Number.isNaN(ts)) {
    return String(t)
  }
  const d = new Date(ts)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * @param init 首屏口径。不传就是「班级排课 + 近 24 小时」—— 班级用量页一进来最该看的是这个班此刻的占用；
 *              后台用量页传 { scope: 'school', window: '7d' }，它要的是全盘一眼。
 *              默认值写在 composable 里而不是让各页自己去改 ref，是为了两页的「首屏在看什么」都能查到出处。
 */
export function useRunningHistory(init = {}) {
  const rows = ref([])
  const loading = ref(false)
  const histWindow = ref(init.window || '24h')
  const scope = ref(init.scope || 'class')
  // 已加载过的「口径 + 主体 + 窗口」指纹：切档就是换主语，不能拿上一档的行凑这一档的数
  let loadedKey = ''
  let seq = 0

  function keyOf(classId) {
    return `${scope.value}|${classId || ''}|${histWindow.value}`
  }

  /**
   * 取曲线数据。
   *
   * @param classId 只有 class 档用得上；personal / school 档传了也不看（后端那两行不分班）
   * @param force   换角色/换筛选后想立刻重来一次时用，默认同一指纹不重复请求
   */
  async function load(classId, force = false) {
    const isClass = scope.value === 'class'
    const target = isClass ? String(classId || '') : ''
    if (isClass && !target) {
      // 班级档没有班就没有主语：清空等用户选，不报错也不请求
      rows.value = []
      loadedKey = ''
      return
    }
    const key = keyOf(target)
    if (!force && loadedKey === key) {
      return
    }
    const mine = ++seq
    loading.value = true
    const opt = HIST_WINDOW_OPTIONS.find((w) => w.value === histWindow.value) || HIST_WINDOW_OPTIONS[0]
    const end = new Date()
    const begin = new Date(end)
    begin.setDate(begin.getDate() - opt.days)
    const params = { scope: scope.value, begin: fmtDay(begin), end: fmtDay(end) }
    if (isClass) {
      params.classId = target
    }
    try {
      if (histWindow.value === 'term') {
        const res = await getClassRunningSummary(params)
        const mapped = (res.data || []).map((r) => ({
          // 日峰值档一天一个点，ts 给时间轴用；statDay 可能是 'yyyy-MM-dd 00:00:00'，toTs 能处理
          ts: toTs(r.statDay),
          xLabel: String(r.statDay || '').slice(0, 10),
          pool: r.resourceType,
          instances: r.maxInstances,
          users: r.maxUsers,
          avg: dailyAvg(r),
          cum: r.cumInstances,
          run: r.runMinutes
        }))
        if (mine !== seq) {
          return
        }
        rows.value = mapped
        loadedKey = key
      } else {
        const res = await getClassRunningHistory(params)
        const mapped = (res.data || []).map((r) => ({
          // 【ts 是这张图的命脉】：明细行现在是变化点，行距就是段长，
          // 所以横轴必须是真实时间（图表侧用 type: 'time'），不能按点序均摊。
          // 后端已经把窗口左沿之前的那个锚点排在最前面（它是曲线左半边的延续值），
          // 前端不需要知道哪行是锚 —— 它就是一个更早的普通点
          ts: toTs(r.statTime),
          xLabel: fmtHistX(r.statTime),
          pool: r.resourceType,
          instances: r.runningInstances,
          users: r.runningUsers
        }))
        if (mine !== seq) {
          return
        }
        rows.value = mapped
        loadedKey = key
      }
    } catch (e) {
      if (mine !== seq) {
        return
      }
      // 取不到就空着：曲线是展示型数据，不能把额度页拦成报错
      rows.value = []
    } finally {
      if (mine === seq) {
        loading.value = false
      }
    }
  }

  /** 日峰值档的 tooltip 补一行变化点均值、当日累计与运行总时长；明细点的均值无意义，不编 */
  function extraOf(row) {
    if (histWindow.value !== 'term') {
      return ''
    }
    return t('变化点均值 {avg} 台 · 当天共用过 {cum} 台 · 运行总时长 {run}', {
      avg: row.avg,
      cum: row.cum,
      run: formatMinutes(row.run || 0)
    })
  }

  /** 换主体后想让下一次展开必然重取一次时用（比如清了班级筛选） */
  function invalidate() {
    loadedKey = ''
  }

  return { rows, loading, window: histWindow, scope, load, extraOf, invalidate }
}

/**
 * 日峰值行按资源池合并成「一个窗口一行」。
 *
 * 四列里只有三列能合，合并方式取决于日表存的是什么：
 * - 并发峰值：max(max_instances)，取窗口内最大；
 * - 平均并发：Σ sum_instances / Σ sample_count。这就是日表存 sum+count
 *   而不存现成 avg 的原因 —— 各天的变化点数不同，直接对日均再取平均会算错；
 * - 运行总时长：分钟可加（全项目统一用分钟，秒不可加的规矩不变）；
 * - 共用过：【不可加】。cum_instances 是「当天用过几台」，同一台机器连开 7 天
 *   会被数成 7 台；日表没存实例 ID，所以窗口内共用几台这个真值算不出来。
 *   所以 keepCum=false 时直接作废（展示成「—」），而不是给一个看着像真值的错数。
 */
export function mergeDailyRows(list, keepCum = true) {
  const byPool = new Map()
  for (const r of list || []) {
    const code = r.resourceType || ''
    const cur = byPool.get(code) || {
      resourceType: code, maxInstances: 0, maxUsers: 0, sumInstances: 0,
      sampleCount: 0, cumInstances: 0, cumUsers: 0, runMinutes: 0
    }
    cur.maxInstances = Math.max(cur.maxInstances, Number(r.maxInstances) || 0)
    cur.maxUsers = Math.max(cur.maxUsers, Number(r.maxUsers) || 0)
    cur.sumInstances += Number(r.sumInstances) || 0
    cur.sampleCount += Number(r.sampleCount) || 0
    cur.cumInstances += Number(r.cumInstances) || 0
    cur.cumUsers += Number(r.cumUsers) || 0
    cur.runMinutes += Number(r.runMinutes) || 0
    byPool.set(code, cur)
  }
  const rows = [...byPool.values()]
  if (!keepCum) {
    for (const r of rows) {
      r.cumInstances = null
      r.cumUsers = null
    }
  }
  return rows
}

/**
 * 全校总览那一小块：把窗口档位直接传进来，跟上面的曲线同窗口。
 * 不再只取「最近有数据的一天」了 —— 近 7 天就合 7 天，标题跟着变成区间。
 *
 * 但「近 24 小时」这一档仍然只取最近有数据的那一天：日表粒度是天，
 * 24 小时窗口会跨今天 + 昨天两天，合出来是「两天合计」，比曲线窗口宽。
 * 宁可只给今天（今天还没开课就自动退到昨天，而不是摆一排 0）。
 *
 * @param win HIST_WINDOW_OPTIONS 里的档位值
 * @returns { label, rows, singleDay, days } —— singleDay 决定「共用过」那一列有没有值，
 *          days 是窗口内实际有数据的那几天（页面用它说明合并了几天的数）
 */
export async function fetchSchoolSummary(win = '24h') {
  const opt = HIST_WINDOW_OPTIONS.find((w) => w.value === win) || HIST_WINDOW_OPTIONS[0]
  const isToday = opt.days <= 1
  const end = new Date()
  const begin = new Date(end)
  // 单日档多看一天：今天还没开课时要能退到昨天（原来写死回看 7 天就是为这个）
  begin.setDate(begin.getDate() - (isToday ? 2 : opt.days))
  const res = await getClassRunningSummary({ scope: 'school', begin: fmtDay(begin), end: fmtDay(end) })
  const list = res.data || []
  if (!list.length) {
    return { label: '', rows: [], singleDay: false, days: [] }
  }
  const days = [...new Set(list.map((r) => String(r.statDay || '').slice(0, 10)).filter(Boolean))].sort()
  if (isToday) {
    const latest = days[days.length - 1]
    return {
      label: latest,
      rows: mergeDailyRows(list.filter((r) => String(r.statDay || '').slice(0, 10) === latest), true),
      singleDay: true,
      days: [latest]
    }
  }
  const all = list.filter((r) => String(r.statDay || '').slice(0, 10))
  return {
    // 窗口内只有一天有数据（周末、刚上线）时，合出来就是那天的真值，标题不写区间
    label: days.length === 1 ? days[0] : `${days[0]} ~ ${days[days.length - 1]}`,
    rows: mergeDailyRows(all, days.length === 1),
    singleDay: days.length === 1,
    days
  }
}
