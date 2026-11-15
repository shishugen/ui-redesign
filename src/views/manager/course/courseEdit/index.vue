<template>
  <div class="page-in ce">
    <!-- 返回条 -->
    <nav class="ce__bar" :aria-label="t('返回导航')">
      <a-button type="link" class="ce__back" @click="goBack">
        <template #icon><LeftOutlined /></template>
        {{ backLabel }}
      </a-button>
      <span class="ce__slash" aria-hidden="true">/</span>
      <span class="ce__now">{{ isCase ? t('案例编辑') : t('课程编辑') }}</span>
    </nav>

    <!-- ① 加载态 -->
    <section v-if="loading" class="ce__box ce__box--pad" aria-busy="true" :aria-label="t('正在加载')">
      <a-skeleton active :paragraph="{ rows: 8 }" />
    </section>

    <!-- ② 错误态 -->
    <div v-else-if="loadError" class="ce__err" role="alert">
      <div>
        <b>{{ t('课程加载失败') }}</b>
        <p>{{ loadError }}</p>
      </div>
      <a-button size="small" @click="initData">{{ t('重试') }}</a-button>
    </div>

    <!-- ③ 空态 -->
    <div v-else-if="!currCourse.courseId" class="ce__box ce__empty" role="status">
      <div class="ce__empty-t">{{ courseId ? t('没有找到这门课程') : t('缺少课程参数') }}</div>
      <div class="ce__empty-d">
        {{ courseId ? t('课程可能已删除，或当前账号没有编辑权限。') : t('请从课程管理列表点「编辑」进入本页。') }}
      </div>
      <a-button size="small" @click="goBack">{{ backLabel }}</a-button>
    </div>

    <!-- ④ 正常态 -->
    <template v-else>
      <section class="ce__box ce__hero">
        <div class="ce__cover">
          <a-image :preview="false" :src="coverSrc" :fallback="defaultImg"
                   :alt="t('{name} 课程封面', { name: currCourse.courseName || '' })" />
        </div>

        <div class="ce__main">
          <header class="ce__hd">
            <h1 class="ce__name" :title="currCourse.courseName">{{ currCourse.courseName }}</h1>
            <span class="ce__state" :style="{ color: stateInfo.color, borderColor: stateInfo.color + '55', background: stateInfo.color + '12' }">
              <span class="ce__dot" :style="{ background: stateInfo.color }" aria-hidden="true" />{{ stateInfo.label }}
            </span>
            <a-button v-if="Number(currCourse.state) > 1" type="primary" ghost size="small"
                      :danger="Number(currCourse.state) === 3" @click="openComment">
              {{ t('审核意见') }}
            </a-button>
          </header>

          <div class="ce__meta">
            <span>
              {{ t('课时') }}：<b>{{ t('理论（{theory}）', { theory: num(currCourse.theoryPeriod) }) }}</b>
              + <b>{{ t('实训（{training}）', { training: num(currCourse.trainingPeriod) }) }}</b>
              {{ t('共（{total}）', { total: num(currCourse.theoryPeriod) + num(currCourse.trainingPeriod) }) }}
            </span>
            <span>
              {{ t('课程难度') }}：
              <b v-if="difficultyLabel">{{ difficultyLabel }}</b>
              <i v-else class="ce__none">{{ t('暂无') }}</i>
            </span>
            <span>{{ t('课程编码') }}：<b>{{ currCourse.courseCode || '—' }}</b></span>
          </div>

          <dl class="ce__labels">
            <div v-for="g in labelGroups" :key="g.key" class="ce__label-row">
              <dt class="ce__label-k">{{ g.title }}</dt>
              <dd class="ce__label-v">
                <template v-if="g.values.length">
                  <a-tag v-for="(v, i) in g.values" :key="i" class="ce__chip">{{ v }}</a-tag>
                </template>
                <i v-else class="ce__none">{{ t('暂无') }}</i>
              </dd>
            </div>
          </dl>

          <p class="ce__intro">
            <span class="ce__intro-k">{{ t('简介') }}</span>
            <span>{{ intro }}</span>
          </p>
        </div>
      </section>

      <section class="ce__box ce__tabs">
        <a-tabs v-model:activeKey="activeName">
          <a-tab-pane key="chapter" :tab="t('章节编辑')">
            <CourseChapter v-if="activeName === 'chapter'" :curr-course="currCourse"
                           :chapter-data="chapterData" :chapter-tree-data="chapterTreeData"
                           :can-edit="true" :call-back-refresh-chapter="refreshChapter" />
          </a-tab-pane>

          <a-tab-pane key="file" :tab="t('学习附件')">
            <CourseFile :curr-course="currCourse" :chapter-tree-data="chapterTreeData" :can-edit="true" />
          </a-tab-pane>

          <a-tab-pane key="courseware" :tab="t('教学课件')">
            <CourseWare :course-id="String(currCourse.courseId)" :can-edit="true" />
          </a-tab-pane>

          <a-tab-pane key="homework" :tab="t('作业配置')">
            <CourseHomework v-if="activeName === 'homework'" :course-id="String(currCourse.courseId)"
                            :course-name="currCourse.courseName || ''" :chapters="chapterData" :can-edit="true" />
          </a-tab-pane>

          <a-tab-pane key="config" :tab="t('实训配置')">
            <CourseConfig :curr-course="currCourse" :chapter-tree-data="chapterTreeData" :can-edit="true" />
          </a-tab-pane>

          <a-tab-pane key="preview" :tab="t('全局预览')">
            <CoursePreview v-if="activeName === 'preview'" :chapter-data="chapterData" :chapter-tree-data="chapterTreeData" />
          </a-tab-pane>
        </a-tabs>
      </section>
    </template>

    <!-- 审核意见 -->
    <a-modal v-model:open="commentModal" :title="t('审核信息')" :width="600" :footer="null">
      <a-form layout="vertical">
        <a-form-item :label="t('审核状态')">
          <a-tag v-if="Number(currCourse.state) === 2" color="green">{{ t('审核通过') }}</a-tag>
          <a-tag v-if="Number(currCourse.state) === 3" color="red">{{ t('拒绝通过') }}</a-tag>
        </a-form-item>
        <a-form-item :label="t('审核意见')">
          <div v-if="currCourse.comment" class="ce__comment" v-html="currCourse.comment" />
          <span v-else class="ce__none">{{ t('暂无意见') }}</span>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup name="CourseEdit">
