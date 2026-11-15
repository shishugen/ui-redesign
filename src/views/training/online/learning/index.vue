<template>
  <div class="learn">
    <!-- 顶栏：品牌 + 课程 + 用户 -->
    <header class="learn__bar">
      <div class="learn__brand">
        <img class="learn__logo" :src="logo" alt="" @click="toIndex" />
        <button type="button" class="learn__sys" :title="t('{name} · 回到首页', { name: systemName })" @click="toIndex">
          {{ systemName || t('在线学习') }}
        </button>
      </div>

      <div class="learn__course">
        <span v-if="courseKind" class="tag pri">{{ courseKind }}</span>
        <span class="learn__course-name" :title="currCourse.courseName || ''">
          <template v-if="currCourse.courseId">《{{ currCourse.courseName }}》</template>
          <template v-else>{{ t('未加载课程') }}</template>
        </span>
      </div>

      <div class="learn__user">
        <span class="learn__back" role="button" tabindex="0" @click="goBack" @keydown.enter="goBack">{{ t('返回') }}</span>
        <span class="learn__avatar" aria-hidden="true">{{ avatarText }}</span>
        <span class="learn__nick">{{ nickName || '—' }}</span>
      </div>
    </header>

    <!-- Tab 栏 -->
    <nav class="learn__tabs" :aria-label="t('学习内容导航')">
      <button
        v-for="tab in visibleTabs"
        :key="tab.key"
        type="button"
        class="learn__tab"
        :class="{ 'is-active': selectedKeys.includes(tab.key) }"
        :aria-current="selectedKeys.includes(tab.key) ? 'page' : 'false'"
        @click="handleSelect(tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.key === 'video' && videoArray.length" class="chip">{{ videoArray.length }}</span>
        <span v-if="tab.key === 'document' && documentArray.length" class="chip">{{ documentArray.length }}</span>
        <span v-if="tab.key === 'courseware' && coursewareArray.length" class="chip">{{ coursewareArray.length }}</span>
      </button>
    </nav>

    <!-- ① 加载态 -->
    <div v-if="loading" class="learn__body learn__state" aria-busy="true">
      <a-skeleton active :paragraph="{ rows: 8 }" />
    </div>

    <!-- ② 错误态 -->
    <div v-else-if="loadError" class="learn__body learn__state">
      <div class="learn__err" role="alert">
        <div>
          <b>{{ t('课程加载失败') }}</b>
          <p>{{ loadError }}</p>
        </div>
        <a-button size="small" @click="initData">{{ t('重试') }}</a-button>
      </div>
    </div>

    <!-- ③ 空态：缺参数 / 查无此课 -->
    <div v-else-if="!currCourse.courseId" class="learn__body learn__state">
      <div class="learn__empty" role="status">
        <div class="learn__empty-t">{{ courseId ? t('没有找到这门课程') : t('缺少课程参数') }}</div>
        <div class="learn__empty-d">
          {{ courseId ? t('课程可能已删除，或当前账号没有查看权限。') : t('请从课程中心 / 课程详情点「进入学习」进入本页。') }}
        </div>
        <a-button size="small" @click="goBack">{{ t('返回课程中心') }}</a-button>
      </div>
    </div>

    <!-- ④ 正常态：按 Tab 懒挂载，切走只隐藏不销毁（与旧页一致，保留滚动位置与学习计时） -->
    <div v-else class="learn__body">
      <CourseInfo
        v-if="hasLoaded('course')"
        v-show="selectedKeys.includes('course')"
        :tab-key="selectedKeys"
        tab-name="course"
        :curr-course="currCourse"
        :learn-call-back="toLearn"
      />
      <ChapterList
        v-if="hasLoaded('chapter')"
        v-show="selectedKeys.includes('chapter')"
        :key="'ch-' + courseId"
        :tab-key="selectedKeys"
        :course-id="courseId"
        :default-chapter-id="currChapterId"
        :chapter-data="chapterData"
        :chapter-tree-data="chapterTreeData"
      />
      <CourseAttachments
        v-if="hasLoaded('video') && isFileInit"
        v-show="selectedKeys.includes('video')"
        :key="'video-' + courseId"
        :tab-key="selectedKeys"
        tab-name="video"
        :course-id="courseId"
        :default-chapter-id="currChapterId"
        :default-file-id="currFileId"
        :chapter-tree-data="chapterTreeData"
        :file-type="3"
        :file-list-data="videoArray"
      />
      <CourseAttachments
        v-if="hasLoaded('document') && isFileInit"
        v-show="selectedKeys.includes('document')"
        :key="'doc-' + courseId"
        :tab-key="selectedKeys"
        tab-name="document"
        :course-id="courseId"
        :default-chapter-id="currChapterId"
        :default-file-id="currFileId"
        :chapter-tree-data="chapterTreeData"
        :file-type="1"
        :file-list-data="documentArray"
      />
      <CoursewareList
        v-if="hasLoaded('courseware') && isFileInit"
        v-show="selectedKeys.includes('courseware')"
        :key="'cw-' + courseId"
        :tab-key="selectedKeys"
        tab-name="courseware"
        :course-id="courseId"
        :default-chapter-id="currChapterId"
        :default-file-id="currFileId"
        :chapter-tree-data="chapterTreeData"
        :file-list-data="coursewareArray"
      />
    </div>
  </div>
