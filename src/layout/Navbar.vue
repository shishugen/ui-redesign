<template>
  <header class="topbar">
    <!-- 品牌：系统名来自后端 configKey aigc_system_name -->
    <div
      class="brand" role="button" tabindex="0" :title="t('回到首页')"
      @click="goMenu('home')" @keyup.enter="goMenu('home')"
    >
      <span class="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 16.4V9.2L12 5l7 4.2v7.2L12 20.6 5 16.4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M12 5v7.6l7 4.3M12 12.6 5 16.9" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
      </span>
      <span class="brand__tx">
        <span class="brand__name">{{ systemName }}</span>
        <span class="brand__sub">{{ t('AIGC 教学实训平台') }}</span>
      </span>
    </div>

    <!-- 顶部导航：首页来自后端菜单（后端没有才补一个），hybrid 只放一级；top 放完整两级（二级进下拉） -->
    <nav v-if="session.menuLayout !== 'side'" class="topnav" :aria-label="t('主导航')">
      <template v-for="m in navItems" :key="m.menuId">
        <a-dropdown v-if="kids(m)" :trigger="['hover']" placement="bottomLeft" :mouse-enter-delay="0.06">
          <button class="navi has-kids" :class="{ on: isActive(m) }" @click="goSection(m)">
            {{ t(m.menuName) }}
            <svg class="caret" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2.4 4 L5 6.6 L7.6 4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            </svg>
          </button>
          <template #overlay>
            <a-menu class="nav-drop" :selected-keys="[currentKey]" @click="({ key }) => goMenu(key)">
              <a-menu-item v-for="c in m.children" :key="String(c.menuId)">{{ t(c.menuName) }}</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <button v-else class="navi" :class="{ on: isActive(m) }" @click="goMenu(m.menuId)">{{ t(m.menuName) }}</button>
      </template>

      <button v-if="session.menuError" class="navi navi--err" @click="reloadMenus">
        {{ t(session.menuError) }} {{ t('· 重试') }}
      </button>
      <button v-else-if="!menus.length" class="navi navi--err" @click="reloadMenus">
        {{ t('后端未返回菜单 · 重试') }}
      </button>
    </nav>

    <!-- 侧边模式：显示当前位置 -->
    <div v-else class="loc">
      <button class="icon-btn" :title="t('展开/收起菜单')" @click="toggleCollapse">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      </button>
      <span class="loc__tx">
        <template v-if="crumb.parent">{{ t(crumb.parent) }}<i>/</i></template>{{ t(crumb.title) }}
      </span>
    </div>

    <div class="topbar__right">
      <LocaleSwitch />

      <!-- 菜单位置：顶部 / 左侧 / 顶部+左侧 -->
      <div class="seg" role="group" :aria-label="t('菜单展示位置')">
        <button
          v-for="opt in layoutOpts" :key="opt.v" class="seg__b"
          :class="{ on: session.menuLayout === opt.v }" :title="t(opt.t)" :aria-label="t(opt.t)"
          :aria-pressed="session.menuLayout === opt.v" @click="session.setMenuLayout(opt.v)"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" v-html="opt.icon" />
        </button>
      </div>

      <span class="vrule" />

      <button class="side-chip" :title="t('当前 {side} · 点击切换', { side: t(session.sideLabel) })" @click="toggleSide">
        <span class="dot" :class="session.side === 1 ? 'warn' : 'ok'" />
        {{ t(session.sideLabel) }}
      </button>

      <a-dropdown :trigger="['click']" placement="bottomRight">
        <button class="user">
          <span class="user__avatar">{{ session.initials }}</span>
          <span class="user__name">{{ t(session.displayName) }}</span>
          <svg class="caret" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M2.4 4 L5 6.6 L7.6 4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
          </svg>
        </button>
        <template #overlay>
          <a-menu class="user-drop" @click="onUserMenu">
            <div class="drop-id">
              <div class="drop-id__n">{{ t(session.displayName) }}</div>
              <div class="drop-id__m">{{ t(session.roleLabel) }} · userId {{ session.user.userId ?? '—' }}</div>
            </div>
            <a-menu-divider />
            <a-menu-item key="profile">{{ t('个人中心') }}</a-menu-item>
            <a-menu-item key="clazz">{{ t('班级管理') }}</a-menu-item>
            <a-menu-divider />
            <a-menu-item key="logout">{{ t('退出登录') }}</a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <button class="icon-btn only-sm" :title="t('打开菜单')" @click="drawerOpen = true">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- 移动端菜单抽屉 -->
    <a-drawer v-model:open="drawerOpen" placement="left" :width="280" :title="t('导航')" :closable="true">
      <div class="mnav">
        <template v-for="m in navItems" :key="m.menuId">
          <button
            class="mnav__i" :class="[kids(m) ? 'mnav__i--p' : '', { on: isActive(m) && !kids(m) }]"
            @click="jumpSection(m)"
          >
            {{ t(m.menuName) }}
          </button>
          <button
            v-for="c in m.children" :key="c.menuId" class="mnav__i mnav__i--k"
            :class="{ on: String(c.menuId) === currentKey }" @click="jump(c.menuId)"
          >
            {{ t(c.menuName) }}
          </button>
        </template>
        <div v-if="!menus.length" class="mnav__empty">{{ t(session.menuError || '后端未返回菜单') }}</div>
      </div>
    </a-drawer>
  </header>
