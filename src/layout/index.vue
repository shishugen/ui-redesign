<template>
  <div ref="shellRef" class="shell">
    <Navbar />
    <div class="shell__body">
      <SideMenu v-if="showRail" :variant="session.menuLayout" class="shell__rail" />
      <div class="shell__col">
        <main ref="mainRef" class="shell__main">
          <router-view v-slot="{ Component }">
            <component :is="Component" :key="route.fullPath" />
          </router-view>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './Navbar.vue'
import SideMenu from './SideMenu.vue'
import { useSessionStore } from '@/stores/session'
import { useMenuNav } from './menuNav'

const route = useRoute()
const session = useSessionStore()
const shellRef = ref(null)
const mainRef = ref(null)
const { activePrimary } = useMenuNav()

// top 模式不显示左栏；side 模式常驻；hybrid 只在进入某个模块后显示二级导航。
// 首页不显示左栏 —— 否则顶部一级菜单和左栏目录会同时出现第二个「首页」。
const showRail = computed(() => {
  if (session.menuLayout === 'side') return true
  if (session.menuLayout === 'hybrid') {
    const p = activePrimary.value
    return !!p && (p.children || []).length > 0
  }
  return false
})

watch(() => route.fullPath, () => {
  if (mainRef.value) mainRef.value.scrollTop = 0
})

// 真正可滚动的是 .shell__main；鼠标停在顶栏 / 左栏时，滚轮默认不会滚主内容，
// 用户会以为「滚动条滚不动」。这里把这类滚轮事件转发给主内容区；
// 事件目标自身处于可滚动容器（侧栏、下拉、内嵌列表）时保持浏览器默认行为。
function onShellWheel(e) {
  const main = mainRef.value
  if (!main || !e.deltaY) return
  let el = e.target instanceof Element ? e.target : null
  while (el && el !== main && el !== shellRef.value) {
    const cs = getComputedStyle(el)
    if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) return
    el = el.parentElement
  }
  if (el === main) return
  const max = main.scrollHeight - main.clientHeight
  if (max <= 0) return
  const before = main.scrollTop
  main.scrollTop = Math.max(0, Math.min(max, before + e.deltaY))
  if (main.scrollTop !== before) e.preventDefault()
}
onMounted(() => shellRef.value?.addEventListener('wheel', onShellWheel, { passive: false }))
onUnmounted(() => shellRef.value?.removeEventListener('wheel', onShellWheel))
</script>

<style lang="scss" scoped>
.shell {
  height: 100%; min-height: 0;
  display: flex; flex-direction: column;
  background: var(--bg); overflow: hidden;
}
.shell__body { flex: 1; min-height: 0; display: flex; align-items: stretch; }
.shell__col { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.shell__main { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }

@media (max-width: 960px) {
  .shell__rail { display: none; }
}
</style>
