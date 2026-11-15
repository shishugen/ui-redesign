<template>
  <div ref="previewRef" class="cp" :style="{ height: typeof height === 'number' ? height + 'px' : height }">
    <!-- 左：内容 -->
    <div ref="contentScrollRef" class="cp__scroll" @scroll="handleScroll">
      <div class="cp__body" v-html="htmlContent" />
      <a-divider v-if="htmlContent">{{ t('End') }}</a-divider>
      <div v-if="!htmlContent" class="cp__empty" role="status">
        <div class="cp__empty-t">{{ t('该章节还没有内容') }}</div>
        <div class="cp__empty-d">{{ t('在「章节编辑」里补充章节内容后，这里会渲染出完整预览。') }}</div>
      </div>
    </div>

    <!-- 右：目录导航 -->
    <div v-show="hasNaviBar" class="cp__nav" :class="{ 'cp__nav--collapsed': !navVisible }">
      <button v-show="!navVisible" type="button" class="cp__nav-toggle" :title="t('展开目录')"
              :aria-label="t('展开目录')" @click="toggleNav">
        ◀ {{ t('目录') }}
      </button>

      <div v-show="navVisible" class="cp__nav-panel">
        <div class="cp__nav-hd">
          <span>{{ t('目录导航') }}</span>
          <button type="button" class="cp__nav-close" :title="t('收起目录')" :aria-label="t('收起目录')"
                  @click="toggleNav">×</button>
        </div>
        <ul v-if="navList.length" class="cp__nav-list">
          <li v-for="item in navList" :key="item.id"
              class="cp__nav-item" :class="[`cp__nav-item--lv${item.level}`, { 'is-active': activeId === item.id }]"
              :title="item.text" tabindex="0"
              @click="scrollToHeading(item)"
              @keydown.enter.prevent="scrollToHeading(item)">
            {{ item.text }}
          </li>
        </ul>
        <div v-else class="cp__nav-empty">{{ t('暂无目录') }}</div>
      </div>
    </div>

    <!-- 回到顶部 -->
    <button v-show="showBackTop" type="button" class="cp__top"
            :style="{ right: navVisible ? '264px' : '16px' }"
            :title="t('回到顶部')" :aria-label="t('回到顶部')" @click="backToTop">↑</button>
  </div>
</template>

<script setup name="Preview">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { t } from '@/i18n'

const props = defineProps({
  // 富文本内容
  content: { type: String, default: '' },
  // 高度（数字按 px）
  height: { type: [String, Number], required: false, default: document.documentElement.clientHeight - 100 },
  // 是否展示目录导航
  hasNaviBar: { type: Boolean, default: true }
})

const htmlContent = ref('')
const previewRef = ref(null)
const contentScrollRef = ref(null)

const navVisible = ref(false)
const navList = ref([])
const activeId = ref('')
const showBackTop = ref(false)

// 非响应式缓存：标题 DOM 与滚动状态，避免把 DOM 放进响应式数据
let headingEls = []
let isProgrammaticScroll = false
let scrollTimer = null

function buildNav() {
  const root = contentScrollRef.value
  if (!root) return
  const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const list = []
  headingEls = []
  headings.forEach((h, idx) => {
    if (!h.id) h.id = 'preview-heading-' + idx
    headingEls.push(h)
    list.push({ id: h.id, text: h.textContent.trim(), level: Number(h.tagName.substring(1)), idx })
  })
  navList.value = list
  if (list.length && !activeId.value) {
    activeId.value = list[0].id
    navVisible.value = true
  }
}

function toggleNav() { navVisible.value = !navVisible.value }

// 只滚内部容器，不调 scrollIntoView，避免带动外层页面
function scrollToHeading(item) {
  const root = contentScrollRef.value
  const el = headingEls[item.idx]
  if (!root || !el) return
  isProgrammaticScroll = true
  root.scrollTop = el.offsetTop - 8
  activeId.value = item.id
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => { isProgrammaticScroll = false }, 700)
}

function handleScroll() {
  const root = contentScrollRef.value
  if (!root) return
  showBackTop.value = root.scrollTop > 200
  if (!isProgrammaticScroll) updateActiveHeading()
}

function updateActiveHeading() {
  if (!navList.value.length || !headingEls.length) return
  const root = contentScrollRef.value
  if (!root) return
  const scrollTop = root.scrollTop
  let currentIdx = 0
  for (let i = 0; i < headingEls.length; i++) {
    const el = headingEls[i]
    if (el && el.offsetTop - 20 <= scrollTop) currentIdx = i
    else break
  }
  activeId.value = navList.value[currentIdx].id
}

function backToTop() {
  const root = contentScrollRef.value
  if (!root) return
  isProgrammaticScroll = true
  root.scrollTop = 0
  if (navList.value.length) activeId.value = navList.value[0].id
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => { isProgrammaticScroll = false }, 700)
}

/* ---------- 代码块「复制」按钮 ---------- */
let codeObserver = null

function initCodeCopy() {
  const el = previewRef.value
  if (!el) return
  enhancePreBlocks(el)
  if (window.MutationObserver) {
    codeObserver = new MutationObserver(() => enhancePreBlocks(el))
    codeObserver.observe(el, { childList: true, subtree: true })
  }
}

