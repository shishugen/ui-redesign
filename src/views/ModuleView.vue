<template>
  <div class="page page-in" :class="{ 'page--flush': !!migratedView }">
    <PageHead
      v-show="!migratedView"
      :crumb="isProfile ? [t('账户'), t('个人中心')] : [t('模块'), title]"
      :title="title"
      :sub="subtitle"
    >
      <template #acts>
        <span class="tag" :class="isProfile ? 'ok' : 'pri'">
          <span class="dot" :class="isProfile ? 'ok' : 'pri'" />
          {{ isProfile ? t('真实会话') : t('真实菜单') }}
        </span>
      </template>
    </PageHead>

    <!-- 已迁移页面：后端菜单 component 命中白名单时直接渲染真实视图 -->
    <component v-if="migratedView" :is="migratedView" />

    <template v-if="!migratedView && isProfile">
      <div class="grid main-side">
        <PanelCard :title="t('当前登录用户')" sub="GET /getInfo">
          <div class="kv kv--2">
            <div v-for="f in userFields" :key="f.k" class="kv__i">
              <span class="kv__k">{{ t(f.k) }}</span>
              <span class="kv__v">{{ t(f.v) }}</span>
            </div>
          </div>
        </PanelCard>

        <PanelCard :title="t('当前会话')" :sub="t('前端运行状态 · 非接口数据')">
          <div class="kv">
            <div v-for="f in sessionFields" :key="f.k" class="kv__i">
              <span class="kv__k">{{ t(f.k) }}</span>
              <span class="kv__v">{{ t(f.v) }}</span>
            </div>
          </div>
        </PanelCard>
      </div>
    </template>

    <template v-else-if="!migratedView">
      <div class="note info">
        <span class="dot pri" />
        <span>
          {{ t('该模块的业务页面仍在主项目') }} <code>ui/src/views/</code> {{ t('下，本次改版只重做了登录、外壳、首页与班级管理。 下面展示的是后端') }} <code>/getMenus</code> {{ t('针对本模块返回的真实记录。') }}
        </span>
      </div>

      <div class="grid main-side">
        <div class="stack">
          <PanelCard :title="t('菜单记录')" sub="GET /getMenus">
            <div v-if="menu" class="kv kv--2">
              <div v-for="f in menuFields" :key="f.k" class="kv__i">
                <span class="kv__k">{{ t(f.k) }}</span>
                <span class="kv__v mono">{{ t(f.v) }}</span>
              </div>
            </div>
            <div v-else class="empty" style="margin:0">
              <div class="empty__mark">·</div>
              <div class="empty__t">{{ t('后端菜单里没有这条记录') }}</div>
              <div class="empty__d">menuId = {{ route.params.key }}</div>
            </div>
          </PanelCard>

          <PanelCard :title="t('下级菜单')" :sub="t('parentId 指向本菜单 · {n} 条', { n: children.length })" flush>
            <div v-if="children.length" class="rows">
              <div v-for="c in children" :key="c.menuId" class="row">
                <span class="dot off" />
                <span class="row__name">{{ c.menuName }}</span>
                <span class="row__meta">{{ c.path }}</span>
              </div>
            </div>
            <div v-else class="empty empty--sm">
              <div class="empty__t">{{ t('该菜单在后端没有子级') }}</div>
            </div>
          </PanelCard>
        </div>

        <div class="stack">
          <PanelCard :title="t('通知公告')" :sub="t('{n} 条', { n: notices.length })" flush>
            <div class="filter">
              <a-input v-model:value="keyword" allow-clear :placeholder="t('在已返回的数据里过滤标题')">
                <template #prefix><SearchOutlined /></template>
              </a-input>
            </div>
            <div v-if="filteredNotices.length" class="rows">
              <div v-for="(n, i) in filteredNotices" :key="i" class="row notice-row">
                <span class="dot" :class="i % 2 ? 'off' : 'pri'" />
                <span class="row__name notice-name">{{ n.noticeTitle || n.title || t('（接口未返回标题字段）') }}</span>
                <span class="row__meta">{{ (n.createTime || '').slice(5, 10) }}</span>
              </div>
            </div>
            <div v-else class="empty empty--sm">
              <div class="empty__t">{{ notices.length ? t('过滤后没有匹配记录') : t('公告接口未返回数据') }}</div>
              <div class="empty__d">{{ t('过滤只在真实返回的数据上进行') }}</div>
            </div>
          </PanelCard>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { SearchOutlined } from '@ant-design/icons-vue'
import PageHead from '@/components/PageHead.vue'
import PanelCard from '@/components/PanelCard.vue'
import { useSessionStore } from '@/stores/session'
import { listNotice } from '@/api/system'

const route = useRoute()
const session = useSessionStore()
const isProfile = computed(() => route.name === 'profile')

const menu = computed(() => session.menusRaw.find(m => String(m.menuId) === String(route.params.key)) || null)