</template>

<script setup name="OnlineLearning">
/*
 * 在线学习页（旧页 training/online/learning/index.vue，P220）。
 * 独立于后台外壳：自带顶栏，整页 100vh，内容区各面板内部滚动——
 * 旧页用 mainHeight = clientHeight - 45 + position:absolute 的固定高度写法，
 * 一改窗口尺寸就错位，新页改成 flex 撑满，不再算像素高度。
 */
import { computed, onMounted, reactive, ref, toRefs, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'
import { getCourse } from '@/api/course/course'
import { getSimpleList } from '@/api/course/chapter'
import { findListFile } from '@/api/course/file.js'
import { getConfigKey } from '@/api/system/config'
import { handleTree } from '@/utils/aigc'
import { isAdminOrTeacher, getNickName } from '@/utils/user'
import logo from '@/assets/images/logo.png'
import CourseInfo from './items/CourseInfo.vue'
import ChapterList from './items/ChapterList.vue'
import CourseAttachments from './items/CourseAttachments.vue'
import CoursewareList from './items/CoursewareList.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const systemName = ref('')
const isInit = ref(false)
const isFileInit = ref(false)
const selectedKeys = ref(['course'])
const activeList = ref([])

const courseId = ref('')
const currChapterId = ref('')
const currFileId = ref('')

const data = reactive({
  currCourse: {
    courseId: null, courseName: '', courseCode: null, cover: '',
    introduction: '', type: null, difficulty: null
  }
})
const { currCourse } = toRefs(data)

const chapterData = ref([])
const chapterTreeData = ref([])
const courseFileList = ref([])
const videoArray = ref([])
const documentArray = ref([])
const coursewareArray = ref([])

const nickName = computed(() => getNickName())
const avatarText = computed(() => String(nickName.value || '?').slice(0, 1))
const courseKind = computed(() => {
  const classify = currCourse.value.classify
  if (classify == 0) return t('实践课程')
  if (classify == 1) return t('项目案例')
  return ''
})

const ALL_TABS = computed(() => [
  { key: 'course', label: t('课程简介') },
  { key: 'chapter', label: t('课程内容') },
  { key: 'video', label: t('视频学习') },
  { key: 'document', label: t('文档学习') },
  { key: 'courseware', label: t('教学课件'), needTeacher: true }
])
const visibleTabs = computed(() => ALL_TABS.value.filter((tab) => !tab.needTeacher || isAdminOrTeacher()))

function hasLoaded(tab) {
  return activeList.value.includes(tab)
}

function pushQuery(type) {
  const query = { courseId: courseId.value, type }
  if (currChapterId.value) query.chapterId = currChapterId.value
  if (currFileId.value) query.fileId = currFileId.value
  router.push({ path: '/online/learning', query })
}

function handleSelect(key) {
  selectedKeys.value = [key]
  if (!activeList.value.includes(key)) activeList.value.push(key)
  pushQuery(key)
}

/** CourseInfo 的「开始学习」回调 */
function toLearn(type) {
  selectedKeys.value = [type]
  if (!activeList.value.includes(type)) activeList.value.push(type)
  pushQuery(type)
}

function toIndex() {
  window.open(`${window.location.pathname}#/index`, '_blank')
}

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/course-center/course')
}

