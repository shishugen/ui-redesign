import { ref, computed, onUnmounted } from 'vue'

/**
 * 左右分栏（可拖拽 / 可收起 / 键盘可达）。
 *
 * 旧项目四个面板（章节、附件、课件、班级实验）各手写了一份 ~150 行的鼠标事件，
 * 逻辑完全一致且都把 z-index 写成 9999（会盖住 antd 抽屉）。这里收敛成一份：
 *  - 左栏宽度用 px，右栏 flex:1，所以不需要给容器算高度，窗口变化自动跟随；
 *  - 折叠后左栏宽度归 0，按钮贴左边缘；
 *  - 拖拽条是 role="separator"，支持 ←/→ 键微调（每按一次 24px）；
 *  - 拖拽期间给 body 挂 class 关掉过渡，避免跟手迟滞。
 *
 * @param {object} opts
 * @param {number} opts.initial   左栏初始宽度（px）
 * @param {number} opts.min       左栏最小宽度（px）
 * @param {number} opts.minRight  右栏最小宽度（px）
 */
export function useSplitPane({ initial = 280, min = 180, minRight = 380 } = {}) {
  const rootRef = ref(null)
  const leftWidth = ref(initial)
  const leftShow = ref(true)
  const isResizing = ref(false)
  let lastWidth = initial
  let startX = 0
  let startWidth = 0

  const width = computed(() => (leftShow.value ? leftWidth.value : 0))

  function clampWidth(w) {
    const total = rootRef.value?.clientWidth || window.innerWidth
    const upper = Math.max(min, total - minRight)
    return Math.min(Math.max(w, min), upper)
  }

  function toggle() {
    leftShow.value = !leftShow.value
    if (leftShow.value) leftWidth.value = lastWidth
  }

  function onMove(e) {
    if (!isResizing.value) return
    leftWidth.value = clampWidth(startWidth + (e.clientX - startX))
    lastWidth = leftWidth.value
  }

  function stopResize() {
    if (!isResizing.value) return
    isResizing.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', stopResize)
    document.body.classList.remove('aigc-split-resizing')
  }

  function startResize(e) {
    if (!leftShow.value) return
    e.preventDefault()
    isResizing.value = true
    startX = e.clientX
    startWidth = leftWidth.value
    lastWidth = leftWidth.value
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', stopResize)
    document.body.classList.add('aigc-split-resizing')
  }

  /** 键盘微调：拖拽条聚焦后按 ←/→ */
  function nudge(step) {
    if (!leftShow.value) return
    leftWidth.value = clampWidth(leftWidth.value + step)
    lastWidth = leftWidth.value
  }

  onUnmounted(stopResize)

  return { rootRef, leftWidth, leftShow, isResizing, width, toggle, startResize, nudge }
}
