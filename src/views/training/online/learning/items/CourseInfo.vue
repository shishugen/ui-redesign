<template>
  <div class="ci">
    <div class="ci__scroll">
      <!-- 左：封面 + 三个动作 -->
      <aside class="ci__cover-col">
        <div class="ci__cover">
          <a-image
            :preview="false"
            :src="coverSrc"
            :fallback="defaultImg"
            :alt="t('{name} 课程封面', { name: currCourse.courseName || '' })"
          />
        </div>
        <div class="ci__acts">
          <a-button type="primary" size="large" block @click="startLearning">{{ t('开始学习') }}</a-button>
          <a-button size="large" block :disabled="!classesScheduleList.length" @click="startClassesTraining">
            {{ t('班级实验') }}
            <span v-if="classesScheduleList.length" class="ci__badge">{{ classesScheduleList.length }}</span>
          </a-button>
          <a-button size="large" block @click="startPersonalTraining">{{ t('个人实验') }}</a-button>
        </div>
        <p class="ci__act-tip">{{ t('开始学习进入「课程内容」；实验需要课程已配置镜像与排课。') }}</p>
      </aside>

      <!-- 右：信息 -->
      <div class="ci__main">
        <h1 class="ci__title">{{ currCourse.courseName || '—' }}</h1>

        <div class="ci__meta">
          <span class="ci__meta-i"><UserOutlined />{{ currCourse.createByName || '—' }}</span>
          <span class="ci__meta-i">
            <ClockCircleOutlined />
            {{ t('理论：{theory} + 实训：{training}，共（{total}）课时', {
              theory: num(currCourse.theoryPeriod),
              training: num(currCourse.trainingPeriod),
              total: num(currCourse.theoryPeriod) + num(currCourse.trainingPeriod)
            }) }}
          </span>
          <span class="ci__meta-i"><StarOutlined />{{ difficultyLabel || t('暂无') }}</span>
        </div>

        <section class="ci__sec">
          <h2 class="ci__sec-hd">{{ t('课程简介') }}</h2>
          <p class="ci__intro">{{ currCourse.introduction || t('暂无') }}</p>
        </section>

        <section class="ci__sec">
          <h2 class="ci__sec-hd">{{ t('课程属性') }}</h2>
          <dl class="ci__labels">
            <div class="ci__label-row">
              <dt>{{ t('课程类型') }}</dt>
              <dd><span v-if="typeLabel" class="tag pri">{{ typeLabel }}</span><i v-else class="ci__none">{{ t('暂无') }}</i></dd>
            </div>
            <div v-for="g in labelGroups" :key="g.key" class="ci__label-row">
              <dt>{{ g.title }}</dt>
              <dd>
                <template v-if="g.values.length">
                  <span v-for="(v, i) in g.values" :key="i" class="tag">{{ v }}</span>
                </template>
                <i v-else class="ci__none">{{ t('暂无') }}</i>
              </dd>
            </div>
          </dl>
        </section>

        <section class="ci__sec">
          <h2 class="ci__sec-hd">
            {{ t('学习进度') }}
            <a-button type="link" size="small" @click="getStatisticsInfo">{{ t('刷新') }}</a-button>
          </h2>

          <div class="ci__prog">
            <div class="ci__prog-hd">
              <span class="ci__prog-val">{{ learnProgress }}<small>%</small></span>
              <span class="ci__prog-sub">{{ t('按章节 + 视频 + 文档完成数计算') }}</span>
            </div>
            <a-progress :percent="learnProgress" :show-info="false" :stroke-color="'var(--pri)'" />
          </div>

          <div class="ci__stats">
            <div v-for="s in statRows" :key="s.key" class="ci__stat">
              <div class="ci__stat-lab">{{ s.label }}</div>
              <div class="ci__stat-val">{{ s.done }}<small>/{{ s.total }}</small></div>
              <div class="ci__stat-foot">
                {{ t('完成度 {p}%', { p: s.percent }) }}
                <span class="ci__dot" aria-hidden="true">·</span>
                {{ s.time }}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- 已有实验 -->
    <a-modal v-model:open="trainingDialogOpen" :title="t('实验提示')" :width="880" :footer="null">
      <p class="ci__dlg-t">{{ trainingTitle }}</p>
      <a-table
        :data-source="scheduleList"
        :columns="columns"
        :pagination="false"
        row-key="scheduleId"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'scheduleType'">
            <span class="tag">
              {{ record.scheduleType == 0 ? t('培训计划') : record.scheduleType == 1 ? t('教学排课') : t('个人学习') }}
            </span>
            <span v-if="record.classesId" class="ci__cls">{{ record.classesName }}</span>
          </template>
          <template v-else-if="column.key === 'trainingTime'">
            <div>{{ record.beginTime }} ~ {{ record.actualEndTime }}</div>
            <div class="ci__muted">{{ formatTimePeriod(record.beginTime, record.actualEndTime) }}</div>
          </template>
          <template v-else-if="column.key === 'arrangeState'">
            <span class="tag" :class="record.currState == 1 ? 'ok' : record.currState == 2 ? '' : 'warn'">
              {{ record.currState == 0 ? t('未开始') : record.currState == 1 ? t('实验中') : t('已结束') }}
            </span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="primary" size="small" :disabled="record.currState != 1" @click="gotoArrangeTraining(record)">
              {{ t('进入实验') }}
            </a-button>
          </template>
        </template>
      </a-table>
    </a-modal>

    <!-- 新建个人实验 -->
    <a-modal v-model:open="createDialogOpen" :title="t('实验提示')" :width="560">
      <div class="ci__dlg">
        <p class="ci__dlg-t">{{ t('确认开始实验吗？') }}</p>
        <p class="ci__muted">{{ t('（当前为个人学习实验模式，实验时间默认为 {n} 分钟）', { n: defaultPeriod * 2 }) }}</p>
        <p class="ci__quota">{{ t('个人可用额度剩余 {v}', { v: formatDurationHour(availableQuota) }) }}</p>
      </div>
      <template #footer>
        <a-button @click="createDialogOpen = false">{{ t('取 消') }}</a-button>
        <a-button type="primary" :loading="saving" @click="confirmCreate">{{ t('确 认') }}</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup name="CourseInfo">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  UserOutlined, StarOutlined, ClockCircleOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { previewUrl } from '@/api/cloud/file.js'
