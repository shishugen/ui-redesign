<template>
  <div class="page page-in cd">
    <!-- 返回条：替代旧页顶部的 link 按钮 + 单 tab 的「返回列表」 -->
    <nav class="cd__bar" :aria-label="t('返回导航')">
      <a-button type="link" class="cd__back" @click="goBack">
        <template #icon><LeftOutlined /></template>
        {{ backLabel }}
      </a-button>
      <span class="cd__slash" aria-hidden="true">/</span>
      <span class="cd__now">{{ pageTypeLabel }}</span>
    </nav>

    <!-- ① 加载态 -->
    <section v-if="loading" class="cd__box cd__box--pad" aria-busy="true" :aria-label="t('正在加载')">
      <a-skeleton active :paragraph="{ rows: 8 }" />
    </section>

    <!-- ② 错误态 -->
    <div v-else-if="loadError" class="cd__err" role="alert">
      <div class="cd__err-main">
        <b>{{ t('课程详情加载失败') }}</b>
        <p>{{ loadError }}</p>
      </div>
      <a-button size="small" @click="initData">{{ t('重试') }}</a-button>
    </div>

    <!-- ③ 空态：缺参数 / 查无此课 -->
    <div v-else-if="!currCourse.courseId" class="cd__box cd__empty" role="status">
      <div class="cd__empty-t">{{ courseId ? t('没有找到这门课程') : t('缺少课程参数') }}</div>
      <div class="cd__empty-d">
        {{ courseId ? t('课程可能已删除，或当前账号没有查看权限。') : t('请从课程中心列表点「查看详情」进入本页。') }}
      </div>
      <a-button size="small" @click="goBack">{{ backLabel }}</a-button>
    </div>

    <!-- ④ 正常态 -->
    <template v-else>
      <section class="cd__box cd__hero">
        <div class="cd__cover">
          <a-image :preview="false" :src="coverSrc" :fallback="defaultImg"
                   :alt="t('{name} 课程封面', { name: currCourse.courseName || '' })" />
        </div>

        <div class="cd__main">
          <header class="cd__hd">
            <h1 class="cd__name" :title="currCourse.courseName">{{ currCourse.courseName }}</h1>
            <span class="cd__state" :class="canLearn ? 'ok' : 'off'">
              <span class="cd__dot" aria-hidden="true" />{{ canLearn ? t('可学习') : t('未上线') }}
            </span>
          </header>

          <div class="cd__meta">
            <span>
              {{ t('课时') }}：<b>{{ t('理论（{theory}）', { theory: num(currCourse.theoryPeriod) }) }}</b>
              + <b>{{ t('实训（{training}）', { training: num(currCourse.trainingPeriod) }) }}</b>
              {{ t('共（{total}）', { total: num(currCourse.theoryPeriod) + num(currCourse.trainingPeriod) }) }}
            </span>
            <span>
              {{ t('课程难度') }}：
              <b v-if="difficultyLabel">{{ difficultyLabel }}</b>
              <i v-else class="cd__none">{{ t('暂无') }}</i>
            </span>
          </div>

          <dl class="cd__labels">
            <div v-for="g in labelGroups" :key="g.key" class="cd__label-row">
              <dt class="cd__label-k">{{ g.title }}</dt>
              <dd class="cd__label-v">
                <template v-if="g.values.length">
                  <a-tag v-for="(v, i) in g.values" :key="i" class="cd__chip">{{ v }}</a-tag>
                </template>
                <i v-else class="cd__none">{{ t('暂无') }}</i>
              </dd>
            </div>
          </dl>

          <p class="cd__intro">
            <span class="cd__intro-k">{{ t('简介') }}</span>
            <span class="cd__intro-v">{{ intro }}</span>
          </p>

          <div class="cd__acts">
            <a-button type="primary" :disabled="!canLearn" @click="toLearning">{{ t('进入学习') }}</a-button>
            <span v-if="!canLearn" class="cd__hint">{{ t('课程未上线时不能进入学习') }}</span>
          </div>
        </div>
      </section>

      <CourseChapter :course-id="String(currCourse.courseId)" :chapter-tree-data="chapterTreeData" />
    </template>
  </div>
</template>