function getSystemName() {
  getConfigKey('aigc_system_name').then((res) => {
    if (res?.msg) systemName.value = res.msg
  }).catch(() => { /* 取不到就显示默认标题 */ })
}

function initSetNumber(tree, num) {
  let n = 1
  tree.forEach((item) => {
    item.number = num + String(n) + '.'
    n += 1
    if (item.children && item.children.length) initSetNumber(item.children, item.number)
  })
}

async function initData() {
  if (!courseId.value) return // 缺参数走空态，不发请求
  loading.value = true
  loadError.value = ''
  try {
    const [courseRes, chapterRes] = await Promise.all([
      getCourse(courseId.value),
      getSimpleList({ courseId: courseId.value, orderByColumn: 'sort', isAsc: 'asc' })
    ])
    currCourse.value = courseRes?.data || {}
    chapterData.value = chapterRes?.rows || []
    const tempList = chapterData.value.map((item) => ({ ...item }))
    chapterTreeData.value = handleTree(tempList, 'chapterId')
    initSetNumber(chapterTreeData.value, '')
    if (currCourse.value.courseId) {
      activeList.value.push('course')
      document.title = currCourse.value.courseName || t('在线学习')
    }
  } catch (err) {
    loadError.value = err?.message || t('课程接口不可用')
    chapterData.value = []
    chapterTreeData.value = []
  } finally {
    loading.value = false
    isInit.value = true
  }
}

async function loadFileList() {
  try {
    const res = await findListFile({ courseId: courseId.value })
    courseFileList.value = res?.rows || []
    courseFileList.value.forEach((item) => {
      if (Number(item.relationType) === 2) {
        coursewareArray.value.push(item)
      } else if (Number(item.fileType) === 1) {
        documentArray.value.push(item)
      } else if (Number(item.fileType) === 3) {
        videoArray.value.push(item)
      }
    })
    const bySort = (a, b) => Number(a.sort) - Number(b.sort)
    coursewareArray.value.sort(bySort)
    documentArray.value.sort(bySort)
    videoArray.value.sort(bySort)
  } catch (e) {
    // 附件接口失败：三个附件 Tab 走各自的空态，不阻塞章节学习
    courseFileList.value = []
  } finally {
    isFileInit.value = true
  }
}

onMounted(() => {
  getSystemName()
})

/**
 * 路由 query → 页面状态。
 * 旧页只在 onMounted 读一次 query：同一个路由换课程 / 换 Tab 时组件被复用，
 * 页面会继续显示上一门课的内容（实测：去掉 courseId 后仍显示旧课）。
 * 这里改成 watch query，并在换课程时清空全部派生状态 + 用 :key 强制重挂面板。
 */
function applyRoute() {
  const q = route.query
  const nextId = q.courseId ? String(q.courseId) : ''
  const changed = nextId !== courseId.value

  if (changed) {
    courseId.value = nextId
    loadError.value = ''
    isInit.value = false
    isFileInit.value = false
    currCourse.value = {
      courseId: null, courseName: '', courseCode: null, cover: '',
      introduction: '', type: null, difficulty: null
    }
    chapterData.value = []
    chapterTreeData.value = []
    courseFileList.value = []
    videoArray.value = []
    documentArray.value = []
    coursewareArray.value = []
    activeList.value = []
    selectedKeys.value = ['course']
  }

  currChapterId.value = q.chapterId ? String(q.chapterId) : ''
  currFileId.value = q.fileId ? String(q.fileId) : ''
  if (q.type) {
    selectedKeys.value = [String(q.type)]
    if (!activeList.value.includes(String(q.type))) activeList.value.push(String(q.type))
  }

  if (!nextId) {
    if (changed) message.warning(t('课程参数不存在'))
    return
  }
  if (changed) {
    initData()
    loadFileList()
  }
}