import { ref, reactive, computed, onMounted, toRefs } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LeftOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { toSubString, handleTree, decryptParams } from '@/utils/aigc.js'
import { previewUrl } from '@/api/cloud/file'
import { getCourse } from '@/api/course/course'
import { findListLabel } from '@/api/system/label'
import { getSimpleList } from '@/api/course/chapter.js'
import { getDicts } from '@/api/system/dict/data.js'
import defaultImg from '@/assets/images/default_course.png'
import CourseFile from './courseFile/index.vue'
import CourseWare from './courseware/index.vue'
import CourseConfig from './courseConfig/index.vue'
import CoursePreview from './coursePreview/index.vue'
import CourseChapter from './courseChapter/index.vue'
import CourseHomework from './components/Homework/index.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const loadError = ref('')
const courseId = ref('')
const encodedParam = ref('')
const fromPath = ref('')
const activeName = ref('file')
const commentModal = ref(false)
const typeOptions = ref([])
const difficultyOptions = ref([])

const data = reactive({ currCourse: {}, courseLabelList: [] })
const { currCourse, courseLabelList } = toRefs(data)

const chapterData = ref([])
const chapterTreeData = ref([])

const isCase = computed(() => Number(currCourse.value.classify) === 1)
const backLabel = computed(() => (isCase.value ? t('返回案例列表') : t('返回课程列表')))
const coverSrc = computed(() => (currCourse.value.coverImg ? previewUrl + currCourse.value.coverImg : defaultImg))
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
const intro = computed(() => toSubString(currCourse.value.introduction, 300) || t('暂无简介'))

// 旧页状态色板原样保留（badge 用文字 count 属旧页 hack，这里改显式 chip）
const stateInfo = computed(() => {
  const map = {
    0: { label: t('编辑中'), color: '#91949a' },
    1: { label: t('审核中'), color: '#faad14' },
    2: { label: t('已通过'), color: '#52c41a' },
    3: { label: t('不通过'), color: '#f42e1c' }
  }
  return map[Number(currCourse.value.state)] || { label: t('未知'), color: '#91949a' }
})

