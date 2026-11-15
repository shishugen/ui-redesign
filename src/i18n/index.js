import { reactive, computed } from 'vue'
import enUS from './en-US'

/**
 * 中英切换：零依赖实现，不引入 vue-i18n。
 *
 * 设计取舍（见 docs/迁移设计文档.md §11）：
 * - 中文原文即词条 key。zh-CN 时 t() 原样返回，因此中文侧不需要维护第二份字典，
 *   也不会出现「加了中文文案却忘了登记 key」导致的空白。
 * - en-US 时查 en-US.js 的中→英映射；缺失词条自动回退中文，不会白屏。
 * - locale 是模块级 reactive，模板/computed/Pinia getter 里调用 t() 会自动跟随切换。
 * - 后端返回的菜单名、系统名、课程名等业务数据：同样可以 t() 过一层，
 *   命中菜单字典就翻译，未命中保持后端原文（不伪造数据）。
 */

export const LOCALES = [
  { value: 'zh-CN', label: '中', name: '中文' },
  { value: 'en-US', label: 'EN', name: 'English' }
]

const STORAGE_KEY = 'aigc_locale'
const DEFAULT_LOCALE = 'zh-CN'

function readSaved() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (LOCALES.some(l => l.value === v)) return v
  } catch (e) { /* 隐私模式下 localStorage 不可用 */ }
  // 不跟随浏览器语言自动切英文：本项目中文为默认，英文由用户主动选择
  return DEFAULT_LOCALE
}

const state = reactive({ locale: readSaved() })

export const locale = computed(() => state.locale)

/** 翻译。text 为中文原文（或任意字符串），params 用于 {n} 占位符替换。 */
export function t(text, params) {
  const key = String(text ?? '')
  if (!key) return ''
  let out = state.locale === 'en-US' ? (enUS[key] ?? key) : key
  if (params) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m))
  return out
}

export function setLocale(value) {
  const next = LOCALES.some(l => l.value === value) ? value : DEFAULT_LOCALE
  state.locale = next
  try { localStorage.setItem(STORAGE_KEY, next) } catch (e) { /* 忽略 */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next === 'en-US' ? 'en' : 'zh-CN'
    document.documentElement.dataset.locale = next
    // 浏览器标签标题也要跟着切（index.html 里的中文标题）
    document.title = t('AI 大模型培训教学管理系统')
  }
  return next
}

export function toggleLocale() {
  return setLocale(state.locale === 'zh-CN' ? 'en-US' : 'zh-CN')
}

export function useI18n() {
  return { locale, t, setLocale, toggleLocale, locales: LOCALES }
}

// 首次加载同步 <html lang>，并让 e2e / 样式能读到当前语言
setLocale(state.locale)

export default { locale, t, setLocale, toggleLocale, locales: LOCALES }
