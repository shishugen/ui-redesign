<template>
  <aside class="rail" :class="{ 'is-collapsed': collapsed }">
    <!-- 头部：hybrid 显示当前模块，side 显示全站导航 -->
    <div class="rail__hd">
      <span class="rail__lab">{{ variant === 'hybrid' ? (activePrimary ? t('当前模块') : t('模块目录')) : t('全站导航') }}</span>
      <span class="chip" v-if="!collapsed">{{ headerCount }}</span>
    </div>

    <nav class="rail__nav" :aria-label="t('左侧导航')">
      <!-- hybrid：当前模块的二级菜单 -->
      <template v-if="variant === 'hybrid'">
        <div v-if="activePrimary" class="rail__sec">
          <span class="rail__sec-n">{{ t(activePrimary.menuName) }}</span>
        </div>

        <template v-if="list.length">
          <button
            v-for="c in list" :key="c.menuId" class="it it--kid"
            :class="{ on: currentKey === String(c.menuId) }"
            :title="collapsed ? t(c.menuName) : ''" @click="goMenu(c.menuId)"
          >
            <span class="it__dot" aria-hidden="true" />
            <span class="it__tx">{{ t(c.menuName) }}</span>
          </button>
        </template>
        <div v-else-if="activePrimary" class="rail__empty">
          <p>{{ t('该模块没有下级菜单') }}</p>
          <button class="rail__retry" @click="goMenu(activePrimary.menuId)">{{ t('直接进入') }}</button>
        </div>

        <!-- 首页时：展示全部一级模块，点一下进它的第一个子页；首页项只有后端那一条 -->
        <template v-else>
          <button
            v-for="m in navItems" :key="m.menuId" class="it"
            :class="{ on: isActive(m) }" :title="collapsed ? t(m.menuName) : ''"
            @click="goSection(m)"
          >
            <span class="it__ico" :class="{ 'is-home': isHome(m) }" aria-hidden="true">
              <svg v-if="isHome(m)" viewBox="0 0 16 16"><path d="M2.6 7.1 8 3l5.4 4.1v5.4a.9.9 0 0 1-.9.9H3.5a.9.9 0 0 1-.9-.9V7.1Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" /><path d="M6.4 13.4V9.6h3.2v3.8" fill="none" stroke="currentColor" stroke-width="1.3" /></svg>
              <template v-else>{{ abbr(t(m.menuName)) }}</template>
            </span>
            <span class="it__tx">{{ t(m.menuName) }}</span>
            <span v-if="(m.children || []).length && !collapsed" class="it__cnt">{{ m.children.length }}</span>
          </button>
        </template>
      </template>

      <!-- side：完整两级手风琴 -->
      <template v-else>
        <div v-for="m in navItems" :key="m.menuId" class="grp">
          <button
            class="it"
            :class="{ on: isActive(m) && !hasKids(m), open: isOpen(m), parent: hasKids(m) }"
            :title="collapsed ? t(m.menuName) : ''"
            :aria-expanded="hasKids(m) ? isOpen(m) : undefined"
            @click="onParent(m)"
          >
            <span class="it__ico" :class="{ 'is-home': isHome(m) }" aria-hidden="true">
              <svg v-if="isHome(m)" viewBox="0 0 16 16"><path d="M2.6 7.1 8 3l5.4 4.1v5.4a.9.9 0 0 1-.9.9H3.5a.9.9 0 0 1-.9-.9V7.1Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" /><path d="M6.4 13.4V9.6h3.2v3.8" fill="none" stroke="currentColor" stroke-width="1.3" /></svg>
              <template v-else>{{ abbr(t(m.menuName)) }}</template>
            </span>
            <span class="it__tx">{{ t(m.menuName) }}</span>
            <span v-if="hasKids(m) && !collapsed" class="it__caret">
              <svg viewBox="0 0 10 10"><path d="M3.6 2.2 6.4 5l-2.8 2.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" /></svg>
            </span>
          </button>

          <div v-if="hasKids(m) && isOpen(m) && !collapsed" class="kids">
            <button
              v-for="c in m.children" :key="c.menuId" class="it it--kid"
              :class="{ on: currentKey === String(c.menuId) }"
              :title="t(c.menuName)" @click="goMenu(c.menuId)"
            >
              <span class="it__dot" aria-hidden="true" />
              <span class="it__tx">{{ t(c.menuName) }}</span>
            </button>
          </div>
        </div>
      </template>

      <div v-if="!menus.length" class="rail__empty">
        <template v-if="session.menuError">
          <p>{{ t(session.menuError) }}</p>
          <button class="rail__retry" @click="retry">{{ t('重新加载') }}</button>
        </template>
        <p v-else>{{ t('后端未返回「') }}{{ t(session.sideLabel) }}{{ t('」菜单') }}</p>
      </div>
    </nav>

    <div class="rail__ft">
      <button class="rail__btn" :title="collapsed ? t('展开菜单') : t('收起菜单')" @click="toggle">
        <svg viewBox="0 0 16 16" aria-hidden="true" :class="{ flip: collapsed }">
          <path d="M9.6 4.2 5.8 8l3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span v-if="!collapsed">{{ t('收起菜单') }}</span>
      </button>
      <div v-if="!collapsed" class="rail__src">{{ t('菜单来自后端 /getMenus') }}</div>
    </div>
  </aside>