watch(() => route.query, applyRoute, { immediate: true })
</script>

<style scoped>
.learn {
  display: flex; flex-direction: column;
  height: 100vh; min-height: 0; overflow: hidden;
  background: var(--bg);
}

/* 顶栏 */
.learn__bar {
  flex: none; display: flex; align-items: center; gap: 16px;
  height: 56px; padding: 0 18px;
  background: var(--panel); border-bottom: 1px solid var(--line);
}
.learn__brand { display: flex; align-items: center; gap: 10px; flex: none; }
.learn__logo { height: 28px; width: auto; cursor: pointer; display: block; }
.learn__sys {
  border: 0; background: transparent; padding: 0; cursor: pointer;
  font: inherit; font-size: 14.5px; font-weight: 650; color: var(--ink);
  max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.learn__sys:hover { color: var(--pri); }

.learn__course { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
.learn__course-name {
  font-size: 13.5px; color: var(--ink-2); font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.learn__user { flex: none; display: flex; align-items: center; gap: 8px; }
.learn__back {
  font-size: 12.5px; color: var(--ink-3); cursor: pointer; padding: 2px 8px;
  border-radius: var(--r-xs); border: 1px solid var(--line);
}
.learn__back:hover { color: var(--pri); border-color: var(--pri-200); }
.learn__avatar {
  width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
  background: var(--pri-100); color: var(--pri-ink); font-size: 12px; font-weight: 600;
}
.learn__nick { font-size: 12.5px; color: var(--ink-2); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Tab */
.learn__tabs {
  flex: none; display: flex; align-items: center; gap: 4px;
  height: 44px; padding: 0 18px;
  background: var(--panel); border-bottom: 1px solid var(--line);
  overflow-x: auto;
}
.learn__tab {
  position: relative; display: inline-flex; align-items: center; gap: 6px;
  height: 44px; padding: 0 14px; border: 0; background: transparent;
  font: inherit; font-size: 13.5px; color: var(--ink-3); cursor: pointer;
  white-space: nowrap; transition: color .14s ease;
}
.learn__tab::after {
  content: ''; position: absolute; left: 12px; right: 12px; bottom: 0;
  height: 2px; border-radius: 2px; background: transparent;
  transition: background .16s ease;
}
.learn__tab:hover { color: var(--pri); }
.learn__tab.is-active { color: var(--pri); font-weight: 600; }
.learn__tab.is-active::after { background: var(--pri); }
.learn__tab .chip { height: 17px; min-width: 18px; font-size: 10.5px; }

/* 主体 */
.learn__body { flex: 1; min-height: 0; overflow: hidden; display: flex; }
.learn__body > * { flex: 1; min-width: 0; min-height: 0; }
.learn__state { padding: 20px; overflow: auto; }

.learn__err {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 16px; border-radius: var(--r);
  border: 1px solid var(--danger-line); background: var(--danger-soft); color: var(--danger);
}
.learn__err b { font-size: 13px; }
.learn__err p { margin: 4px 0 0; font-size: 12px; opacity: .85; }

.learn__empty {
  max-width: 460px; margin: 60px auto 0; padding: 30px 24px; text-align: center;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1);
}
.learn__empty-t { font-size: 15px; font-weight: 600; color: var(--ink); }
.learn__empty-d { margin: 8px 0 16px; font-size: 12.5px; color: var(--ink-4); line-height: 1.7; }

@media (max-width: 900px) {
  .learn__bar { padding: 0 12px; gap: 10px; }
  .learn__sys { font-size: 13.5px; max-width: 140px; }
  .learn__tabs { padding: 0 8px; }
  .learn__tab { padding: 0 10px; font-size: 13px; }
}
</style>