function enhancePreBlocks(root) {
  root.querySelectorAll('pre').forEach((pre) => {
    if (pre.dataset.copyBound === '1') return
    pre.dataset.copyBound = '1'
    pre.style.position = pre.style.position || 'relative'

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'cp-code-copy'
    btn.textContent = t('复制代码')
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const codeEl = pre.querySelector('code')
      const text = (codeEl ? codeEl.innerText : pre.innerText || '').trim().replaceAll('\u00A0', ' ')
      copyTextToClipboard(text)
        .then(() => { btn.textContent = t('已复制'); setTimeout(() => { btn.textContent = t('复制代码') }, 3000) })
        .catch(() => { btn.textContent = t('失败'); setTimeout(() => { btn.textContent = t('复制代码') }, 3000) })
    })
    pre.appendChild(btn)
  })
}

function copyTextToClipboard(raw) {
  const text = String(raw).replace(t('复制代码'), '').replaceAll('\u00A0', ' ')
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      ok ? resolve() : reject(new Error('copy failed'))
    } catch (err) { reject(err) }
  })
}

onMounted(() => {
  if (!props.content) return
  htmlContent.value = props.content
  if (props.hasNaviBar) nextTick(buildNav)
  initCodeCopy()
})

onBeforeUnmount(() => {
  if (codeObserver) { codeObserver.disconnect(); codeObserver = null }
  if (scrollTimer) clearTimeout(scrollTimer)
})
</script>

<style scoped>
.cp {
  position: relative; display: flex; overflow: hidden;
  line-height: 1.8; font-size: 14px; word-wrap: break-word;
  background: var(--panel); border-radius: var(--r);
}
.cp__scroll {
  position: relative; flex: 1; min-width: 0; box-sizing: border-box;
  padding: 14px 18px; overflow-y: auto; overflow-x: hidden;
  scroll-behavior: smooth; word-break: break-word;
}
.cp__body :deep(img) { max-width: 100%; height: auto; }
.cp__body :deep(table) { width: 100%; border-collapse: collapse; margin: 10px 0; }
.cp__body :deep(th), .cp__body :deep(td) { border: 1px solid var(--line); padding: 6px 10px; font-size: 13px; }
.cp__body :deep(pre) {
  position: relative; margin: 12px 0; padding: 14px 16px;
  background: var(--bg); border: 1px solid var(--line-3); border-radius: var(--r-sm);
  overflow-x: auto; font-family: var(--mono); font-size: 12.5px; line-height: 1.7;
}
.cp__body :deep(h1), .cp__body :deep(h2), .cp__body :deep(h3) { color: var(--ink); line-height: 1.4; }
.cp__body :deep(a) { color: var(--pri); }

.cp__empty { padding: 40px 12px; text-align: center; }
.cp__empty-t { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.cp__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }

/* 目录侧栏 */
.cp__nav { position: relative; width: 240px; flex: none; transition: width .3s ease; }
.cp__nav--collapsed { width: 0; }
.cp__nav-toggle {
  position: absolute; top: 6px; left: 0; z-index: 30;
  padding: 4px 9px; font-size: 12px; color: var(--ink-3);
  background: var(--bg); border: 1px solid var(--line-2); border-radius: var(--r-xs);
  cursor: pointer; white-space: nowrap;
}
.cp__nav-toggle:hover { color: var(--pri); border-color: var(--pri-200); }
.cp__nav-panel {
  position: absolute; top: 0; right: 0; width: 240px; height: 98%;
  overflow-y: auto; background: var(--panel); border-left: 1px solid var(--line-3);
}
.cp__nav-hd {
  position: sticky; top: 0; z-index: 1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 10px; font-size: 12.5px; font-weight: 650; color: var(--ink);
  background: var(--bg-soft); border-bottom: 1px solid var(--line-3);
}
.cp__nav-close {
  background: none; border: 0; cursor: pointer;
  color: var(--ink-4); font-size: 17px; line-height: 1;
}
.cp__nav-close:hover { color: var(--ink); }
.cp__nav-list { list-style: none; margin: 0; padding: 4px 8px; }
.cp__nav-item {
  padding: 3px 8px; font-size: 12px; color: var(--ink-2);
  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  border-left: 2px solid transparent; border-radius: 0 var(--r-xs) var(--r-xs) 0;
  transition: background .16s, color .16s;
}
.cp__nav-item:hover, .cp__nav-item:focus-visible { background: var(--bg); color: var(--pri); outline: none; }
.cp__nav-item.is-active { color: var(--pri); background: var(--pri-50); border-left-color: var(--pri); }
.cp__nav-item--lv2 { padding-left: 20px; }
.cp__nav-item--lv3 { padding-left: 30px; }
.cp__nav-item--lv4 { padding-left: 40px; }
.cp__nav-item--lv5 { padding-left: 50px; }
.cp__nav-item--lv6 { padding-left: 60px; }
.cp__nav-empty { padding: 14px 12px; font-size: 12px; color: var(--ink-4); }

.cp__top {
  position: absolute; bottom: 16px; z-index: 20;
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--panel); border: 1px solid var(--line-2); color: var(--ink-3);
  cursor: pointer; box-shadow: var(--sh-2); font-size: 15px;
}
.cp__top:hover { color: var(--pri); border-color: var(--pri-200); }

@media (prefers-reduced-motion: reduce) {
  .cp__nav, .cp__nav-item, .cp__scroll { transition: none; scroll-behavior: auto; }
}
</style>

<style>
/* 注入到 v-html 里的复制按钮走全局样式（scoped 选不到动态节点） */
.cp-code-copy {
  position: absolute; top: 8px; right: 8px;
  padding: 2px 8px; font-size: 11.5px;
  color: #334155; background: #fff;
  border: 1px solid #d5dcea; border-radius: 6px;
  cursor: pointer;
}
.cp-code-copy:hover { color: #2F54EB; border-color: #c9d6fd; }
</style>
