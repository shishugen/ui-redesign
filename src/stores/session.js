import { defineStore } from 'pinia'
import { login as loginApi, getInfo, logout as logoutApi } from '@/api/login'
import { getMenus } from '@/api/menu'
import { getConfigKey } from '@/api/system'
import { getToken, setToken, removeToken } from '@/utils/auth'

export const ROLE_LABEL = { admin: '管理员', teacher: '教师', student: '学员' }
export const SIDE_LABEL = { training: '实训端', manager: '管理端' }

const MENU_FLAG_KEY = 'menu_flag'
const MANAGER_FLAG = 1   // 主项目 settings.js: managerMenuFlag
const TRAINING_FLAG = 2  // 主项目 settings.js: defaultMenuFlag

// 菜单展示位置（仅前端偏好，持久化到本机）：
//   hybrid 顶部一级 + 左侧二级（默认）
//   top    只在顶部横向展示
//   side   只在左侧边栏展示
const LAYOUT_KEY = 'aigc_menu_layout'
const COLLAPSE_KEY = 'aigc_side_collapsed'
const LAYOUTS = ['hybrid', 'top', 'side']

function readSide() {
  try {
    const v = sessionStorage.getItem(MENU_FLAG_KEY)
    return v ? parseInt(v) : TRAINING_FLAG
  } catch (e) { return TRAINING_FLAG }
}

function readLayout() {
  try {
    const v = localStorage.getItem(LAYOUT_KEY)
    return LAYOUTS.includes(v) ? v : 'hybrid'
  } catch (e) { return 'hybrid' }
}

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch (e) { return false }
}

/** 把后端扁平菜单按 parentId 组装成两级树，并按 orderNum 排序 */
function buildTree(list, flag) {
  const items = (list || []).filter(m =>
    parseInt(m.menuFlag) === flag && m.visible !== '1' && m.menuType !== 'F'
  )
  const byId = new Map()
  items.forEach(m => byId.set(m.menuId, { ...m, children: [] }))
  const roots = []
  items.forEach(m => {
    const node = byId.get(m.menuId)
    const parent = byId.get(m.parentId)
    if (parent && m.parentId !== 0 && m.parentId !== '0') parent.children.push(node)
    else roots.push(node)
  })
  const sort = arr => {
    arr.sort((a, b) => (Number(a.orderNum) || 0) - (Number(b.orderNum) || 0))
    arr.forEach(n => sort(n.children))
  }
  sort(roots)
  return roots.map((m, i) => ({ ...m, idx: String(i + 1).padStart(2, '0') }))
}

export const useSessionStore = defineStore('session', {
  state: () => ({
    token: getToken() || '',
    user: {},
    roles: [],
    permissions: [],
    menusRaw: [],
    systemName: '',
    side: readSide(),          // 1 管理端 / 2 实训端
    menuLayout: readLayout(),  // top 顶部 / side 左侧
    sideCollapsed: readCollapsed(),
    ready: false,
    menuError: '',
    bootstrapError: ''
  }),
  getters: {
    isLogged: s => !!getToken(),
    role: (s) => {
      const r = s.roles.map(x => String(x).toLowerCase())
      if (r.includes('admin')) return 'admin'
      if (r.includes('teacher')) return 'teacher'
      return 'student'
    },
    roleLabel() { return ROLE_LABEL[this.role] || '用户' },
    sideLabel: s => SIDE_LABEL[s.side === MANAGER_FLAG ? 'manager' : 'training'],
    sideFlag: s => s.side,
    displayName: s => s.user.nickName || s.user.userName || '未登录',
    initials: s => {
      const n = s.user.nickName || s.user.userName || 'U'
      return /^[a-zA-Z]/.test(n) ? n.slice(0, 2).toUpperCase() : n.slice(0, 1)
    },
    /** 当前端的一级菜单（真实后端数据） */
    topMenus: (s) => buildTree(s.menusRaw, s.side),
    /** 当前端可见菜单条目数（一级 + 二级，含首页） */
    menuCount() {
      const sum = (arr) => arr.reduce((n, m) => n + 1 + sum(m.children || []), 0)
      return sum(this.topMenus) + 1
    }
  },
  actions: {
    setMenuLayout(layout) {
      this.menuLayout = LAYOUTS.includes(layout) ? layout : 'hybrid'
      try { localStorage.setItem(LAYOUT_KEY, this.menuLayout) } catch (e) { /* 忽略 */ }
    },
    setSideCollapsed(v) {
      this.sideCollapsed = !!v
      try { localStorage.setItem(COLLAPSE_KEY, this.sideCollapsed ? '1' : '0') } catch (e) { /* 忽略 */ }
    },
    async login({ username, password, code, uuid }) {
      const res = await loginApi(username.trim(), password, code, uuid)
      setToken(res.token)
      this.token = res.token
      await this.bootstrap()
      return true
    },
    async fetchInfo() {
      const res = await getInfo()
      this.user = res.user || {}
      this.roles = res.roles || []
      this.permissions = res.permissions || []
      return res
    },
    async fetchMenus() {
      const res = await getMenus()
      this.menusRaw = Array.isArray(res.data) ? res.data : []
      return this.menusRaw
    },
    async fetchSystemName() {
      try {
        const res = await getConfigKey('aigc_system_name')
        this.systemName = res.msg || ''
      } catch (e) { this.systemName = '' }
    },
    /** 刷新页面后恢复会话：用户信息 + 后端菜单 + 系统名 */
    async bootstrap() {
      if (!getToken()) throw new Error('未登录')
      this.token = getToken()
      // 用户信息失败 = 登录态无效，必须重新登录
      if (!this.roles.length) await this.fetchInfo()
      // 菜单失败不阻断进入（页面显示错误态与重试按钮）
      if (!this.menusRaw.length) {
        try {
          await this.fetchMenus()
          this.menuError = ''
        } catch (e) {
          this.menuError = '后端菜单加载失败'
        }
      }
      await this.fetchSystemName()
      this.ready = true
      this.bootstrapError = ''
      return true
    },
    async logout() {
      try { await logoutApi() } catch (e) { /* 后端不可达时也清理本机登录态 */ }
      removeToken()
      this.token = ''
      this.user = {}
      this.roles = []
      this.permissions = []
      this.menusRaw = []
      this.ready = false
    },
    setSide(side) {
      this.side = side
      try { sessionStorage.setItem(MENU_FLAG_KEY, String(side)) } catch (e) { /* 忽略 */ }
    },
    clearSession() {
      removeToken()
      this.token = ''
      this.ready = false
      this.bootstrapError = '登录状态已失效'
    }
  }
})
