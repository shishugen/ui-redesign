/**
 * 统计窗口（近一天 / 近一周 / … / 近一年）的共用状态与口径。
 * <p>
 * 三处页面（角色用量、班级用量、学生「我的资源」）都要同一个窗口选择器、同一份档位清单、
 * 同一句「这个窗口的数字完不完整」的说明，所以这里只写一份：
 * 档位清单本身也在后端一份（/usageWindows，同时是白名单），前端不再硬编码天数。
 * <p>
 * 最需要防的一类错是「上线头一个月的近一年」：日粒度表是**上线那天才开始有数据**的，
 * 只把合计数摆出来，「近一年」会显示成一个看起来完全正常的年度数字。
 * 所以本文件把「数据从哪天起、窗口内实际有几天」这两件事统一算一次，
 * 三处页面拿到的角标与说明必然一致 —— 各自算迟早会算出两个不一样的数。
 */
import { ref, computed } from 'vue'
import { t } from '@/i18n'
import { listUsageWindows, listResourceTypes } from '@/api/kube/resourceAllocation'

/**
 * 默认档：近一周。
 * 选它而不是「近一天」，是因为这张报表要给的是趋势，一天只是今天到目前为止的零头；
 * 也不选更长的档，长档在日表上线初期几乎全是「仅 N 天有数据」，第一眼就看到角标不好。
 */
export const DEFAULT_WINDOW_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 档位清单的模块级缓存：它是后端枚举的投影，一次会话里不会变。
 * 三个 tab 各请求一次毫无意义；失败时把缓存清掉，好让下一次请求还能重试，
 * 而不是抱着一个 rejected promise 让所有页面永远拿不到档位。
 */
let optionsPromise = null

export function loadWindowOptions() {
  if (!optionsPromise) {
    optionsPromise = listUsageWindows()
      .then((res) => res.data || [])
      .catch((err) => {
        optionsPromise = null
        throw err
      })
  }
  return optionsPromise
}

/**
 * 池 code → 中文名的模块级缓存，与上面的档位清单同一个做法：清单在后端只有一份
 * （/resourceTypes 就是那个枚举的投影），前端不硬编码池名。
 * <p>
 * 它是给趋势图兜底用的。三处页面的池名都是从自己的数据行里推的，而行比日粒度序列
 * 晚到一步是常态：图先画出来时映射还是空的，legend 上就会露出 local_container
 * 这种原始 code，直到下一次序列变化（用户点一下查询）才「自己好了」。
 * 调用方给的名字优先，这份只作兜底；两边都没有才显示 code。
 */
let poolNamePromise = null

export function loadPoolNameMap() {
  if (!poolNamePromise) {
    poolNamePromise = listResourceTypes()
      .then((res) => {
        const map = {}
        for (const item of res.data || []) {
          if (item.code) {
            map[item.code] = item.name || item.code
          }
        }
        return map
      })
      .catch((err) => {
        poolNamePromise = null
        throw err
      })
  }
  return poolNamePromise
}

/** 'yyyy-MM-dd' → 该日本地 0 点的毫秒；不能用 new Date(text)，那个按 UTC 解析会差一天 */
function dayTime(text) {
  if (!text) {
    return null
  }
  const parts = String(text).slice(0, 10).split('-').map(Number)
  if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) {
    return null
  }
  return new Date(parts[0], parts[1] - 1, parts[2]).getTime()
}

/** 含头含尾的自然日天数：日表按自然日分日，窗口也是按自然日往前数，两边都用这个 */
export function daySpan(fromDay, toDay) {
  const from = dayTime(fromDay)
  const to = dayTime(toDay)
  if (from === null || to === null || to < from) {
    return 0
  }
  return Math.round((to - from) / DAY_MS) + 1
}

/**
 * 每页一个实例：days 是本页的选择，meta 是本页最近一次日粒度返回。
 * 只有档位清单跨页共享。
 */