</template>

<script setup>
import { t } from '@/i18n'
import { computed, ref, watch, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useMenuNav } from './menuNav'

const props = defineProps({
  variant: { type: String, default: 'hybrid' } // hybrid | side
})

const { session, menus, navItems, homeMenu, currentKey, activePrimary, sectionKids, goMenu, goSection, isActive } = useMenuNav()

const collapsed = computed(() => session.sideCollapsed)
const hasKids = m => Array.isArray(m.children) && m.children.length > 0
const abbr = name => String(name || '').trim().slice(0, 1)

/** 是否是首页那条（后端返回的，或本地补的），用来换成房子图标而不是首字 */
const isHome = m => !!m.synthetic || (!!homeMenu.value && String(m.menuId) === String(homeMenu.value.menuId))

/** hybrid 左侧列表：有当前模块就显示它的子菜单，否则显示全部一级 */
const list = computed(() => {
  if (props.variant !== 'hybrid') return []
  return activePrimary.value ? sectionKids.value : []
})

/** 头部计数：列表为空时（首页）显示一级模块总数，避免出现「0」 */
const headerCount = computed(() => {
  if (props.variant === 'side') return navItems.value.length
  return list.value.length || navItems.value.length
})

const openKeys = ref([])
const isOpen = m => openKeys.value.includes(String(m.menuId))

function syncOpen() {
  const active = menus.value.find(m => hasKids(m) && isActive(m))
  if (active) {
    const k = String(active.menuId)
    if (!openKeys.value.includes(k)) openKeys.value = [...openKeys.value, k]
  }
}
onMounted(syncOpen)
watch([currentKey, menus], syncOpen)

function onParent(m) {
  if (!hasKids(m)) { goMenu(m.menuId); return }
  const k = String(m.menuId)
  openKeys.value = isOpen(m) ? openKeys.value.filter(x => x !== k) : [...openKeys.value, k]
}
function toggle() { session.setSideCollapsed(!collapsed.value) }
async function retry() {
  try {
    await session.fetchMenus()
    session.menuError = ''
    message.success(t('菜单已重新加载'))
  } catch (e) { /* 拦截器已提示 */ }
}
</script>

<style lang="scss" scoped>
.rail {
  width: var(--rail-w); flex: none; height: 100%; min-height: 0;
  display: flex; flex-direction: column;
  background: var(--panel);
  border-right: 1px solid var(--line);
  transition: width .18s cubic-bezier(.2, .7, .2, 1);
}
.rail.is-collapsed { width: var(--rail-w-collapsed); }

.rail__hd {
  flex: none; height: 44px; display: flex; align-items: center; gap: 8px;
  padding: 0 16px;
}
.rail__lab { font-size: 11.5px; color: var(--ink-4); letter-spacing: .04em; }
.rail__hd .chip { margin-left: auto; height: 18px; min-width: 18px; font-size: 11px; }