</template>

<script setup>
import { t } from '@/i18n'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useSessionStore } from '@/stores/session'
import { useMenuNav } from './menuNav'
import LocaleSwitch from '@/components/LocaleSwitch.vue'

const router = useRouter()
const session = useSessionStore()
const { menus, navItems, currentKey, crumb, goMenu, goSection, isActive } = useMenuNav()

const drawerOpen = ref(false)

const systemName = computed(() => t(session.systemName || 'AI 大模型培训教学管理系统'))
const kids = m => Array.isArray(m.children) && m.children.length > 0

const LAYOUT_ICONS = {
  top: '<rect x="1.6" y="3" width="12.8" height="3.4" rx="1.1" fill="currentColor"/><rect x="1.6" y="8.4" width="12.8" height="4.6" rx="1.1" fill="currentColor" opacity=".3"/>',
  side: '<rect x="1.6" y="3" width="4.2" height="10" rx="1.1" fill="currentColor"/><rect x="7.6" y="3" width="6.8" height="10" rx="1.1" fill="currentColor" opacity=".3"/>',
  hybrid: '<rect x="1.6" y="2.4" width="12.8" height="2.8" rx="1" fill="currentColor"/><rect x="1.6" y="7" width="4.2" height="6.6" rx="1" fill="currentColor"/><rect x="7.6" y="7" width="6.8" height="6.6" rx="1" fill="currentColor" opacity=".3"/>'
}
const layoutOpts = [
  { v: 'top', t: '菜单在顶部', icon: LAYOUT_ICONS.top },
  { v: 'side', t: '菜单在左侧', icon: LAYOUT_ICONS.side },
  { v: 'hybrid', t: '顶部放一级、左侧放二级', icon: LAYOUT_ICONS.hybrid }
]

function toggleCollapse() { session.setSideCollapsed(!session.sideCollapsed) }
function toggleSide() {
  session.setSide(session.side === 1 ? 2 : 1)
  message.success(t('已切换到 {side}', { side: t(session.sideLabel) }))
  if (router.currentRoute.value.name !== 'home') router.push('/index')
}
async function reloadMenus() {
  try {
    await session.fetchMenus()
    session.menuError = ''
    message.success(t('菜单已重新加载'))
  } catch (e) { /* 拦截器已提示 */ }
}

function jump(k) { drawerOpen.value = false; goMenu(k) }
function jumpSection(m) { drawerOpen.value = false; goSection(m) }

function onUserMenu({ key }) {
  const k = String(key)
  if (k === 'profile') router.push('/user/profile')
  else if (k === 'clazz') router.push('/clazz')
  else if (k === 'logout') {
    session.logout().then(() => router.push('/login'))
  }
}
</script>

<style lang="scss" scoped>
.topbar {
  flex: none; height: var(--bar-h);
  display: flex; align-items: center; gap: 10px;
  padding: 0 16px 0 18px;
  background: rgba(255, 255, 255, .92);
  backdrop-filter: saturate(1.4) blur(10px);
  border-bottom: 1px solid var(--line);
  position: relative; z-index: 30;
}