const difficultyLabel = computed(() => dictLabelOf(difficultyOptions.value, currCourse.value.difficulty))
const typeLabel = computed(() => dictLabelOf(typeOptions.value, currCourse.value.type))

function dictLabelOf(list, value) {
  if (value === null || value === undefined || value === '') return ''
  return list.find((d) => String(d.value) === String(value))?.label || ''
}
function labelNames(field) {
  const raw = currCourse.value[field]
  if (!raw) return []
  return String(raw).split(',').map((id) => labelNameOf(id)).filter(Boolean)
}
function labelNameOf(labelId) {
  return courseLabelList.value.find((i) => String(i.labelId) === String(labelId))?.labelName || ''
}

const labelGroups = computed(() => [
  { key: 'type', title: t('课程类型'), values: typeLabel.value ? [typeLabel.value] : [] },
  { key: 'labels', title: t('课程标签'), values: labelNames('labels') },
  { key: 'majors', title: t('适用专业'), values: labelNames('majors') },
  { key: 'domains', title: t('应用领域'), values: labelNames('domains') },
  { key: 'posts', title: t('岗位方向'), values: labelNames('posts') },
  { key: 'skills', title: t('关键技能'), values: labelNames('skills') }
])

function openComment() { commentModal.value = true }

// classify 优先取列表缓存参数：课程接口失败 / 空态时 currCourse.classify 拿不到，
// 否则案例会被错误地送回课程列表。
function cachedClassify() {
  if (!encodedParam.value) return NaN
  try { return Number(decryptParams(encodedParam.value)?.classify) } catch (e) { return NaN }
}

function backTarget() {
  const from = String(fromPath.value || '')
  if (from.startsWith('/') && !from.includes('://') && !from.includes('courseEdit')) return from
  const classify = cachedClassify()
  const isCaseCourse = Number.isNaN(classify) ? isCase.value : classify === 1
  return isCaseCourse ? '/caseManager' : '/courseManager'
}

function goBack() {
  // replace 而非 push：返回不新增历史，浏览器「后退」不会再回到编辑页
  router.replace({
    path: backTarget(),
    query: encodedParam.value ? { encodedParam: encodedParam.value } : {}
  })
}

async function loadDicts() {
  try {
    const res = await getDicts('sys_course_type')
    typeOptions.value = (res.data || []).map((d) => ({ label: t(d.dictLabel), value: d.dictValue }))
  } catch (e) { /* 字典失败按「暂无」显示 */ }
  try {
    const res = await getDicts('sys_course_difficulty')
    difficultyOptions.value = (res.data || []).map((d) => ({ label: t(d.dictLabel), value: d.dictValue }))
  } catch (e) { /* 同上 */ }
}

async function getCourseLabel() {
  try { const res = await findListLabel({}); courseLabelList.value = res?.rows || [] } catch (e) { courseLabelList.value = [] }
}

async function initData() {
  loadError.value = ''
  if (!courseId.value) return
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
    loadError.value = err?.message || t('课程接口不可用')
    chapterData.value = []
    chapterTreeData.value = []
  } finally { loading.value = false }
}

async function refreshChapter() {
  try {
    const res = await getSimpleList({ courseId: courseId.value, orderByColumn: 'sort', isAsc: 'asc' })
    chapterData.value = res?.rows || []
    initChapter()
  } catch (e) { /* 拦截器已提示 */ }
}

function initChapter() {
  const tempList = (chapterData.value || []).map((i) => ({ ...i }))
  chapterTreeData.value = handleTree(tempList, 'chapterId')
  initSetNumber(chapterTreeData.value, '')
}
function initSetNumber(tree, prefix) {
  let n = 1
  tree.forEach((item) => {
    item.number = prefix + String(n) + '.'
    n += 1
    if (item.children?.length) initSetNumber(item.children, item.number)
  })
}

onMounted(() => {
  courseId.value = route.query.courseId || ''
  if (route.query.encodedParam) encodedParam.value = route.query.encodedParam
  if (route.query.from) fromPath.value = route.query.from
  loadDicts()
  getCourseLabel()
  initData()
})
</script>