.rail__nav { flex: 1; min-height: 0; overflow-y: auto; padding: 2px 10px 12px; }
.rail__nav::-webkit-scrollbar { width: 6px; }
.rail__nav::-webkit-scrollbar-thumb { background: var(--line-2); border: 2px solid var(--panel); border-radius: 99px; }

/* 当前模块分组标题 */
.rail__sec {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 6px 7px;
}
.rail__sec-n {
  font-size: 11.5px; font-weight: 600; color: var(--ink-3);
  letter-spacing: .02em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rail.is-collapsed .rail__sec { display: none; }

/* 菜单项 */
.it {
  position: relative; width: 100%; height: 38px; display: flex; align-items: center; gap: 9px;
  padding: 0 10px; margin: 2px 0; border: 0; border-radius: var(--r-sm);
  background: transparent; color: var(--ink-2);
  font-size: 13px; text-align: left; cursor: pointer;
  transition: background .14s ease, color .14s ease;
}
.it:hover { background: var(--bg); color: var(--ink); }
.it.on { background: var(--pri-50); color: var(--pri); font-weight: 600; }
.it.on::before {
  content: ""; position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px;
  border-radius: 0 3px 3px 0; background: var(--pri);
}
.it__ico {
  width: 22px; height: 22px; flex: none; display: grid; place-items: center;
  border-radius: 6px; background: var(--bg); color: var(--ink-3);
  font-size: 11.5px; font-weight: 600;
}
.it__ico svg { width: 15px; height: 15px; }
.it.on .it__ico { background: #fff; color: var(--pri); }
.it__tx { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.it__cnt { font-size: 11px; color: var(--ink-4); font-variant-numeric: tabular-nums; }
.it__caret { display: grid; place-items: center; width: 14px; height: 14px; color: var(--ink-4); }
.it__caret svg { width: 12px; height: 12px; transition: transform .16s ease; }
.it.open .it__caret svg { transform: rotate(90deg); }

/* 二级项：小圆点代替图标 */
.it--kid { height: 34px; font-size: 12.5px; padding-left: 12px; }
.it__dot {
  width: 5px; height: 5px; border-radius: 50%; flex: none;
  background: var(--line-2); margin: 0 7px 0 3px;
}
.it--kid.on .it__dot { background: var(--pri); }
.kids { padding-left: 10px; margin-bottom: 4px; }
.kids .it--kid { padding-left: 4px; }

/* 折叠态 */
.rail.is-collapsed .it { justify-content: center; padding: 0; }
.rail.is-collapsed .it__tx,
.rail.is-collapsed .it__cnt,
.rail.is-collapsed .it__caret,
.rail.is-collapsed .it__dot { display: none; }
.rail.is-collapsed .it.on::before { top: 6px; bottom: 6px; }

.rail__empty { padding: 14px 10px; font-size: 12.5px; color: var(--ink-4); line-height: 1.7; }
.rail__empty p { margin: 0 0 8px; }
.rail__retry {
  border: 1px solid var(--line); background: var(--panel); color: var(--pri);
  border-radius: var(--r-xs); font-size: 12px; padding: 3px 10px; cursor: pointer;
}
.rail__retry:hover { background: var(--pri-50); border-color: var(--pri-200); }

.rail__ft {
  flex: none; padding: 10px; border-top: 1px solid var(--line-3);
  display: flex; flex-direction: column; gap: 6px;
}
.rail__btn {
  display: flex; align-items: center; gap: 8px; justify-content: center;
  height: 32px; border: 1px solid var(--line); border-radius: var(--r-sm);
  background: var(--panel); color: var(--ink-3); font-size: 12.5px; cursor: pointer;
  transition: .14s ease;
}
.rail__btn:hover { color: var(--pri); border-color: var(--pri-200); background: var(--pri-50); }
.rail__btn svg { width: 14px; height: 14px; transition: transform .16s ease; }
.rail__btn svg.flip { transform: rotate(180deg); }
.rail__src { font-size: 11px; color: var(--ink-4); text-align: center; }
.rail.is-collapsed .rail__src { display: none; }
</style>