import { findListLabel } from '@/api/system/label'
import { findListConfig } from '@/api/course/config.js'
import { getMyQuota } from '@/api/kube/resourceAllocation'
import { getUserId, getUserInfo, isAdminOrTeacher } from '@/utils/user'
import { getCourseStatistics } from '@/api/learning/record.js'
import { getConfigKey } from '@/api/system/config'
import { getCurrSchedule, getOccupy, saveScheduleByParams } from '@/api/learning/schedule.js'
import { getDicts } from '@/api/system/dict/data.js'
import { formatTimePeriod, formatDurationHour } from '@/utils/aigc.js'
import defaultImg from '@/assets/images/default_course.png'

const props = defineProps({
  tabKey: { type: Array, default: () => [] },
  tabName: { type: String, default: '' },
  currCourse: { type: Object, default: () => ({ courseId: '' }) },
  learnCallBack: { type: Function, default: () => {} }
})

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)

const typeOptions = ref([])
const difficultyOptions = ref([])
const courseLabelList = ref([])
const courseStatistics = ref({
  courseId: '', totalChapter: 0, finishedChapter: 0, chapterSeconds: 0,
  totalVideo: 0, finishedVideo: 0, videoSeconds: 0,
  totalDocument: 0, finisheDocument: 0, documentSeconds: 0
})

const coverSrc = computed(() => (props.currCourse.coverImg ? previewUrl + props.currCourse.coverImg : defaultImg))

function dictLabelOf(list, value) {
  if (value === null || value === undefined || value === '') return ''
  const hit = list.find((d) => String(d.value) === String(value))
  return hit ? hit.label : ''
}
const typeLabel = computed(() => dictLabelOf(typeOptions.value, props.currCourse.type))
const difficultyLabel = computed(() => dictLabelOf(difficultyOptions.value, props.currCourse.difficulty))

function labelNames(field) {
  const raw = props.currCourse[field]
  if (!raw) return []
  return String(raw).split(',').map((id) => {
    const hit = courseLabelList.value.find((item) => String(item.labelId) === String(id))
    return hit ? hit.labelName : ''
  }).filter(Boolean)
}
const labelGroups = computed(() => [
  { key: 'labels', title: t('课程标签'), values: labelNames('labels') },
  { key: 'majors', title: t('适用专业'), values: labelNames('majors') },
  { key: 'domains', title: t('应用领域'), values: labelNames('domains') },
  { key: 'posts', title: t('岗位方向'), values: labelNames('posts') },
  { key: 'skills', title: t('关键技能'), values: labelNames('skills') }
])

