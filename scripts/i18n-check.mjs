/**
 * i18n 词条体检：零依赖（Node 内置 fs/path）。
 *
 *   node scripts/i18n-check.mjs            # 输出覆盖率与缺口清单
 *   node scripts/i18n-check.mjs --strict   # 有未登记词条时退出码非 0，可挂 CI
 *
 * 规则：中文原文即词条 key；静态 t('中文') 必须全部能在 en-US.js 里找到，
 * 否则切英文时会回退中文。动态词条（t(menuName)、后端数据）不在静态扫描里，
 * 字典中多出来的条目属于正常补充。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dict from '../src/i18n/en-US.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const CH = /[\u4e00-\u9fff]/
const CALL = /\bt\(\s*'((?:[^'\\]|\\.)*)'/g
// 法定信息 / 后端业务数据：有意保留中文，不算缺译
const INTENTIONAL = new Set(['粤ICP备2025433461号-2'])
const files = []

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === 'api') continue // F1 冻结层：不含界面文案
      walk(p)
    } else if (['.vue', '.js', '.ts'].includes(path.extname(e.name))) {
      files.push(p)
    }
  }
}
walk(srcDir)

const used = new Map() // key -> 出现文件
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8')
  for (const m of s.matchAll(CALL)) {
    const k = m[1].replace(/\\'/g, "'")
    if (!CH.test(k)) continue
    const rel = path.relative(root, f)
    if (!used.has(k)) used.set(k, new Set())
    used.get(k).add(rel)
  }
}

const intentional = [...used.keys()].filter(k => INTENTIONAL.has(k)).sort()
const missing = [...used.keys()].filter(k => !(k in dict) && !INTENTIONAL.has(k)).sort()
const extra = Object.keys(dict).filter(k => !used.has(k)).sort()

console.log('i18n 词条体检')
console.log('  扫描文件      :', files.length)
console.log('  静态中文词条  :', used.size)
console.log('  英文字典条目  :', Object.keys(dict).length)
console.log('  覆盖率        :', ((used.size - missing.length) / used.size * 100).toFixed(1) + '%')
console.log('  动态/补充词条 :', extra.length, '（菜单名、角色名、后端数据等，正常）')
console.log('  有意保留中文  :', intentional.length, intentional.join('、'))

if (missing.length) {
  console.log('\n未登记词条（切英文时会保持中文，建议补进 src/i18n/en-US.js）：')
  for (const k of missing) console.log('  -', k, ' ← ', [...used.get(k)].join(', '))
} else {
  console.log('\n静态词条已全部登记。')
}

if (process.argv.includes('--strict') && missing.length) {
  console.error(`\n--strict: ${missing.length} 个词条未登记`)
  process.exit(1)
}
