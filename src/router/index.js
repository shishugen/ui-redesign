import { createRouter, createWebHashHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { getToken, removeToken } from '@/utils/auth'
import Layout from '@/layout/index.vue'

// hash 模式：静态部署到任意子路径都能正常路由
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login.vue'),
    meta: { public: true, title: '登录' }
  },
  // B01 迁移：静态路由 path / name 沿用旧项目 ui/src/router/index.js
  {
    path: '/register',
    component: () => import('@/views/register.vue'),
    meta: { public: true, title: '注册' }
  },
  {
    path: '/portal',
    component: () => import('@/views/index.vue'),
    meta: { public: true, title: '门户' }
  },
  {
    path: '/401',
    component: () => import('@/views/error/401.vue'),
    meta: { public: true, title: '无访问权限' }
  },
  {
    path: '/redirect/:path(.*)',
    name: 'redirect',
    component: () => import('@/views/redirect/index.vue'),
    meta: { public: true, title: '重定向' }
  },
  {
    path: '/iframe',
    name: 'iframe',
    component: () => import('@/views/redirect/iframe/index.vue'),
    meta: { public: true, title: '内嵌页面' }
  },
  {
    // B03 第十六批：在线学习（P220）。整页独立：自带顶栏、100vh、不进后台外壳。
    // path / name 沿用旧项目 router/index.js 的 /online/learning · onlineLearning
    path: '/online/learning',
    name: 'onlineLearning',
    component: () => import('@/views/training/online/learning/index.vue'),
    meta: { title: '在线学习' }
  },
  {
    // B03 第十七批：章节作业答题页（P174）。旧路由 /homework-do/:suffix?，同样顶在 Layout 之外
    // （新标签页打开，没有 TagsView，标题自己设）
    path: '/homework-do/:suffix?',
    name: 'homework-do',
    component: () => import('@/views/training/learning/homework/do.vue'),
    meta: { title: '开始作业' }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/index',
    children: [
      {
        path: 'index',
        name: 'home',
        component: () => import('@/views/training/index.vue'),
        meta: { title: '首页', key: 'home' }
      },
      {
        path: 'module/:key',
        name: 'module',
        component: () => import('@/views/ModuleView.vue'),
        meta: { title: '模块' }
      },
      {
        // B01：path / name / meta 沿用旧项目 router/index.js 的 /user/profile
        path: 'user/profile',
        name: 'Profile',
        component: () => import('@/views/system/user/profile/index.vue'),
        meta: { title: '个人中心', icon: 'user' }
      },
      {
        // 迁移期兼容：旧预览链接 /profile 不中断
        path: 'profile',
        redirect: '/user/profile'
      },
      {
        // 班级管理预览：未登录也能看页面骨架与登录引导，登录后自动加载真实数据
        path: 'clazz',
        name: 'clazz',
        component: () => import('@/views/manager/clazz/index.vue'),
        meta: { public: true, title: '班级管理', key: 'clazz' }
      },
      {
        // B02：课程审核，后端菜单 component = manager/course/review/index
        // 菜单点击走 /module/:key 由 ModuleView 按 component 分发；此路由供直接访问与验收
        path: 'course/review',
        name: 'courseReview',
        component: () => import('@/views/manager/course/review/index.vue'),
        meta: { title: '课程审核', key: 'courseReview' }
      },
      // B02 第五批：课程管理 / 案例管理 / 前端课程显示 / 前端案例显示。
      // 菜单点击走 /module/:key 由 ModuleView 按 component 分发；静态路由供直接访问与验收
      {
        path: 'courseManager',
        name: 'courseManager',
        component: () => import('@/views/manager/course/course/index.vue'),
        meta: { title: '课程管理', key: 'courseManager' }
      },
      {
        // B02 第十二批：课程分配（P035），后端菜单 path = courseAssign / component = manager/course/assign/index
        path: 'courseAssign',
        name: 'courseAssign',
        component: () => import('@/views/manager/course/assign/index.vue'),
        meta: { title: '课程分配', key: 'courseAssign' }
      },
      {
        path: 'caseManager',
        name: 'caseManager',
        component: () => import('@/views/manager/course/case/index.vue'),
        meta: { title: '案例管理', key: 'caseManager' }
      },
      {
        path: 'course-center/course',
        name: 'courseCenter',
        component: () => import('@/views/training/course/course/index.vue'),
        meta: { title: '课程中心', key: 'courseCenter' }
      },
      {
        path: 'course-center/case',
        name: 'caseCenter',
        component: () => import('@/views/training/course/case/index.vue'),
        meta: { title: '案例中心', key: 'caseCenter' }
      },
      {
        // B02 第六批：前端课程详情（P147）。旧路由由后端菜单生成，
        // path 沿用旧值 /course-center/course/courseDetail，query 带 courseId + encodedParam
        path: 'course-center/course/courseDetail',
        name: 'courseDetail',
        component: () => import('@/views/training/course/courseDetail/index.vue'),
        meta: { title: '课程详情', key: 'courseDetail' }
      },
      {
        // B02 第七批：课程编辑（P049-A）。旧路由由后端菜单生成，
        // path 沿用旧值 /manager/course/courseManager/courseEdit，query 带 courseId + encodedParam
        path: 'manager/course/courseManager/courseEdit',
        name: 'courseEdit',
        component: () => import('@/views/manager/course/courseEdit/index.vue'),
        meta: { title: '课程编辑', key: 'courseEdit' }
      },
      {
        // B02 第十四批：排课计划（P153）。后端菜单 path = schedule / component = training/course/schedule/index
        path: 'schedule',
        name: 'schedule',
        component: () => import('@/views/training/course/schedule/index.vue'),
        meta: { title: '排课计划', key: 'schedule' }
      },
      {
        // B03 第十七批：课程作业（P174/P180 域内的 homework 主页）。
        // 后端菜单 path = homework / component = training/learning/homework/index（menuId 2554）
        path: 'homework',
        name: 'homework',
        component: () => import('@/views/training/learning/homework/index.vue'),
        meta: { title: '课程作业', key: 'homework' }
      },
      {
        // B02 第十五批：考试管理（P067）。后端菜单 path = examManager / component = manager/exam/examManager/index
        path: 'examManager',
        name: 'examManager',
        component: () => import('@/views/manager/exam/examManager/index.vue'),
        meta: { title: '考试管理', key: 'examManager' }
      },
      {
        // B03 第十八批：资源中心 3 页。后端菜单 path / component 一一对应
        //   2556 我的资源   path=my-resource  component=training/resource/index
        //   2557 班级用量   path=class-usage  component=training/resource/classUsage/index
        //   2574 用量统计   path=usage-stats  component=training/resource/usageStats/index
        // 菜单点击走 /module/:key 由 ModuleView 按 component 分发；静态路由供直接访问与验收
        path: 'my-resource',
        name: 'myResource',
        component: () => import('@/views/training/resource/index.vue'),
        meta: { title: '我的资源', key: 'myResource' }
      },
      {
        path: 'class-usage',
        name: 'classUsage',
        component: () => import('@/views/training/resource/classUsage/index.vue'),
        meta: { title: '班级用量', key: 'classUsage' }
      },
      {
        path: 'usage-stats',
        name: 'usageStats',
        component: () => import('@/views/training/resource/usageStats/index.vue'),
        meta: { title: '用量统计', key: 'usageStats' }
      },
      {
        // 组件总览：本轮样式验收页，不需要登录，不请求任何接口
        path: 'kitchen',
        name: 'kitchen',
        component: () => import('@/views/kitchen/KitchenSink.vue'),
        meta: { public: true, title: '组件总览', key: 'kitchen' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/error/404.vue'),
    meta: { public: true, title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() { return { top: 0 } }
})

router.beforeEach(async (to) => {
  const session = useSessionStore()
  if (to.meta.public) {
    if (to.path === '/login' && getToken()) return { path: '/index' }
    // 已登录用户打开 /clazz 时，也要恢复真实用户信息与菜单
    if (getToken() && !session.ready) {
      try { await session.bootstrap() } catch (e) { session.clearSession() }
    }
    return true
  }
  // 没有 token 一律回登录页
  if (!getToken()) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  // 刷新页面后重新拉真实用户信息与后端菜单，取不到就视为登录失效
  if (!session.ready) {
    try {
      await session.bootstrap()
    } catch (e) {
      removeToken()
      session.clearSession()
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }
  return true
})

export default router