/* ---------------- 学习统计 ---------------- */
const learnProgress = computed(() => {
  const s = courseStatistics.value
  const total = num(s.totalChapter) + num(s.totalVideo) + num(s.totalDocument)
  const done = num(s.finishedChapter) + num(s.finishedVideo) + num(s.finisheDocument)
  return total > 0 ? Number(((done / total) * 100).toFixed(2)) : 0
})

function percentOf(total, done) {
  return num(total) > 0 ? Number(((num(done) / num(total)) * 100).toFixed(2)) : 0
}
function fmtTime(seconds) {
  const s = num(seconds)
  if (s <= 0) return t('0 分钟')
  return s > 3600 ? t('{v} 小时', { v: (s / 3600).toFixed(1) }) : t('{v} 分钟', { v: (s / 60).toFixed(1) })
}
const statRows = computed(() => {
  const s = courseStatistics.value
  return [
    { key: 'chapter', label: t('章节'), done: num(s.finishedChapter), total: num(s.totalChapter), percent: percentOf(s.totalChapter, s.finishedChapter), time: fmtTime(s.chapterSeconds) },
    { key: 'video', label: t('视频'), done: num(s.finishedVideo), total: num(s.totalVideo), percent: percentOf(s.totalVideo, s.finishedVideo), time: fmtTime(s.videoSeconds) },
    { key: 'document', label: t('文档'), done: num(s.finisheDocument), total: num(s.totalDocument), percent: percentOf(s.totalDocument, s.finisheDocument), time: fmtTime(s.documentSeconds) }
  ]
})

function getStatisticsInfo() {
  if (!props.currCourse.courseId) return
  getCourseStatistics(props.currCourse.courseId, getUserId()).then((res) => {
    if (res?.data?.courseId) courseStatistics.value = res.data
  }).catch(() => { /* 统计失败保持「—」，不补假数 */ })
}

/* ---------------- 开始学习 ---------------- */
function startLearning() {
  props.learnCallBack('chapter')
}

/* ---------------- 实验 ---------------- */
const scheduleList = ref([])
const classesScheduleList = ref([])
const personalScheduleList = ref([])
const trainingDialogOpen = ref(false)
const trainingTitle = ref('')
const createDialogOpen = ref(false)
const saving = ref(false)
const defaultPeriod = ref(40)
const resourceType = ref('')
const occupyQuota = ref(0)
const quotaPackages = ref([])
let isScheduleLoading = false

const columns = [
  { title: t('实验信息'), key: 'scheduleType', width: 230, ellipsis: true },
  { title: t('实验时间'), key: 'trainingTime', width: 330, ellipsis: true },
  { title: t('实验状态'), key: 'arrangeState', width: 100, align: 'center' },
  { title: t('操作'), key: 'action', width: 100, align: 'center' }
]

async function getTodaySchedule() {
  if (isScheduleLoading) return
  isScheduleLoading = true
  try {
    const classParams = {
      courseId: props.currCourse.courseId,
      scheduleUserId: isAdminOrTeacher() ? getUserId() : undefined,
      classesId: undefined,
      scheduleTypeList: [0, 1]
    }
    if (!isAdminOrTeacher()) {
      const deptId = getUserInfo()?.deptId
      classParams.classesId = deptId ? deptId : '0'
    }
    const [classRes, personRes] = await Promise.all([
      getCurrSchedule(classParams),
      getCurrSchedule({ courseId: props.currCourse.courseId, scheduleUserId: getUserId(), scheduleType: 2 })
    ])
    classesScheduleList.value = (classRes?.rows || []).filter((item) => item.state != 2)
    personalScheduleList.value = (personRes?.rows || []).filter((item) => item.state != 2)
  } catch (e) {
    // 排课接口失败时按钮保持禁用，不伪造「有实验」
    classesScheduleList.value = []
    personalScheduleList.value = []
  } finally {
    isScheduleLoading = false
  }
}

// 每条排课挑一个子项：优先进行中 → 未开始 → 最后一个
function pickScheduleItem(list) {
  list.forEach((schedule) => {
    const items = schedule.scheduleItems || []
    if (!items.length) return
    const running = items.find((i) => i.state == 1)
    const ready = items.find((i) => i.state == 0)
    const chosen = running || ready || items[items.length - 1]
    schedule.itemId = chosen.itemId
    schedule.currState = chosen.state
    schedule.beginTime = chosen.beginTime
    schedule.actualEndTime = chosen.actualEndTime
  })
}

