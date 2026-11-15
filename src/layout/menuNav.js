import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

/** 后端菜单里「首页」的几种写法：path 为 index / portal / 空，或名字就叫首页 */
function isHomeMenu(m) {
  if (!m) return false
  if (/^首页$/.test(String(m.menuName || '').trim())) return true
  const p = String(m.path || '').replace(/^\/+|\/+$/g, '').toLowerCase()
  return p === 'index' || p === 'portal' || p === 'home'
}

/**
 * 菜单导航共用逻辑：顶栏、侧栏共用一份，避免两处各写一遍路由跳转。
 * 数据全部来自 session.topMenus（后端 /getMenus 按 menuFlag 建树），
 * 前端只决定「显示在哪」，不决定「显示什么」。
 *
 * 首页只有一个：后端菜单里有首页就用后端那条；没有才补一个本地入口。
 */
export function useMenuNav() {
  const route = useRoute()
  const router = useRouter()
  const session = useSessionStore()

  const menus = computed(() => session.topMenus)

  /** 后端返回的首页菜单（可能没有） */
  const homeMenu = computed(() => menus.value.find(isHomeMenu) || null)

  /** 真正渲染的导航项：有后端首页就原样用，没有才补一个本地首页 */
  const navItems = computed(() => {
    const list = menus.value.slice()
    if (!homeMenu.value) {
      list.unshift({
        menuId: 'home', menuName: '首页', path: 'index',
        menuType: 'C', children: [], synthetic: true
      })
    }
    return list
  })

  /** 当前选中 key：首页统一归到 home（后端有首页菜单时用它的 menuId） */
  const currentKey = computed(() => {
    if (route.name === 'home') return homeMenu.value ? String(homeMenu.value.menuId) : 'home'
    if (route.name === 'profile' || route.name === 'kitchen') return 'home'
    if (route.name === 'clazz') return 'clazz'
    return String(route.params.key || 'home')
  })

  /** 当前所在的「一级模块」（hybrid 模式下左侧栏展示它的子菜单）；首页不算模块 */
  const activePrimary = computed(() => menus.value.find(m => !isHomeMenu(m) && isActive(m)) || null)

  /** 一级模块下的二级菜单（真实后端数据，可能为空） */
  const sectionKids = computed(() => activePrimary.value?.children || [])

  /** 当前页在一级/二级里的中文位置，用于面包屑 */
  const crumb = computed(() => {
    if (route.name === 'home') return { parent: '', title: '首页' }
    if (route.name === 'profile') return { parent: '账户', title: '个人中心' }
    if (route.name === 'clazz') return { parent: '教务', title: '班级管理' }
    if (route.name === 'kitchen') return { parent: '开发', title: '组件总览' }
    const p = activePrimary.value
    if (!p) return { parent: '', title: route.meta.title || '' }
    const kid = (p.children || []).find(c => String(c.menuId) === currentKey.value)
    return kid
      ? { parent: p.menuName, title: kid.menuName }
      : { parent: '', title: p.menuName }
  })

  function goMenu(key) {
    const k = String(key)
    if (k === 'home') { router.push('/index'); return }

    const m = session.menusRaw.find(x => String(x.menuId) === k)
    // 首页类菜单（后端叫首页 / path 指向 index）：统一进真实首页，不再跳占位页
    if (isHomeMenu(m)) { router.push('/index'); return }
    // 后端菜单里「班级管理」直接进本轮已实现的真实页面
    if (m && (/班级/.test(m.menuName || '') || /clazz/i.test(m.path || ''))) {
      router.push('/clazz')
      return
    }
    router.push(`/module/${k}`)
  }

  /** 点击一级菜单：有子菜单就进第一个子项，否则进它自己 */
  function goSection(m) {
    const kids = (m.children || []).filter(k => k.menuType !== 'F')
    if (kids.length) goMenu(kids[0].menuId)
    else goMenu(m.menuId)
  }

  /** 某个一级菜单是否处于选中/激活（自身或任一子项是当前路由） */
  function isActive(m) {
    if (String(m.menuId) === currentKey.value) return true
    return (m.children || []).some(c => String(c.menuId) === currentKey.value)
  }

  return {
    session, menus, navItems, homeMenu, currentKey, activePrimary, sectionKids,
    crumb, goMenu, goSection, isActive
  }
}