export function useUsageWindow() {
  const days = ref(DEFAULT_WINDOW_DAYS)
  const rawOptions = ref([])
  const optionsLoading = ref(false)
  /** 后端 UsageDailyVo 里的元数据：{days, fromDay, today, earliestDay, coveredDays} */
  const meta = ref(null)

  async function loadOptions() {
    optionsLoading.value = true
    try {
      rawOptions.value = await loadWindowOptions()
    } finally {
      optionsLoading.value = false
    }
  }

  /** 每次换窗口都要重新取数，所以由调用方把返回的元数据交回这里 */
  function setMeta(data) {
    meta.value = data || null
  }

  /**
   * 日表已经积累出多少个自然日。拿全局的 earliestDay 与 today 算，
   * 而不是拿本次窗口的 coveredDays：下拉里其他档位还没被请求过，没有 coveredDays 可用。
   * 两者只在「计量任务停摆留下断档」时才有差，那种情况由图下面那句警示说明。
   */
  const availableDays = computed(() => {
    const m = meta.value
    if (!m || !m.earliestDay) {
      return 0
    }
    return daySpan(m.earliestDay, m.today)
  })

  /**
   * 下拉项：数据积累不够的档位**照常可选**，只挂一个灰角标说明「只覆盖 N 天」。
   * 不做成禁用：禁用会让「近一年」在这套统计上线的第一年里一直是灰的，
   * 看的人无法区分「这个功能不能看」和「能看，但只有这么多天的账」。
   */
  const windowOptions = computed(() =>
    rawOptions.value.map((item) => {
      const covered = Math.min(item.days, availableDays.value)
      const badge = availableDays.value === 0
        ? t('暂无日粒度数据')
        : item.days > availableDays.value
          ? t('仅 {n} 天', { n: covered })
          : ''
      return {
        value: item.days,
        label: item.label,
        badge,
        // 搜索按中文名走，别把角标文字也搜进去了
        searchText: item.label
      }
    })
  )

  /** 当前档位的中文名，给表格列标题与图标题用 */
  const windowLabel = computed(() => {
    const hit = rawOptions.value.find((item) => item.days === days.value)
    return hit ? hit.label : ''
  })

  /** 表格列标题：「近一周已用」。没选窗口时调用方不会开这一列 */
  const windowColumnTitle = computed(() => (windowLabel.value ? t('{name}已用', { name: windowLabel.value }) : ''))

  /**
   * 窗口口径说明。三句话各管一件事：数的是哪几天、这几天全不全、
   * 以及为什么它可以小于「本期已用」（日表上线之前的消耗不在里面）。
   */
  const windowHint = computed(() => {
    const m = meta.value
    if (!m) {
      return ''
    }
    const name = windowLabel.value || t('近 {n} 天', { n: m.days })
    if (!m.earliestDay) {
      return t('{name}：{from} ~ {to}。日粒度统计还没有任何数据，这一档的数全是 0，不代表这些人没用过机器', {
        name, from: m.fromDay, to: m.today
      })
    }
    const parts = [t('{name}：{from} ~ {to}（含今天往前 {days} 个自然日）', {
      name, from: m.fromDay, to: m.today, days: m.days
    })]
    if (m.coveredDays < m.days) {
      parts.push(
        dayTime(m.earliestDay) > dayTime(m.fromDay)
          // 窗口起点早于数据起始日：这一档整体还不完整
          ? t('日粒度统计自 {day} 起，本窗口实际只有 {n} 天有数据', { day: m.earliestDay, n: m.coveredDays })
          // 数据起始日在窗口内却仍不满：中间有断档，多半是计量任务停过
          : t('窗口内有 {n} 天没有日粒度数据（计量任务停摆过），这些天图上按 0 画', { n: m.days - m.coveredDays })
      )
    }
    parts.push(t('窗口数字只含日粒度统计上线之后的消耗，小于「本期已用」是正常的'))
    return parts.join('；')
  })

  return {
    days,
    meta,
    optionsLoading,
    loadOptions,
    setMeta,
    windowOptions,
    windowLabel,
    windowColumnTitle,
    windowHint,
    availableDays
  }
}