async function startClassesTraining() {
  await getTodaySchedule()
  scheduleList.value = [...classesScheduleList.value]
  pickScheduleItem(scheduleList.value)
  trainingTitle.value = t('您当前有 {n} 个班级实验', { n: scheduleList.value.length })
  trainingDialogOpen.value = true
}

async function startPersonalTraining() {
  await getTodaySchedule()
  scheduleList.value = [...personalScheduleList.value]
  if (scheduleList.value.length) {
    pickScheduleItem(scheduleList.value)
    trainingTitle.value = t('您当前有 {n} 个个人实验', { n: scheduleList.value.length })
    trainingDialogOpen.value = true
    return
  }
  await getResourceQuota()
  createDialogOpen.value = true
}

const availableQuota = computed(() => {
  let quota = 0
  if (!resourceType.value) return quota
  quotaPackages.value.forEach((p) => {
    if (String(p.resourceType) === String(resourceType.value)) quota += num(p.remainMinutes) * 60
  })
  if (occupyQuota.value > 0) quota -= occupyQuota.value
  return Math.max(0, quota)
})

async function getResourceQuota() {
  quotaPackages.value = []
  occupyQuota.value = 0
  try {
    const [quotaRes, occupyRes] = await Promise.all([
      getMyQuota(),
      getOccupy({ scheduleUserId: getUserId(), resourceType: resourceType.value, scheduleType: 2 })
    ])
    ;(quotaRes?.data || []).forEach((item) => {
      const packs = (item.packages || []).filter((p) => p.usageScope == 'course')
      quotaPackages.value.push(...packs)
    })
    occupyQuota.value = num(occupyRes?.data)
  } catch (e) {
    // 额度接口失败：可用额度按 0 显示，确认按钮仍会因额度不足被拦下
    quotaPackages.value = []
    occupyQuota.value = 0
  }
}

function confirmCreate() {
  const needSecond = defaultPeriod.value * 2 * 60
  if (availableQuota.value < needSecond || availableQuota.value <= 0) {
    message.warning(t('可用实验时长额度不足！'))
    return
  }
  saving.value = true
  saveScheduleByParams({
    courseId: props.currCourse.courseId,
    userId: getUserId(),
    scheduleType: 2,
    resourceType: resourceType.value,
    minutes: defaultPeriod.value * 2
  }).then((res) => {
    if (res?.data?.state == 0) {
      message.success(t('创建成功'))
      createDialogOpen.value = false
      gotoArrangeTraining(res.data.data)
    } else {
      message.warning(t('已存在未结束个人排课！'))
    }
  }).catch(() => {
    message.error(t('创建失败，请稍后重试'))
  }).finally(() => {
    saving.value = false
    createDialogOpen.value = false
  })
}

// 旧页在这里 window.open('/online/desktop?...')；在线实验页属 B03 未迁移，先给提示不跳 404
function gotoArrangeTraining(row) {
  const items = row?.scheduleItems || []
  const curr = items.find((item) => item.state == 1)
  if (!curr) {
    message.warning(t('该排课已结束'))
    return
  }
  message.info(t('在线实验页将在后续批次迁移') + `（scheduleItemId=${curr.itemId}）`)
}

/* ---------------- 初始化 ---------------- */
function loadDicts() {
  getDicts('sys_course_type').then((res) => {
    typeOptions.value = (res?.data || []).map((d) => ({ label: t(d.dictLabel), value: d.dictValue }))
  }).catch(() => { typeOptions.value = [] })
  getDicts('sys_course_difficulty').then((res) => {
    difficultyOptions.value = (res?.data || []).map((d) => ({ label: t(d.dictLabel), value: d.dictValue }))
  }).catch(() => { difficultyOptions.value = [] })
}

function getCourseLabel() {
  findListLabel({}).then((res) => {
    courseLabelList.value = res?.rows || []
  }).catch(() => { courseLabelList.value = [] })
}

function getCourseConfig() {
  findListConfig({ courseId: props.currCourse.courseId }).then((res) => {
    if (res?.rows?.length) resourceType.value = res.rows[0].imageSource
  }).catch(() => { resourceType.value = '' })
}

function initDefaultPeriod() {
  getConfigKey('sys.course.period').then((res) => {
    const val = Number(res?.msg)
    if (!Number.isNaN(val) && val > 0) defaultPeriod.value = val
  }).catch(() => { /* 取不到就用 40 分钟 */ })
}

let courseTimer = null

