/**
 * 资源配额页面的展示换算。
 * <p>
 * 只有展示换算，没有业务判断：授予按小时录入、落库与计算一律分钟，
 * 分钟才是唯一真相，所以这里不允许出现任何「四舍五入后再拿去判断」的用法。
 * <p>
 * 迁移说明（第十八批）：逻辑与旧项目 `ui/src/views/manager/kube/quota/quotaUtils.js` 逐字一致，
 * 只把中文文案留在常量里、由调用方过 `t()` —— 本文件被三个资源页与两个后台页共用，
 * 在 js 里直接 import t 会让模块加载顺序变得可疑，页面侧包一层更安全。
 */

/** 小时 → 分钟，提交前唯一的换算点 */
export function hoursToMinutes(hours) {
  const h = Number(hours || 0)
  return Math.round(h * 60)
}

/** 分钟 → 小时，仅用于展示，保留两位 */
export function minutesToHours(minutes) {
  const m = Number(minutes || 0)
  return Math.round((m / 60) * 100) / 100
}

/** 分钟 → 「12 小时 30 分」，0 显示「0 分」，不过期由调用方自己判断 */
export function formatMinutes(minutes) {
  const m = Math.max(Math.floor(Number(minutes || 0)), 0)
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h <= 0) {
    return `${rest} 分`
  }
  return rest > 0 ? `${h} 小时 ${rest} 分` : `${h} 小时`
}

/** 展示态 → 文案与标签色，与后端 getState() 的五个值一一对应 */
export const STATE_META = {
  active: { text: '生效中', color: 'success' },
  pending: { text: '未开始', color: 'warning' },
  expired: { text: '已过期', color: 'error' },
  used_up: { text: '已用完', color: 'default' },
  disabled: { text: '已停用', color: 'default' }
}

export function stateText(state) {
  return (STATE_META[state] || STATE_META.active).text
}

export function stateColor(state) {
  return (STATE_META[state] || STATE_META.active).color
}

/**
 * 三个额度池的标签色，纯视觉区分，不参与逻辑。
 * key 就是后端 KubeResourceTypeEnum 的池码，与课程侧 image_source 同一串值（local/scnet/notebook）
 */
export const POOL_TAG_COLOR = {
  scnet: 'blue',
  notebook: 'purple',
  local: 'green'
}

export function poolColor(resourceType) {
  return POOL_TAG_COLOR[resourceType] || 'default'
}

/** 消耗进度百分比，授予为 0 时不显示除零 */
export function usedPercent(grantMinutes, usedMinutes) {
  const grant = Number(grantMinutes || 0)
  if (grant <= 0) {
    return 0
  }
  return Math.min(Math.round((Number(usedMinutes || 0) / grant) * 100), 100)
}

/**
 * 适用范围的展示兜底。
 * <p>
 * 下拉清单一律从后端 /usageScopes 取（与资源池同一取向：枚举只放一份），
 * 这里只负责两个面：列表里的标签色、以及接口还没回来时的名字。
 * 未知值原样回显，不能显示成空白让人以为这一行没填。
 * 名字与后端枚举必须同词：「个人排课 / 班级排课用机」这一对只差两个字，
 * 页面自己叫“仅排课用机”就会让管理员以为两档是同一个东西。
 */
export const SCOPE_META = {
  // 已停用：存量包照旧扣、照旧显示这个名字，只是不能再新发
  all: { name: '两种都用', color: 'blue' },
  private: { name: '仅个人用机', color: 'green' },
  course: { name: '个人排课', color: 'orange' },
  // 班级排课用机：与上面三个不是一个主体（全班共用一份），颜色也要拉开一档
  class_course: { name: '班级排课用机', color: 'purple' }
}

export function scopeName(scope) {
  const key = String(scope || 'all')
  return (SCOPE_META[key] || {}).name || key
}

export function scopeColor(scope) {
  const key = String(scope || 'all')
  return (SCOPE_META[key] || {}).color || 'default'
}

/**
 * 计量行的「用途」：两个维度合成一个展示名。
 * <p>
 * source_scope 只说清「个人用机 / 课程用机」，而课程用机还要按【排课归属档】
 * （schedule_type：1 个人排课 / 2 班级排课）再分一层，否则一个学生看不出自己
 * 哪几节课花的是本班的额度、哪几节花的是自己头上的排课额度。
 * <p>
 * 档为空的课程行不默认归进任一档：那是这一列上线前跑的历史记录，单独成一个
 * 「未分档」展示，比悄悄记进某一档诚实。名字与后端枚举同词（个人排课 / 班级排课）。
 */
export const USAGE_META = {
  private: { name: '个人用机', color: '#1677ff', tag: 'blue' },
  class: { name: '班级用机', color: '#722ed1', tag: 'purple' },
  personal: { name: '个人排课用机', color: '#fa8c16', tag: 'orange' },
  untyped: { name: '课程用机', color: '#8c8c8c', tag: 'default' }
}

