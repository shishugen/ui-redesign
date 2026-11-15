/**
 * 富文本 / 字数与文件尺寸展示的工具方法
 *
 * 为什么单独放一处：AI 出题页（exam/questionGen）与章节作业出题面板（course/courseEdit）
 * 都要把章节正文的富文本 HTML 压成纯文本喂给出题接口，两处各写一份去标签逻辑，
 * 改正则时极易只改一边，导致同一章正文在两个入口喂给模型的内容不一致。
 */

/**
 * 富文本/HTML 转纯文本（保留段落换行，去除样式与图片标签）
 * @param {string} html 富文本原文（可为空）
 * @returns {string} 纯文本，图片以 [alt] 形式保留语义
 */
export function stripRichText(html) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<img[^>]*src=["'][^"']*["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '[$1]')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
  return (div.textContent || div.innerText || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 字数展示：≥ 1 万以“万”为单位（如 10.34万），否则直接显数字
 * @param {number} num 字符数
 * @returns {string} 带单位的可读文本
 */
export function formatWan(num) {
  const n = Number(num) || 0
  if (n >= 10000) {
    const v = (n / 10000).toFixed(2).replace(/\.?0+$/, '')
    return v + '万字'
  }
  return n + '字'
}

/**
 * 文件尺寸展示：按 B / KB / MB 自适应
 * @param {number} size 字节数
 * @returns {string} 带单位的可读文本（空值返空串）
 */
export function formatSize(size) {
  if (!size && size !== 0) return ''
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / 1024 / 1024).toFixed(1) + ' MB'
}