// 已迁移视图白名单：component 值来自真实 /getMenus，命中就渲染真实页面。
// 其余菜单仍走下方占位说明；全量 import.meta.glob 自动映射见 D19。
const MIGRATED_VIEWS = {
  'manager/course/review/index': defineAsyncComponent(() => import('@/views/manager/course/review/index.vue')),
  'manager/course/course/index': defineAsyncComponent(() => import('@/views/manager/course/course/index.vue')),
  'manager/course/case/index': defineAsyncComponent(() => import('@/views/manager/course/case/index.vue')),
  'manager/course/assign/index': defineAsyncComponent(() => import('@/views/manager/course/assign/index.vue')),
  // 课程编辑需要 query.courseId；缺参数时页面自身给「缺少课程参数」空态
  'manager/course/courseEdit/index': defineAsyncComponent(() => import('@/views/manager/course/courseEdit/index.vue')),
  'training/course/course/index': defineAsyncComponent(() => import('@/views/training/course/course/index.vue')),
  'training/course/case/index': defineAsyncComponent(() => import('@/views/training/course/case/index.vue')),
  // 课程详情需要 query.courseId；缺参数时页面自身给「缺少课程参数」空态，不白屏
  'training/course/courseDetail/index': defineAsyncComponent(() => import('@/views/training/course/courseDetail/index.vue')),
  // 第十四批：排课计划（P153）
  'training/course/schedule/index': defineAsyncComponent(() => import('@/views/training/course/schedule/index.vue')),
  // 第十五批：考试管理（P067）
  'manager/exam/examManager/index': defineAsyncComponent(() => import('@/views/manager/exam/examManager/index.vue')),
  // 第十七批：课程作业（P177，父子页按角色分流：学生清单 / 教师完成看板）
  'training/learning/homework/index': defineAsyncComponent(() => import('@/views/training/learning/homework/index.vue')),
  // 第十八批：资源中心 3 页（menuId 2556 我的资源 / 2557 班级用量 / 2574 用量统计）
  'training/resource/index': defineAsyncComponent(() => import('@/views/training/resource/index.vue')),
  'training/resource/classUsage/index': defineAsyncComponent(() => import('@/views/training/resource/classUsage/index.vue')),
  'training/resource/usageStats/index': defineAsyncComponent(() => import('@/views/training/resource/usageStats/index.vue'))
}
const migratedView = computed(() => (menu.value ? MIGRATED_VIEWS[menu.value.component] || null : null))
const children = computed(() => (menu.value
  ? session.menusRaw.filter(m => String(m.parentId) === String(menu.value.menuId))
  : []))

const title = computed(() => isProfile.value ? t('个人中心') : t(menu.value?.menuName || '模块'))
const subtitle = computed(() => (isProfile.value
  ? t('字段全部来自真实接口 /getInfo，不做任何本地补全。')
  : t('后端菜单记录 · menuId {id} · path {path}', { id: route.params.key, path: menu.value?.path || t('未返回') })))

const userFields = computed(() => {
  const u = session.user || {}
  return [
    { k: 'userId', v: u.userId ?? '—' },
    { k: 'userName', v: u.userName ?? '—' },
    { k: 'nickName', v: u.nickName ?? '—' },
    { k: 'deptId', v: u.deptId ?? '—' },
    { k: 'roles', v: (session.roles || []).join(', ') || '—' },
    { k: 'permissions', v: t('{n} 项', { n: (session.permissions || []).length }) }
  ]
})

const sessionFields = computed(() => [
  { k: t('当前端'), v: t(session.sideLabel) },
  { k: t('角色'), v: t(session.roleLabel) },
  { k: t('菜单'), v: t('{n} 项（/getMenus）', { n: session.menuCount }) },
  { k: t('系统名'), v: t(session.systemName) || '—' },
  { k: t('菜单位置'), v: t({ hybrid: '顶部一级 + 左侧二级', top: '顶部横向', side: '左侧边栏' }[session.menuLayout]) }
])

const menuFields = computed(() => {
  if (!menu.value) return []
  const keys = ['menuId', 'menuName', 'parentId', 'orderNum', 'path', 'component', 'menuFlag', 'menuType', 'visible', 'perms']
  return keys.map(k => ({
    k,
    v: menu.value[k] === '' || menu.value[k] === null || menu.value[k] === undefined ? '—' : String(menu.value[k])
  }))
})

const notices = ref([])
const keyword = ref('')
const filteredNotices = computed(() => notices.value.filter(n =>
  !keyword.value || String(n.noticeTitle || n.title || '').toLowerCase().includes(keyword.value.toLowerCase())
))

onMounted(async () => {
  try {
    const res = await listNotice({ pageNum: 1, pageSize: 20 }, true)
    notices.value = Array.isArray(res?.rows) ? res.rows : (Array.isArray(res?.data) ? res.data : [])
  } catch (e) { notices.value = [] }
})
</script>

<style lang="scss" scoped>
/* 已迁移视图自带卡片与间距，去掉 .page 的 22/26px 内边距，避免顶部与左右出现大留白 */
.page--flush { padding: 0 0 20px; }

.kv { display: grid; grid-template-columns: 1fr; gap: 0; }
.kv--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 28px; }
.kv__i {
  display: flex; gap: 14px; align-items: baseline;
  padding: 9px 0; border-bottom: 1px solid var(--line-3);
}
.kv__i:last-child { border-bottom: 0; }
.kv__k { font-size: 12px; color: var(--ink-4); width: 86px; flex: none; }
.kv__v { font-size: 13px; color: var(--ink); word-break: break-all; }

.filter { padding: 13px 18px; border-bottom: 1px solid var(--line-3); }
.notice-row { align-items: flex-start; }
.notice-name { white-space: normal; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

code {
  font-family: var(--mono); font-size: 11.5px;
  background: rgba(255, 255, 255, .7); padding: 2px 5px; border-radius: 4px;
}
@media (max-width: 900px) { .kv--2 { grid-template-columns: 1fr; } }
</style>