<script setup name="CourseDetail">
// 课程信息
import { ref, reactive, computed, onMounted, toRefs } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { LeftOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { toSubString } from '@/utils/aigc.js'
import { previewUrl } from '@/api/cloud/file'
import { getCourse } from '@/api/course/course'
import { findListLabel } from '@/api/system/label'
import { getSimpleList } from '@/api/course/chapter.js'
import { getDicts } from '@/api/system/dict/data.js'
import { handleTree } from '@/utils/aigc'
import defaultImg from '@/assets/images/default_course.png'
import CourseChapter from './courseChapter/index.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const courseId = ref('')
const encodedParam = ref('')
const activeName = ref('chapter')
const typeOptions = ref([])
const difficultyOptions = ref([])

const data = reactive({
  currCourse: {},
  courseLabelList: []
})
const { currCourse, courseLabelList } = toRefs(data)

const chapterData = ref([])
const chapterTreeData = ref([])

const isCase = computed(() => Number(currCourse.value.classify) === 1)
const pageTypeLabel = computed(() => (isCase.value ? t('案例详情') : t('课程详情')))
const backLabel = computed(() => (isCase.value ? t('返回案例列表') : t('返回课程列表')))
const canLearn = computed(() => Number(currCourse.value.state) === 1)
const coverSrc = computed(() => (currCourse.value.coverImg ? previewUrl + currCourse.value.coverImg : defaultImg))
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const intro = computed(() => toSubString(currCourse.value.introduction, 300) || t('暂无简介'))

const difficultyLabel = computed(() => dictLabelOf(difficultyOptions.value, currCourse.value.difficulty))
const typeLabel = computed(() => dictLabelOf(typeOptions.value, currCourse.value.type))

function dictLabelOf(list, value) {
  if (value === null || value === undefined || value === '') return ''
  const hit = list.find((d) => String(d.value) === String(value))
  return hit ? hit.label : ''
}
function labelNames(field) {
  const raw = currCourse.value[field]
  if (!raw) return []
  return String(raw).split(',')
    .map((id) => labelNameOf(id))
    .filter(Boolean)
}
function labelNameOf(labelId) {
  const hit = courseLabelList.value.find((item) => String(item.labelId) === String(labelId))
  return hit ? hit.labelName : ''
}

const labelGroups = computed(() => [
  { key: 'type', title: t('课程类型'), values: typeLabel.value ? [typeLabel.value] : [] },
  { key: 'labels', title: t('课程标签'), values: labelNames('labels') },
  { key: 'majors', title: t('适用专业'), values: labelNames('majors') },
  { key: 'domains', title: t('应用领域'), values: labelNames('domains') },
  { key: 'posts', title: t('岗位方向'), values: labelNames('posts') },
  { key: 'skills', title: t('关键技能'), values: labelNames('skills') }
])

// 进入学习：跳到 B03 在线学习页（/online/learning，独立整页，自带顶栏）
function toLearning() {
  if (!canLearn.value) return
  router.push({ path: '/online/learning', query: { courseId: String(currCourse.value.courseId) } })
}

function goBack() {
  const backPath = isCase.value ? '/course-center/case' : '/course-center/course'
  router.push({ path: backPath, query: encodedParam.value ? { encodedParam: encodedParam.value } : {} })
}

async function loadDicts() {
  try {
    const res = await getDicts('sys_course_type')
    typeOptions.value = (res.data || []).map((d) => ({ label: t(d.dictLabel), value: d.dictValue }))
  } catch (e) { /* 字典失败时按「暂无」显示，不伪造选项 */ }
  try {
    const res = await getDicts('sys_course_difficulty')
    difficultyOptions.value = (res.data || []).map((d) => ({ label: t(d.dictLabel), value: d.dictValue }))
  } catch (e) { /* 同上 */ }
}

async function getCourseLabel() {
  try {
    const res = await findListLabel({})
    courseLabelList.value = res?.rows || []
  } catch (e) { courseLabelList.value = [] }
}

async function initData() {
  loadError.value = ''
  if (!courseId.value) return // 缺参数走空态，不发请求
  loading.value = true
  try {
    const [courseRes, chapterRes] = await Promise.all([
      getCourse(courseId.value),
      getSimpleList({ courseId: courseId.value, orderByColumn: 'sort', isAsc: 'asc' })
    ])
    currCourse.value = courseRes?.data || {}
    chapterData.value = chapterRes?.rows || []
    initChapter()
  } catch (err) {
    loadError.value = err?.message || t('课程详情接口不可用')
    chapterData.value = []
    chapterTreeData.value = []
  } finally {
    loading.value = false
  }
}

/** 章节列表 → 树 + 1./1.1 编号 */
function initChapter() {
  const tempList = (chapterData.value || []).map((item) => Object.assign({}, item))
  chapterTreeData.value = handleTree(tempList, 'chapterId')
  initSetNumber(chapterTreeData.value, '')
}
function initSetNumber(tree, num) {
  let n = 1
  tree.forEach((item) => {
    item.number = num + String(n) + '.'
    n += 1
    if (item.children && item.children.length) initSetNumber(item.children, item.number)
  })
}

onMounted(() => {
  courseId.value = route.query.courseId || ''
  if (route.query.encodedParam) encodedParam.value = route.query.encodedParam
  loadDicts()
  getCourseLabel()
  initData()
})
</script>

<style scoped>
.cd { display: flex; flex-direction: column; gap: 16px; }

/* 返回条 */
.cd__bar { display: flex; align-items: center; gap: 6px; min-height: 28px; }
.cd__back { padding: 0 4px; height: 26px; color: var(--ink-2); }
.cd__back:hover { color: var(--pri); }
.cd__slash { color: var(--line-2); font-size: 12px; }
.cd__now { font-size: 12.5px; color: var(--ink-3); }

.cd__box {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1);
}
.cd__box--pad { padding: 20px; }

