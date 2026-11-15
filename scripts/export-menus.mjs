/**
 * D3 解锁工具 · 导出后端真实菜单并与静态台账核对
 *
 * 背景：docs/迁移设计文档.md §9 的 D3 —— 静态推导的 69 页是「入口集合」，
 * 真实菜单页数必须由已登录后端返回的 /getMenus 核对（直连 401 认证失败）。
 *
 * 用法（只读，不改 pages.csv、不保存 token）：
 *   node scripts/export-menus.mjs --token <Bearer token>
 *   AIGC_TOKEN=<Bearer token> node scripts/export-menus.mjs --url http://host:port
 *   --out <path>   结果 JSON 路径，默认 docs/inventory/menus-export.json
 *
 * 输出：原始响应 + component 清单 + 与 pages.csv 的逐行命中对照（含 menuFlag、批次、
 * 重复 component）。结果供人工确认后补 pages.csv 的 menu 列；脚本不擅自改状态源。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)

function arg(name, fallback = '') {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const rawToken = arg('--token', process.env.AIGC_TOKEN || '')
const token = rawToken.replace(/^Bearer\s+/i, '').trim()
const base = arg('--url', process.env.API_BASE || 'http://127.0.0.1:38080').replace(/\/$/, '')
const outPath = path.resolve(ROOT, arg('--out', 'docs/inventory/menus-export.json'))

if (!token) {
  console.error('缺少 Bearer token：用 --token <token> 或环境变量 AIGC_TOKEN 提供。')
  console.error('获取方式：登录后端后在浏览器 DevTools 里读 Cookie Admin-Token，或复制 Authorization 头的值。')
  process.exit(2)
}

const url = `${base}/getMenus`
console.log(`→ GET ${url}`)

let payload
try {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000)
  })
  const text = await res.text()
  try { payload = JSON.parse(text) } catch (e) {
    console.error(`响应不是 JSON（HTTP ${res.status}）：${text.slice(0, 300)}`)
    process.exit(3)
  }
  if (res.status === 401 || payload.code === 401) {
    console.error(`401 认证失败：${payload.msg || 'token 无效或已过期'}`)
    process.exit(4)
  }
  if (res.status !== 200 || (payload.code && payload.code !== 200)) {
    console.error(`接口异常（HTTP ${res.status} / code ${payload.code}）：${payload.msg || ''}`)
    process.exit(3)
  }
} catch (e) {
  console.error(`请求失败：${e.message}`)
  process.exit(3)
}

const menus = Array.isArray(payload.data) ? payload.data : []
const routes = menus.filter(m => m.menuType !== 'F' && m.visible !== '1')
const menuItems = routes.filter(m => m.component)
const components = [...new Set(menuItems.map(m => m.component))].sort()
const byFlag = {}
for (const m of routes) {
  const k = String(m.menuFlag ?? '?')
  byFlag[k] = (byFlag[k] || 0) + 1
}
const componentByFlag = {}
const componentCount = {}
for (const m of menuItems) {
  const k = String(m.menuFlag ?? '?')
  componentByFlag[k] = (componentByFlag[k] || 0) + 1
  componentCount[m.component] = (componentCount[m.component] || 0) + 1
}
const duplicateComponents = Object.fromEntries(
  Object.entries(componentCount).filter(([, n]) => n > 1)
)

// 按表头名读 pages.csv：以后新增列也不会错位，且不写回文件
const csv = fs.readFileSync(path.join(ROOT, 'docs/inventory/pages.csv'), 'utf8')
const lines = csv.split(/\r?\n/).filter(l => l.length)
const head = lines[0].replace(/^\uFEFF/, '').split(',')
const col = Object.fromEntries(head.map((h, i) => [h, i]))
const rows = lines.slice(1).map(l => {
  const f = l.split(',')
  return {
    id: f[col.id], old_path: f[col.old_path], kind: f[col.kind],
    batch: f[col.batch], status: f[col.status]
  }
})
const byPath = new Map(rows.map(r => [r.old_path, r]))

// component 一般不含扩展名，可能是目录（/index.vue）或单文件（.vue）
function candidate(c) {
  const p = String(c).replace(/^\/?/, '').replace(/\.vue$/, '')
  return [`src/views/${p}.vue`, `src/views/${p}/index.vue`]
}

const matchedRows = []
const unmatchedDetail = []
for (const c of components) {
  const hit = candidate(c).find(p => byPath.has(p))
  if (hit) {
    const r = byPath.get(hit)
    matchedRows.push({ component: c, oldPath: hit, id: r.id, kind: r.kind, batch: r.batch, status: r.status })
  } else {
    const items = menuItems.filter(m => m.component === c)
    unmatchedDetail.push({
      component: c,
      menuNames: items.map(m => m.menuName),
      menuFlag: [...new Set(items.map(m => String(m.menuFlag ?? '?')))],
      fileExistsInUi: candidate(c).some(p => fs.existsSync(path.join(ROOT, '..', 'ui', p)))
    })
  }
}
const matched = matchedRows.map(r => r.component)
const unmatched = unmatchedDetail.map(r => r.component)
const staticPagesTotal = rows.filter(r => r.kind === 'P').length
const staticPagesHit = matchedRows.filter(r => r.kind === 'P').length

const report = {
  exportedAt: new Date().toISOString(),
  url,
  total: menus.length,
  routable: routes.length,
  menuItems: menuItems.length,
  uniqueComponents: components.length,
  byMenuFlag: byFlag,
  componentByFlag,
  duplicateComponents,
  components,
  matched,
  unmatched,
  matchedRows,
  unmatchedDetail,
  menuDrivenPages: matchedRows.length,
  staticPagesTotal,
  staticPagesHit,
  raw: payload
}
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8')

console.log(`菜单条目 ${menus.length} · 可见路由 ${routes.length} · 带 component 菜单项 ${menuItems.length} · 唯一 component ${components.length}`)
console.log(`按 menuFlag（可见路由）：${JSON.stringify(byFlag)}`)
console.log(`按 menuFlag（带 component）：${JSON.stringify(componentByFlag)}`)
console.log(`重复 component：${JSON.stringify(duplicateComponents)}`)
console.log(`命中静态台账 ${matchedRows.length} 行（P ${staticPagesHit} / C ${matchedRows.length - staticPagesHit}）· 未命中 ${unmatched.length}`)
console.log(`静态台账 P 共 ${staticPagesTotal} 页，其中菜单驱动 ${staticPagesHit} 页、非菜单驱动 ${staticPagesTotal - staticPagesHit} 页`)
if (unmatched.length) console.log(`未命中：${unmatched.join(', ')}`)
console.log(`→ ${path.relative(ROOT, outPath)}`)
console.log('下一步：按 matchedRows 补 pages.csv 的 menu 列；未命中项按 menuFlag 与 fileExistsInUi 判断是否需要新增视图。')
