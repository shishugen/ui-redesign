#!/usr/bin/env node
/**
 * 迁移对比脚本（零第三方依赖）
 *
 *   node scripts/verify-migration.mjs           生成 docs/COMPARE.md + 控制台摘要
 *   node scripts/verify-migration.mjs --strict  冻结层异常/路由断链时退出码 1
 *
 * 只读 ui/，只写 ui-redesign/docs/COMPARE.md。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.resolve(HERE, '..')          // ui-redesign
const WORKSPACE = path.resolve(PROJECT, '..')     // ui-2
const OLD = path.join(WORKSPACE, 'ui', 'src')
const NEW = path.join(PROJECT, 'src')
const DOCS = path.join(PROJECT, 'docs')
const INV = path.join(DOCS, 'inventory')
const STRICT = process.argv.includes('--strict')

const read = (p) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '')
const exists = (p) => fs.existsSync(p) && fs.statSync(p).isFile()
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')
function countVue(dir) {
  if (!fs.existsSync(dir)) return 0
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) n += countVue(path.join(dir, e.name))
    else if (e.name.endsWith('.vue')) n++
  }
  return n
}
const sharedExisting = countVue(path.join(NEW, 'components')) + countVue(path.join(NEW, 'layout'))

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length)
  const parseLine = (line) => {
    const out = []
    let cur = '', q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q
      } else if (ch === ',' && !q) { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    return out
  }
  const head = parseLine(lines[0])
  return lines.slice(1).map((l) => {
    const cells = parseLine(l)
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']))
  })
}

// ---------- 输入 ----------
const manifest = JSON.parse(read(path.join(INV, 'frozen-manifest.json')))
const pages = parseCsv(read(path.join(INV, 'pages.csv')))
const summary = JSON.parse(read(path.join(INV, 'summary.json')))
const now = new Date().toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })

// ---------- A 冻结完整性 ----------
const frozen = []
for (const f of manifest.files) {
  if (f.group === 'ADAPTER') continue
  const target = path.join(PROJECT, f.path)
  const source = path.join(OLD, f.path.replace(/^src\//, ''))
  const sourceHash = exists(source) ? sha(source) : ''
  let state = 'OK'
  if (!exists(source)) state = 'SOURCE_MISSING'
  else if (sourceHash !== f.sha256) state = 'SOURCE_DRIFT'
  else if (!exists(target)) state = 'MISSING'
  else if (sha(target) !== f.sha256) state = 'CHANGED'
  frozen.push({ path: f.path, group: f.group, state })
}
const count = (s) => frozen.filter((f) => f.state === s).length
const frozenOk = count('OK')
const frozenBad = frozen.filter((f) => f.state !== 'OK')

// ---------- B 页面覆盖 ----------
const coverage = []
for (const r of pages) {
  const target = path.join(PROJECT, r.new_path)
  const actual = r.actual_new_path ? path.join(PROJECT, r.actual_new_path) : ''
  coverage.push({
    ...r,
    named: exists(target),
    anyFile: exists(target) || (actual && exists(actual)),
    renamedOnly: !exists(target) && !!actual && exists(actual),
  })
}
const P = coverage.filter((r) => r.kind === 'P')
const C = coverage.filter((r) => r.kind === 'C')
const statusCount = {}
for (const r of pages) statusCount[r.status] = (statusCount[r.status] || 0) + 1
const doneCount = (statusCount.done || 0)
const namedPages = P.filter((r) => r.named).length
const anyPages = P.filter((r) => r.anyFile).length
const renamedPages = P.filter((r) => r.renamedOnly).length

// ---------- C 路由可解析 ----------
const routerFile = path.join(NEW, 'router', 'index.js')
const brokenRoutes = []
if (exists(routerFile)) {
  const s = read(routerFile)
  const refs = [...s.matchAll(/import\(['"]@\/(views|layout)\/([^'"]+)['"]\)/g)]
    .map((m) => `src/${m[1]}/${m[2]}`)
  for (const r of [...new Set(refs)]) {
    const p = path.join(PROJECT, r)
    const candidates = [p, p + '.vue', path.join(p, 'index.vue')]
    if (!candidates.some(exists)) brokenRoutes.push(r)
  }
} else brokenRoutes.push('src/router/index.js (缺失)')

// ---------- D 接口调用集合 ----------
function apiNames(file) {
  if (!exists(file)) return null
  const s = read(file)
  const names = new Set()
  for (const m of s.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]@\/api\//g)) {
    for (const n of m[1].split(',')) {
      const x = n.trim().split(/\s+as\s+/)[0].trim()
      if (x) names.add(x)
    }
  }
  for (const m of s.matchAll(/import\s+(\w+)\s+from\s*['"]@\/api\//g)) names.add(m[1])
  return names
}
const apiGaps = []
for (const r of P) {
  if (!['done', 'verified', 'implemented', 'implemented_same', 'implemented_renamed'].includes(r.status)) continue
  const oldFile = path.join(OLD, r.old_path.replace(/^src\//, ''))
  const newRel = (r.actual_new_path || r.new_path)
  const newFile = path.join(PROJECT, newRel)
  if (!exists(newFile)) continue
  const a = apiNames(oldFile), b = apiNames(newFile)
  if (!a || !b) continue
  const missing = [...a].filter((x) => !b.has(x))
  if (missing.length) apiGaps.push({ id: r.id, path: r.old_path, missing })
}

// ---------- 批次统计 ----------
const batches = [...new Set(pages.map((r) => r.batch))].sort()
const batchRows = batches.map((b) => {
  const rows = P.filter((r) => r.batch === b)
  return {
    batch: b,
    priority: rows[0]?.priority || '',
    pages: rows.length,
    named: rows.filter((r) => r.named).length,
    done: rows.filter((r) => r.status === 'done').length,
  }
})
const modules = [...new Set(pages.map((r) => r.module))].sort()
const moduleRows = modules.map((m) => {
  const rows = P.filter((r) => r.module === m)
  return { module: m, pages: rows.length, named: rows.filter((r) => r.named).length, done: rows.filter((r) => r.status === 'done').length }
}).filter((x) => x.pages > 0)

// ---------- 报告 ----------
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '—')
const line = (cells) => '| ' + cells.join(' | ') + ' |'
const md = []
md.push('# 迁移对比报告')
md.push('')
md.push(`- 生成时间：${now}`)
md.push(`- 源项目：\`ui/\` · 目标项目：\`ui-redesign/\``)
md.push(`- 命令：\`node scripts/verify-migration.mjs${STRICT ? ' --strict' : ''}\``)
md.push('')
md.push('## 1. 总览')
md.push('')
md.push(line(['指标', '基线', '当前', '占比']))
md.push(line(['---', '---:', '---:', '---:']))
md.push(line(['页面 P（可独立打开）', summary.page_entries, `${namedPages} 同名 / ${anyPages} 含重命名`, pct(namedPages, summary.page_entries)]))
md.push(line(['页内组件 C', summary.inline_components, C.filter((r) => r.named).length, pct(C.filter((r) => r.named).length, summary.inline_components)]))
md.push(line(['`views/**` SFC', summary.views_vue, coverage.filter((r) => r.named).length, pct(coverage.filter((r) => r.named).length, summary.views_vue)]))
md.push(line(['公共组件 + 布局', summary.shared_components + summary.layout_views, `${sharedExisting} 个 .vue（含新增）`, '—']))
md.push(line(['接口 js（F1）', summary.api_js, `${frozen.filter((f) => f.group === 'F1' && f.state === 'OK').length} 一致`, pct(frozen.filter((f) => f.group === 'F1' && f.state === 'OK').length, summary.api_js)]))
md.push(line(['导出方法 / URL', `${summary.api_exports} / ${summary.api_urls}`, '冻结层校验', '—']))
md.push(line(['状态 = done', '0', doneCount, pct(doneCount, summary.page_entries)]))
md.push('')
md.push('## 2. 四组检查结果')
md.push('')
md.push(line(['组', '检查项', '结果', '判定']))
md.push(line(['---', '---', '---', '---']))
md.push(line(['A', 'F1/F2 冻结层哈希', `OK ${frozenOk} / 异常 ${frozenBad.length}（F1 ${frozenBad.filter((f) => f.group === 'F1').length}）`, frozenBad.length ? '❌' : '✅']))
md.push(line(['B', '页面同名路径覆盖', `${namedPages}/${summary.page_entries} 页；另有 ${renamedPages} 页仅以重命名形式存在`, namedPages === summary.page_entries ? '✅' : '⏳']))
md.push(line(['C', '路由 import 断链', `${brokenRoutes.length} 处`, brokenRoutes.length ? '❌' : '✅']))
md.push(line(['D', '已迁移页接口方法缺失', `${apiGaps.length} 页有缺口`, apiGaps.length ? '❌' : '✅']))
md.push('')

md.push('### A 冻结层异常明细')
md.push('')
if (!frozenBad.length) {
  md.push('无异常：所有 F1/F2 文件与 `ui/` 逐字节一致。')
} else {
  md.push(`共 ${frozenBad.length} 个（下表最多列 20 条）。\`MISSING\` = 尚未复制；\`CHANGED\` = 被改动，违反红线；\`SOURCE_DRIFT\` = 源文件在清单生成后被改。`)
  md.push('')
  md.push(line(['状态', '组', '路径']))
  md.push(line(['---', '---', '---']))
  for (const f of frozenBad.slice(0, 20)) md.push(line([f.state, f.group, `\`${f.path}\``]))
  if (frozenBad.length > 20) md.push(line([`… 另有 ${frozenBad.length - 20} 个`, '', '']))
}
md.push('')
md.push('> 执行复制（只读 `ui/`）：`rsync -a --exclude=\'.DS_Store\' ../ui/src/api/ ./src/api/`，F2 文件按 `frozen-manifest.json` 逐个复制。')
md.push('')

md.push('### B 批次覆盖')
md.push('')
md.push(line(['批次', '优先级', '页面', '同名路径已存在', 'done']))
md.push(line(['---', '---', '---:', '---:', '---:']))
for (const b of batchRows) md.push(line([b.batch, b.priority, b.pages, b.named, b.done]))
md.push('')
md.push('### B 模块覆盖（仅列含页面的模块）')
md.push('')
md.push(line(['模块', '页面', '同名路径已存在', 'done']))
md.push(line(['---', '---:', '---:', '---:']))
for (const m of moduleRows) md.push(line([`\`${m.module}\``, m.pages, m.named, m.done]))
md.push('')
md.push('### 状态分布（pages.csv）')
md.push('')
md.push(line(['status', '数量']))
md.push(line(['---', '---:']))
for (const [k, v] of Object.entries(statusCount).sort()) md.push(line([`\`${k}\``, v]))
md.push('')

if (brokenRoutes.length) {
  md.push('### C 路由断链')
  md.push('')
  for (const r of brokenRoutes) md.push(`- \`${r}\``)
  md.push('')
}
if (apiGaps.length) {
  md.push('### D 接口方法缺口')
  md.push('')
  md.push(line(['ID', '旧页面', '缺失方法']))
  md.push(line(['---', '---', '---']))
  for (const g of apiGaps) md.push(line([g.id, `\`${g.path}\``, g.missing.map((x) => `\`${x}\``).join(' ')]))
  md.push('')
}
md.push('### 待迁移（按批次/优先级，前 20）')
md.push('')
md.push(line(['ID', '批次', '旧路径', '当前状态']))
md.push(line(['---', '---', '---', '---']))
const todo = P.filter((r) => r.status !== 'done').slice(0, 20)
for (const r of todo) md.push(line([r.id, r.batch, `\`${r.old_path}\``, `\`${r.status}\``]))
md.push('')

const pass = frozenBad.length === 0 && brokenRoutes.length === 0 && apiGaps.length === 0 &&
  namedPages === summary.page_entries && doneCount === summary.page_entries
md.push('## 3. 判定')
md.push('')
md.push(pass ? '**✅ 全量通过**：冻结层零改动、页面 100% 覆盖、每页状态 done。' :
  `**⏳ 进行中**：基线 0/69，当前 ${doneCount}/69 页验收完成。${frozenBad.length ? `冻结层还有 ${frozenBad.length} 个文件待复制/被改动。` : ''}`)
md.push('')
md.push('通过条件：A 无异常 + C 无断链 + D 无缺口 + 69 页同名路径齐全 + 69 页 `status=done` + 每页有记录卡。')
md.push('')
md.push('> 人工对比（三角色登录、CRUD 抽样、长链路、视觉 1440/1280）不在此脚本内，见 `迁移设计文档.md` §7.2。')

fs.writeFileSync(path.join(DOCS, 'COMPARE.md'), md.join('\n') + '\n', 'utf8')

// ---------- 控制台 ----------
console.log(`[verify] ${now}`)
console.log(`  A 冻结层  OK ${frozenOk}/${frozen.length}  异常 ${frozenBad.length}`)
console.log(`  B 页面    ${namedPages}/${summary.page_entries} 同名  ${anyPages}/${summary.page_entries} 含重命名  done ${doneCount}`)
console.log(`  C 路由    断链 ${brokenRoutes.length}`)
console.log(`  D 接口    缺口页 ${apiGaps.length}`)
console.log(`  → docs/COMPARE.md`)
if (STRICT && (frozenBad.length || brokenRoutes.length || apiGaps.length)) {
  console.error('[verify] --strict: 存在冻结层异常或路由断链')
  process.exit(1)
}