onMounted(() => {
  loadDicts()
  getCourseLabel()
  getCourseConfig()
  getTodaySchedule()
  getStatisticsInfo()
  initDefaultPeriod()
  courseTimer = setInterval(() => {
    if (props.tabKey.includes(props.tabName)) getTodaySchedule()
  }, 10000)
})

onUnmounted(() => {
  if (courseTimer) clearInterval(courseTimer)
})
</script>

<style scoped>
.ci { height: 100%; overflow: auto; background: var(--bg); }
.ci__scroll {
  display: grid; grid-template-columns: 268px minmax(0, 1fr); gap: 18px;
  padding: 18px 20px 28px; align-items: start;
}

/* 封面列 */
.ci__cover-col { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 4px; }
.ci__cover {
  width: 100%; aspect-ratio: 16 / 10; border-radius: var(--r-lg); overflow: hidden;
  background: var(--panel); border: 1px solid var(--line); box-shadow: var(--sh-1);
}
.ci__cover :deep(.ant-image), .ci__cover :deep(.ant-image-img) { width: 100%; height: 100%; display: block; object-fit: cover; }
.ci__acts { display: flex; flex-direction: column; gap: 8px; }
.ci__badge {
  margin-left: 6px; padding: 0 5px; border-radius: 99px;
  background: var(--pri); color: #fff; font-size: 11px; line-height: 15px;
}
.ci__act-tip { margin: 0; font-size: 11.5px; line-height: 1.7; color: var(--ink-4); }

/* 主信息 */
.ci__main { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.ci__title {
  margin: 0; font-size: 22px; line-height: 1.35; font-weight: 650;
  letter-spacing: -.01em; color: var(--ink); overflow-wrap: anywhere;
}
.ci__meta { display: flex; flex-wrap: wrap; gap: 8px; }
.ci__meta-i {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 99px;
  border: 1px solid var(--line); background: var(--panel);
  font-size: 12.5px; color: var(--ink-2);
}

.ci__sec {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg); box-shadow: var(--sh-1); padding: 14px 16px;
}
.ci__sec-hd {
  display: flex; align-items: center; gap: 8px;
  margin: 0 0 10px; font-size: 13.5px; font-weight: 600; color: var(--ink);
}
.ci__sec-hd :deep(.ant-btn-link) { margin-left: auto; padding: 0; height: 20px; font-size: 12px; }

.ci__intro {
  margin: 0; font-size: 12.5px; line-height: 1.85; color: var(--ink-2);
  max-height: 168px; overflow: auto; white-space: pre-wrap;
}

.ci__labels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 20px; margin: 0; }
.ci__label-row { display: flex; align-items: baseline; gap: 8px; min-width: 0; padding: 3px 0; }
.ci__label-row dt { flex: none; width: 4.6em; font-size: 12px; color: var(--ink-4); }
.ci__label-row dd { margin: 0; display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
.ci__none { font-style: normal; font-size: 12px; color: var(--ink-4); }

.ci__prog { margin-bottom: 12px; }
.ci__prog-hd { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
.ci__prog-val { font-size: 24px; font-weight: 650; color: var(--pri); font-variant-numeric: tabular-nums; }
.ci__prog-val small { font-size: 12px; margin-left: 1px; }
.ci__prog-sub { font-size: 11.5px; color: var(--ink-4); }

.ci__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.ci__stat {
  border: 1px solid var(--line-3); border-radius: var(--r); background: var(--bg-soft);
  padding: 10px 12px;
}
.ci__stat-lab { font-size: 11.5px; color: var(--ink-3); }
.ci__stat-val { font-size: 19px; font-weight: 650; color: var(--ink); font-variant-numeric: tabular-nums; }
.ci__stat-val small { font-size: 12px; font-weight: 400; color: var(--ink-4); }
.ci__stat-foot { margin-top: 2px; font-size: 11px; color: var(--ink-4); }
.ci__dot { margin: 0 4px; }

/* 弹窗 */
.ci__dlg-t { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--ink); }
.ci__dlg { text-align: center; padding: 4px 0 8px; }
.ci__muted { margin: 0; font-size: 12px; color: var(--ink-4); }
.ci__quota { margin: 12px 0 0; font-size: 14px; font-weight: 600; color: var(--danger); }
.ci__cls { margin-left: 6px; font-size: 12px; color: var(--ink-3); }

@media (max-width: 1080px) {
  .ci__scroll { grid-template-columns: 1fr; }
  .ci__cover-col { position: static; }
  .ci__cover { max-width: 340px; }
  .ci__labels { grid-template-columns: 1fr; }
  .ci__stats { grid-template-columns: 1fr; }
}
</style>
