/**
 * 并发历史阶梯线的「展示层补点」：把只存变化点的稀疏行，前向填充成等距时刻。
 * <p>
 * 为什么需要它：v3（甲）之后明细行是「值变了才写一行」，于是 8:00 到 12:00 一直没变时，
 * 库里只有 8:00 那一行。阶梯线（step: 'end'）本身就能把这段水平拉到 12:00 —— 读得是对的，
 * 但看着像中间「少了好几个时间点」，跟逐点存时的观感不一样。这里纯粹在展示层把那些时刻
 * 补回来，**库里一个点也没多存**。
 * <p>
 * 两条不能越界的规矩：
 * <ul>
 *   <li>只在同一个形状自己的首行到末行之间补。它没开机器的那段没有值可延续，补出来就是
 *       凭空画一条本来不存在的线 —— 那一段该断还得断着；</li>
 *   <li>补出来的点带 filled 标记，tooltip 说的是「延续自哪一次变化」，不自称「这一刻采过一次」。</li>
 * </ul>
 * 还有一条是后来补上的（见 fillableGapMs）：长得反常的段不补，那是采样盲区不是“没变化”。
 * 这个文件故意不 import 任何东西（连 vue 都不要）：填充规则只要错一格，图上就会多出一批
 * 看着完全像采样点的假点，靠肉眼在页面上根本看不出来，所以它必须能被 node 直接拉起来单测。
 */

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

/**
 * 补点步长跟着窗口宽度走，而不是恒 5 分钟：
 * 24 小时档按 5 分钟补（288 个点/条线）刚好与采样周期同格；30 天档还按 5 分钟补会造出
 * 8640 个点/条线 —— 那是拿「能读」换「点数多」，没有意义。
 * 整学期（日峰值档）返回 0 不补：一行就是一个自然日，它本身就是网格。
 */
export function pickGridMs(minTs, maxTs) {
  const span = maxTs - minTs
  if (!Number.isFinite(span) || span <= 0) {
    return 0
  }
  if (span <= 2 * DAY_MS) {
    return 5 * MINUTE_MS
  }
  if (span <= 10 * DAY_MS) {
    return 30 * MINUTE_MS
  }
  if (span <= 45 * DAY_MS) {
    return 2 * 60 * MINUTE_MS
  }
  return 0
}

/** 本点之后的第一个网格时刻（按绝对时间对齐，整分钟时区下与本地 clock 同格） */
export function nextGridSlot(ts, gridMs) {
  return Math.floor(ts / gridMs) * gridMs + gridMs
}

// 单个区间最多补多少个点：宁可截断也不让页面卡死（脏数据里两个点差一天、步长 5 分钟时，
// 这里会造出几百个点，是正常的；但 ts 被写成 NaN/负数时，while 会无限循环）
const MAX_FILL_PER_GAP = 4096

/**
 * 超过这个长度的段不补点：它不成比例地长，最可能的解释不是“值真的一直没变”，
 * 而是中间采样器根本没跑（服务重启/电脑休眠/发布窗口）。
 * 库里区分不了这两种（没变化也不会写行），那就只能选不造假：宁可这一段少几个点，
 * 也不能把 11 小时的无人值守画成“每 5 分钟都采过一次、确实一直是 1 台”。
 * 取 6 小时：一整个上午/下午的课（含 4 小时那种长平台）全部盖得下，
 * 真停摆（本机实测 11.5 小时）能拦住。宁可把这个值调大也不要调小：
 * 调小了退化回“中间看着缺点”，调大只会多补点、不会造假。
 */
const MAX_PLAUSIBLE_GAP_MS = 6 * 60 * 60 * 1000

/** 本段允许补点的上限：至少 6 个格，否则步长大一档的窗口连正常平台都补不了 */
export function fillableGapMs(gridMs) {
  return Math.max(MAX_PLAUSIBLE_GAP_MS, gridMs * 6)
}

/**
 * 把一条线的点序补成网格。返回新数组，不改入参（入参还要被别的计算复用）。
 * @param {Array<{ts:number, instances:number, untilTs:number|null, row:object}>} pts 已按 ts 升序
 * @param {number} gridMs 步长毫秒，<=0 表示不补
 * @param {number} [maxGapMs] 超过这个长度的段不补（默认 fillableGapMs(gridMs)）
 */
export function fillToGrid(pts, gridMs, maxGapMs = fillableGapMs(gridMs)) {
  if (!Array.isArray(pts) || gridMs <= 0 || pts.length < 2) {
    return Array.isArray(pts) ? pts.slice() : []
  }
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i]
    out.push(cur)
    const nxt = pts[i + 1]
    if (!nxt || !Number.isFinite(cur.ts) || !Number.isFinite(nxt.ts)) {
      continue
    }
    // 长段只保留两端两个真点：中间那段是盲区，不是“采过且没变”
    if (nxt.ts - cur.ts > maxGapMs) {
      continue
    }
    let t = nextGridSlot(cur.ts, gridMs)
    let n = 0
    while (t < nxt.ts && n < MAX_FILL_PER_GAP) {
      out.push({ ts: t, instances: cur.instances, untilTs: nxt.ts, row: cur.row, filled: true })
      t += gridMs
      n++
    }
  }
  return out
}