/* 错误条 */
.cd__err {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 16px; border-radius: var(--r); color: var(--danger);
  border: 1px solid var(--danger-line); background: var(--danger-soft);
}
.cd__err-main b { font-size: 13px; }
.cd__err-main p { margin: 4px 0 0; font-size: 12px; opacity: .85; }

/* 空态 */
.cd__empty { padding: 46px 20px; text-align: center; }
.cd__empty-t { font-size: 14px; font-weight: 600; color: var(--ink-2); }
.cd__empty-d { margin: 8px 0 14px; font-size: 12px; color: var(--ink-4); }

/* 头部信息区 */
.cd__hero {
  display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 22px;
  padding: 20px; align-items: start;
}
.cd__cover {
  width: 100%; aspect-ratio: 16 / 10; border-radius: var(--r);
  overflow: hidden; background: var(--bg); border: 1px solid var(--line-3);
}
.cd__cover :deep(.ant-image),
.cd__cover :deep(.ant-image-img) { width: 100%; height: 100%; display: block; object-fit: cover; }

.cd__main { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.cd__hd { display: flex; align-items: flex-start; gap: 10px; }
.cd__name {
  margin: 0; font-size: 21px; line-height: 1.35; font-weight: 650; color: var(--ink);
  overflow-wrap: anywhere;
}
.cd__state {
  flex: none; display: inline-flex; align-items: center; gap: 5px; margin-top: 3px;
  padding: 2px 9px; border-radius: 999px; font-size: 11.5px;
  border: 1px solid var(--line-2); color: var(--ink-3); background: var(--bg-soft);
}
.cd__state.ok { border-color: var(--ok-line); color: var(--ok); background: var(--ok-soft); }
.cd__dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.cd__meta { display: flex; flex-wrap: wrap; gap: 4px 24px; font-size: 12.5px; color: var(--ink-3); }
.cd__meta b { color: var(--ink-2); font-weight: 600; }

/* 标签组 */
.cd__labels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 22px; margin: 0; }
.cd__label-row { display: flex; align-items: baseline; gap: 8px; min-width: 0; padding: 4px 0; }
.cd__label-k { flex: none; width: 4.6em; font-size: 12px; color: var(--ink-4); }
.cd__label-v { margin: 0; display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.cd__chip {
  margin: 0; padding: 0 7px; height: 21px; line-height: 19px; font-size: 11.5px;
  border-radius: var(--r-xs); border-color: var(--pri-200); background: var(--pri-50); color: var(--pri-ink);
}
.cd__none { font-style: normal; font-size: 12px; color: var(--ink-4); }

.cd__intro {
  margin: 0; padding: 10px 12px; border-radius: var(--r-sm);
  background: var(--bg-soft); border: 1px solid var(--line-3);
  font-size: 12.5px; line-height: 1.7; color: var(--ink-2);
}
.cd__intro-k { margin-right: 8px; font-weight: 600; color: var(--ink-3); }

.cd__acts { display: flex; align-items: center; gap: 12px; }
.cd__acts :deep(.ant-btn-primary) { min-width: 164px; }
.cd__hint { font-size: 12px; color: var(--ink-4); }

@media (max-width: 980px) {
  .cd__hero { grid-template-columns: 1fr; }
  .cd__cover { max-width: 380px; }
  .cd__labels { grid-template-columns: 1fr; }
}
</style>
