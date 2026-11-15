import { onActivated, onBeforeUnmount, onDeactivated, onMounted } from 'vue'
import { t } from '@/i18n'

/**
 * 用量类页面的定时刷新。
 * <p>
 * 为什么需要：额度是每分钟一轮的计量任务在累加的，「本期已用 / 剩余」和班级排课那列
 * 「正在使用」都是会自己变的数。老师与学生在页面上挂着看一节课，数却停在打开那一刻，
 * 只能靠手点刷新 —— 而这一页存在的意义就是「让人看见现在的账」。
 * <p>
 * 为什么只有一份实现：学生「我的资源」页与教师「班级用量」页要的是同一件事，
 * 各写一套 setInterval 迟早会飘成两个间隔、两套后台暂停行为。
 */
export const AUTO_REFRESH_INTERVAL_MS = 3 * 60 * 1000

/** 页面上那句话也只写这一处，两页共用同一个说法（t() 延迟到读取时求值，切语言跟着变） */
export const autoRefreshHint = () =>
  t('每 3 分钟自动刷新一次；浏览器标签页切到后台时不请求，切回来立刻补一次')

/**
 * 挂一个定时刷新。
 *
 * @param refresh    到点要执行的刷新，返回值当 Promise 处理（可以不返回）。
 *                   hook 不传任何参数进来：定时那一轮与手点那一轮的差别（比如要不要闪
 *                   loading 遮罩）由调用方自己包在箭头函数里，比在这里约定一个魔法字符串清楚。
 * @param intervalMs 间隔，默认 3 分钟
 * @returns {{restart: () => void, stop: () => void, tickNow: () => void}}
 *          restart：重新计时（手动刷新后必须调，否则刚点完一秒又被定时刷一次）；
 *          stop：彻底停掉（页面被 keep-alive 缓存着切走时自动调）；
 *          tickNow：立刻刷一轮并重新计时。
 */
export function useAutoRefresh(refresh, intervalMs = AUTO_REFRESH_INTERVAL_MS) {
  let timer = null
  /** 上一轮还没落地的 promise；有值就跳过这一轮，不叠请求 */
  let pending = null
  /** 这个组件当前在不在册。keep-alive 缓存着的那一页看不见了，就不该再替它打接口 */
  let active = false
  /** keep-alive 组件首次挂载时 mounted 与 activated 会连着各走一次，不能刷两遍 */
  let firstActivation = true

  function tick() {
    // 页面在后台标签页里就别打接口：这一页可能被挂着半天，服务器没必要被问半天
    if (typeof document !== 'undefined' && document.hidden) {
      return
    }
    if (!active || pending) {
      return
    }
    const current = Promise.resolve()
      .then(() => refresh())
      .finally(() => {
        // 只清自己这一轮：慢的那一轮回来时可能已经换了新的一轮，不能把新的清掉
        if (pending === current) {
          pending = null
        }
      })
    // 定时刷新失败不打扰用户（下一轮还会再来），但也不能留一个 unhandled rejection
    current.catch(() => {})
    pending = current
  }

  function stop() {
    active = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function start() {
    active = true
    if (timer) {
      clearInterval(timer)
    }
    timer = setInterval(tick, intervalMs)
  }

  /** 重新计时：手动刷新之后调用，让下一次定时刷新一轮完整的间隔 */
  function restart() {
    start()
  }

  function onVisibility() {
    // 先看在不在册：这一页被 keep-alive 缓存着时监听器还挂在 document 上，
    // 不先拦这一下，就会替一张看不见的页面把计时器重新开起来
    if (!active) {
      return
    }
    // 回到前台先补一次（后台那几分钟的账不能等到下一轮），再把计时归零
    if (typeof document !== 'undefined' && document.hidden) {
      return
    }
    tick()
    start()
  }

  onMounted(() => {
    start()
    document.addEventListener('visibilitychange', onVisibility)
  })
  // 这一页在 keep-alive 的缓存名单里时，切走不会 unmount：不挂这两个钩子，
  // 十个开过的用量页会在后台一起打接口。不在缓存名单里时这两个根本不触发，无副作用。
  onActivated(() => {
    if (firstActivation) {
      // 首屏那一次已经由页面自己的 onMounted 取数做过，这里只开计时器，不再补一轮
      firstActivation = false
      start()
      return
    }
    // 切回来时先补一次：挂了半小时的那页，面上的数不能接着当真的看。
    // 必须先 start() 再 tick()：tick 会先看一眼在不在册，反过来这一轮会被自己拦住
    start()
    tick()
  })
  onDeactivated(stop)
  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
  })

  // tickNow：立刻刷一轮并把计时归零。同样先 start 再 tick，理由与 onActivated 那一处一样
  return { restart, stop, tickNow: () => { start(); tick() } }
}