/** 用途归类：只认 private / course + 两档码值，其余一律当未分档处理 */
export function usageKey(sourceScope, scheduleType) {
  if (sourceScope !== 'course') {
    return sourceScope === 'private' ? 'private' : 'untyped'
  }
  if (String(scheduleType || '') === '2') {
    return 'class'
  }
  return String(scheduleType || '') === '1' ? 'personal' : 'untyped'
}

export function usageName(sourceScope, scheduleType) {
  const key = usageKey(sourceScope, scheduleType)
  // 来源既不是 private 也不是 course 时原样回显，不谎称它是「课程用机」
  if (key === 'untyped' && sourceScope && sourceScope !== 'course') {
    return sourceScope
  }
  return USAGE_META[key].name
}

export function usageColor(sourceScope, scheduleType) {
  return USAGE_META[usageKey(sourceScope, scheduleType)].color
}

export function usageTag(sourceScope, scheduleType) {
  return USAGE_META[usageKey(sourceScope, scheduleType)].tag
}

/**
 * 用途的一句话解释，两个用量页共用：重点是把「这一档扣谁的额度」说清，
 * 以及班级用机那一档跟班级包被扣的墙钟不是一回事。
 */
export function usageTip(sourceScope, scheduleType) {
  const key = usageKey(sourceScope, scheduleType)
  if (key === 'class') {
    return '这节课按班级排课下发：机时记在班级排课那一档，额度扣的是本班的班级排课包。本列只算你自己这台实例跑了多久，与班级包按课扣的全班课墙钟不可对账。'
  }
  if (key === 'personal') {
    return '这节课按个人排课下发：机时记在你个人的排课那一档，额度扣的是你头上的排课包。'
  }
  if (key === 'private') {
    return '你自己新建的实例，不参与排课，扣的是个人用机额度。'
  }
  return '这一行没带排课归属档：它是分档上线前跑的历史记录，只计入课程用机，不进班级用机/个人排课用机任一档。'
}

/**
 * 额度重置周期的展示兜底。
 * <p>
 * 下拉清单一律从后端 /resetPeriods 取（与适用范围同一取向），这里只兜两个面：
 * 列表里的标签色、以及接口还没回来时的名字。未知值原样回显，不显示成空白。
 * <p>
 * 用词必须守住两条线：「不重置」只描述额度多久清一次零（用完就没有），
 * 「不过期」只描述到期时间为空；这两个词不许互相顶替，否则用户会把
 * 「一个不过期但用完就没有的包」读成「永久随便用」。
 */
export const PERIOD_META = {
  none: { name: '不重置', color: 'default' },
  day: { name: '每天', color: 'cyan' },
  week: { name: '每周', color: 'blue' },
  month: { name: '每月', color: 'purple' },
  half_year: { name: '每半年', color: 'orange' },
  year: { name: '每年', color: 'red' }
}

export function periodName(period) {
  const key = String(period || 'none')
  return (PERIOD_META[key] || {}).name || key
}

export function periodColor(period) {
  const key = String(period || 'none')
  return (PERIOD_META[key] || {}).color || 'default'
}

/** 这个包到底有没有「重发」这回事，none 以外的值都算有 */
export function isResettable(period) {
  return String(period || 'none') !== 'none'
}

/**
 * 周期的完整说法（每月 1 号 0 点重置），优先用后端 /resetPeriods 带回来的 resetText，
 * 接口没回来时退化成简短名，不能让 tooltip 空着。
 */
export function periodResetText(options, period) {
  const key = String(period || 'none')
  const hit = (options || []).find((item) => item.code === key)
  return hit ? (hit.resetText || hit.name) : periodName(key)
}

/**
 * 取某个额度池在指定实例来源下的剩余分钟。
 * <p>
 * 来源为空时回退到合计字段（后端 VO 里合计是「不区分范围」的总盘子），
 * 这样老的展示位不用传来源也不会变成 0。
 */
export function scopeRemainMinutes(quota, sourceScope) {
  if (!quota) {
    return 0
  }
  if (sourceScope === 'private') {
    return Number(quota.privateRemainMinutes || 0)
  }
  if (sourceScope === 'course') {
    return Number(quota.courseRemainMinutes || 0)
  }
  return Number(quota.remainMinutes || 0)
}

/** 同理取授予量，用于「额度内已用 / 总量」这种按比例画的条 */
export function scopeGrantMinutes(quota, sourceScope) {
  if (!quota) {
    return 0
  }
  if (sourceScope === 'private') {
    return Number(quota.privateGrantMinutes || 0)
  }
  if (sourceScope === 'course') {
    return Number(quota.courseGrantMinutes || 0)
  }
  return Number(quota.grantMinutes || 0)
}

/** 同理取已用量，与授予量同一口径，两者才能相减对得上 */
export function scopeUsedMinutes(quota, sourceScope) {
  if (!quota) {
    return 0
  }
  if (sourceScope === 'private') {
    return Number(quota.privateUsedMinutes || 0)
  }
  if (sourceScope === 'course') {
    return Number(quota.courseUsedMinutes || 0)
  }
  return Number(quota.usedMinutes || 0)
}