<style scoped>
/* 详情页不套 .page 的 22/26/40 内边距：与列表壳对齐，顶部不再留一大条空白。
   .page > * + * 的 16px 与 flex gap 会叠加，这里只保留 gap。 */
.ce { margin: 0; padding: 8px 18px 24px; display: flex; flex-direction: column; gap: 12px; }

.ce__bar { display: flex; align-items: center; gap: 4px; width: fit-content; max-width: 100%; min-height: 24px; }
.ce__back { padding: 0 2px; height: 24px; font-size: 12.5px; color: var(--ink-2); }
.ce__back:hover { color: var(--pri); }
.ce__slash { color: var(--line-2); font-size: 12px; }
.ce__now { font-size: 12.5px; color: var(--ink-3); }

.ce__box { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg); box-shadow: var(--sh-1); }
.ce__box--pad { padding: 20px; }

.ce__err {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 14px 16px; border-radius: var(--r);
  border: 1px solid var(--danger-line); background: var(--danger-soft); color: var(--danger);
}
.ce__err b { font-size: 13px; }
.ce__err p { margin: 4px 0 0; font-size: 12px; opacity: .85; }

.ce__empty { padding: 46px 20px; text-align: center; }
.ce__empty-t { font-size: 14px; font-weight: 600; color: var(--ink-2); }
.ce__empty-d { margin: 8px 0 14px; font-size: 12px; color: var(--ink-4); }

.ce__hero { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 22px; padding: 20px; align-items: start; }
.ce__cover {
  width: 100%; aspect-ratio: 16 / 10; border-radius: var(--r); overflow: hidden;
  background: var(--bg); border: 1px solid var(--line-3);
}
.ce__cover :deep(.ant-image), .ce__cover :deep(.ant-image-img) {
  width: 100%; height: 100%; display: block; object-fit: cover;
}

.ce__main { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
.ce__hd { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ce__name { margin: 0; font-size: 21px; line-height: 1.35; font-weight: 650; color: var(--ink); overflow-wrap: anywhere; }
.ce__state {
  display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px;
  border: 1px solid; border-radius: 999px; font-size: 11.5px;
}
.ce__dot { width: 5px; height: 5px; border-radius: 50%; }

.ce__meta { display: flex; flex-wrap: wrap; gap: 4px 24px; font-size: 12.5px; color: var(--ink-3); }
.ce__meta b { color: var(--ink-2); font-weight: 600; }

.ce__labels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 22px; margin: 0; }
.ce__label-row { display: flex; align-items: baseline; gap: 8px; min-width: 0; padding: 4px 0; }
.ce__label-k { flex: none; width: 4.6em; font-size: 12px; color: var(--ink-4); }
.ce__label-v { margin: 0; display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.ce__chip {
  margin: 0; padding: 0 7px; height: 21px; line-height: 19px; font-size: 11.5px;
  border-radius: var(--r-xs); border-color: var(--pri-200); background: var(--pri-50); color: var(--pri-ink);
}
.ce__none { font-style: normal; font-size: 12px; color: var(--ink-4); }

.ce__intro {
  margin: 0; padding: 10px 12px; border-radius: var(--r-sm);
  background: var(--bg-soft); border: 1px solid var(--line-3);
  font-size: 12.5px; line-height: 1.7; color: var(--ink-2);
}
.ce__intro-k { margin-right: 8px; font-weight: 600; color: var(--ink-3); }

.ce__tabs { padding: 8px 16px 16px; overflow: visible; }
.ce__tabs :deep(.ant-tabs), .ce__tabs :deep(.ant-tabs-content-holder) { overflow: visible; }
.ce__hold { padding: 44px 16px; text-align: center; }
.ce__hold-t { font-size: 13.5px; font-weight: 600; color: var(--ink-2); }
.ce__hold-d { margin: 8px auto 0; max-width: 560px; font-size: 12px; line-height: 1.8; color: var(--ink-4); }

.ce__comment { font-size: 12.5px; line-height: 1.8; color: var(--ink-2); white-space: pre-wrap; word-break: break-word; }

@media (max-width: 980px) {
  .ce__hero { grid-template-columns: 1fr; }
  .ce__cover { max-width: 380px; }
  .ce__labels { grid-template-columns: 1fr; }
}
</style>