/* —— 品牌 —— */
.brand {
  display: flex; align-items: center; gap: 10px; flex: none;
  cursor: pointer; user-select: none; padding-right: 8px;
  border-radius: var(--r-sm);
}
.brand__mark {
  width: 32px; height: 32px; border-radius: 9px; flex: none;
  display: grid; place-items: center; color: #fff;
  background: linear-gradient(135deg, #4A6BF0 0%, #2F54EB 45%, #6C4EF5 100%);
  box-shadow: 0 4px 10px rgba(47, 84, 235, .28);
}
.brand__mark svg { width: 19px; height: 19px; }
.brand__tx { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
.brand__name {
  font-size: 14.5px; font-weight: 650; letter-spacing: -.01em; color: var(--ink);
  line-height: 1.25; white-space: nowrap; max-width: 230px;
  overflow: hidden; text-overflow: ellipsis;
}
.brand__sub { font-size: 10.5px; color: var(--ink-4); line-height: 1.35; margin-top: 1px; letter-spacing: .02em; }

/* —— 顶部导航 —— */
.topnav {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 2px;
  overflow-x: auto; overflow-y: hidden; scrollbar-width: none;
  padding-left: 6px;
}
.topnav::-webkit-scrollbar { height: 0; }
.navi {
  position: relative; flex: none; display: inline-flex; align-items: center; gap: 5px;
  height: 34px; padding: 0 12px; margin: 0 1px;
  border: 0; border-radius: var(--r-sm); background: transparent;
  color: var(--ink-2); font-size: 13px; cursor: pointer; white-space: nowrap;
  transition: color .15s ease, background .15s ease;
}
.navi:hover { color: var(--ink); background: var(--bg); }
.navi.on { color: var(--pri); background: var(--pri-50); font-weight: 600; }
.navi--err { color: var(--danger); font-size: 12.5px; }
.caret { width: 10px; height: 10px; color: var(--ink-4); transition: transform .16s ease; }
.navi:hover .caret { transform: translateY(1px); }
.navi.on .caret { color: var(--pri); }

/* —— 侧边模式的位置提示 —— */
.loc { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; }
.loc__tx {
  font-size: 13px; color: var(--ink-3);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.loc__tx i { color: var(--ink-4); font-style: normal; margin: 0 6px; }

/* —— 右侧 —— */
.topbar__right { display: flex; align-items: center; gap: 10px; flex: none; margin-left: auto; }

.icon-btn {
  width: 32px; height: 32px; display: grid; place-items: center; flex: none;
  border: 1px solid var(--line); border-radius: var(--r-sm); background: var(--panel);
  color: var(--ink-3); cursor: pointer; transition: .15s ease;
}
.icon-btn:hover { border-color: var(--pri-200); color: var(--pri); background: var(--pri-50); }
.icon-btn svg { width: 15px; height: 15px; }
.icon-btn.only-sm { display: none; }

.seg {
  display: flex; gap: 2px; padding: 3px; background: var(--bg);
  border: 1px solid var(--line); border-radius: var(--r-sm);
}
.seg__b {
  width: 30px; height: 24px; display: grid; place-items: center;
  border: 0; border-radius: 6px; background: transparent;
  color: var(--ink-4); cursor: pointer; transition: .15s ease;
}
.seg__b :deep(svg), .seg__b svg { width: 15px; height: 15px; }
.seg__b:hover { color: var(--ink-2); }
.seg__b.on { background: var(--panel); color: var(--pri); box-shadow: var(--sh-1); }

.vrule { width: 1px; height: 20px; background: var(--line); }

.side-chip {
  display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 11px;
  border: 1px solid var(--line); border-radius: 99px; background: var(--panel);
  color: var(--ink-2); font-size: 12.5px; cursor: pointer; white-space: nowrap;
  transition: .15s ease;
}
.side-chip:hover { border-color: var(--pri-200); background: var(--pri-50); color: var(--pri); }

.user {
  display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 6px 0 3px;
  border: 1px solid transparent; background: transparent; cursor: pointer;
  border-radius: 99px; transition: .15s ease;
}
.user:hover { background: var(--bg); border-color: var(--line); }
.user__avatar {
  width: 28px; height: 28px; border-radius: 50%; flex: none;
  background: linear-gradient(135deg, #4A6BF0, #6C4EF5); color: #fff;
  display: grid; place-items: center;
  font-size: 12px; font-weight: 600;
}
.user__name {
  font-size: 13px; color: var(--ink-2); max-width: 96px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.user .caret { color: var(--ink-4); }

/* 下拉内的身份块 */
.drop-id { padding: 9px 12px 10px; }
.drop-id__n { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.drop-id__m { font-size: 11.5px; color: var(--ink-4); margin-top: 4px; }

:deep(.nav-drop) { min-width: 172px; padding: 5px; border-radius: var(--r); }
:deep(.nav-drop .ant-menu-item) { height: 34px; line-height: 34px; font-size: 13px; margin: 0; width: 100%; }
:deep(.user-drop .ant-menu-item) { height: 34px; line-height: 34px; }

/* 移动端抽屉里的导航 */
.mnav { display: flex; flex-direction: column; gap: 2px; }
.mnav__i {
  text-align: left; border: 0; background: transparent; cursor: pointer;
  padding: 10px 12px; border-radius: var(--r-sm); font-size: 13.5px; color: var(--ink-2);
}
.mnav__i:hover { background: var(--bg); }
.mnav__i.on { background: var(--pri-50); color: var(--pri); font-weight: 600; }
.mnav__i--p { font-weight: 600; color: var(--ink); }
.mnav__i--k { padding-left: 26px; font-size: 13px; color: var(--ink-3); }
.mnav__empty { padding: 16px 12px; font-size: 13px; color: var(--ink-4); }

@media (max-width: 1180px) {
  .brand__name { max-width: 150px; font-size: 13.5px; }
  .brand__sub { display: none; }
  .user__name { display: none; }
}
@media (max-width: 960px) {
  .topnav { display: none; }
  .topbar { gap: 8px; padding: 0 12px; }
  .icon-btn.only-sm { display: grid; }
  .seg, .vrule { display: none; }
  .side-chip { display: none; }
  .brand__name { max-width: 140px; }
  .loc { flex: 1; }
}
</style>
