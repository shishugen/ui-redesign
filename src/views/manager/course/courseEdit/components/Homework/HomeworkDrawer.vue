<template>
  <div class="hd">
    <header class="hd__bar">
      <div class="hd__title">
        <span>{{ t('本章节作业') }}</span>
        <a-tag v-if="current.groupId" :color="statusColor(current.status)">{{ statusName(current.status) }}</a-tag>
        <span v-if="chapterName" class="hd__chap">· {{ chapterName }}</span>
      </div>
      <a-space :size="6" wrap>
        <a-button size="small" :aria-label="t('刷新')" @click="loadAll"><template #icon><SyncOutlined /></template></a-button>
        <a-button v-if="current.groupId" size="small" @click="openStatistics">
          <template #icon><BarChartOutlined /></template>{{ t('进度统计') }}
        </a-button>
        <a-button v-if="current.groupId" size="small" @click="openSettings">
          <template #icon><SettingOutlined /></template>{{ t('作业设置') }}
        </a-button>
        <a-button v-if="canEdit && current.status == 1 && hasPerm('exam:homework:edit')" size="small" danger
                  :loading="acting" @click="handleClose">
          <template #icon><StopOutlined /></template>{{ t('关闭') }}
        </a-button>
        <a-button v-if="canEdit && current.status != 1 && hasPerm('exam:homework:publish')" type="primary" size="small"
                  :loading="acting" @click="handlePublish">
          <template #icon><SendOutlined /></template>{{ Number(current.status) === 2 ? t('重新发布') : t('发布作业') }}
        </a-button>
      </a-space>
    </header>

    <div v-if="loadError" class="hd__state" role="alert">
      <b>{{ t('本章节作业加载失败') }}</b><span>{{ loadError }}</span>
      <a-button size="small" @click="loadAll">{{ t('重试') }}</a-button>
    </div>
    <div v-else-if="loading && !current.groupId" class="hd__state" aria-busy="true">
      <a-spin :tip="t('正在加载')" />
    </div>

    <a-spin v-else :spinning="loading || detailLoading">
      <a-alert class="hd__tip" type="info" show-icon :description="poolTip" />
      <a-alert v-if="current.status == 0" class="hd__tip" type="warning" show-icon
               :message="t('作业尚未发布，学生端看不到。发布后会为卷池内每张未排考的试卷各建一场作业考试。')" />

      <div class="hd__pool-hd">
        <span class="hd__sub">
          {{ t('卷池（{n} 张，其中可分配 {m} 张）', { n: papers.length, m: enabledCount }) }}
        </span>
        <a-button v-if="canEdit && hasPerm('exam:homework:edit')" type="primary" ghost size="small" @click="openGenerate">
          <template #icon><ThunderboltOutlined /></template>{{ t('本章出题入池') }}
        </a-button>
      </div>

      <a-table :columns="paperColumns" :data-source="papers" row-key="paperId" size="small" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <a-button type="link" size="small" class="hd__link" :title="t('点击预览：{name}', { name: record.title })"
                      @click="previewPaper(record)">{{ record.title }}</a-button>
          </template>
          <template v-else-if="column.key === 'exam'">
            <a-tag v-if="record.examId" color="green">{{ t('已排场次') }}</a-tag>
            <a-tag v-else color="orange">{{ t('未排（发布时自动排）') }}</a-tag>
          </template>
          <template v-else-if="column.key === 'attemptCount'">{{ t('{n} 轮', { n: record.attemptCount || 0 }) }}</template>
          <template v-else-if="column.key === 'status'">
            <a-switch :checked="record.status == 1" :disabled="!canEdit || !hasPerm('exam:homework:edit')"
                      :loading="record._switching" :checked-children="t('启用')" :un-checked-children="t('停用')"
                      :aria-label="t('切换可分配：{name}', { name: record.title })"
                      @change="(v) => togglePaper(record, v)" />
          </template>
          <template v-else-if="column.key === 'op'">
            <a-tooltip v-if="!canEditQuestions(record)" :title="questionEditTip(record)">
              <span class="hd__disabled-wrap">
                <a-button type="link" size="small" disabled>{{ t('编辑题目') }}</a-button>
              </span>
            </a-tooltip>
            <a-button v-else type="link" size="small" @click="openQuestionEdit(record)">{{ t('编辑题目') }}</a-button>
          </template>
        </template>
      </a-table>
      <div v-if="!detailLoading && !papers.length" class="hd__pool-empty" role="status">
        <b>{{ t('卷池为空') }}</b>
        <span>{{ t('点上方「本章出题入池」生成试卷；一张卷也没有时发布会被服务端拒绝。') }}</span>
      </div>
    </a-spin>

    <!-- 作业设置：三项全课统一，未保存时禁用提交；字段级错误 + 顶部可聚焦汇总 -->
    <a-modal v-model:open="settingsModal.open" :width="620" :get-container="false"
             :ok-text="t('保存设置')" :cancel-text="t('取消')"
             :ok-button-props="{ disabled: !dirty || !canEdit || !hasPerm('exam:homework:edit') }"
             :confirm-loading="saving" @ok="saveSettings" @cancel="cancelSettings">
      <template #title>
        {{ t('作业设置（全课统一）') }}
        <a-tooltip :title="t('三项都是整门课共用的默认值，新建作业时已自动写好；改动一次，全课所有章节一起生效。')">
          <QuestionCircleOutlined class="hd__help" />
        </a-tooltip>
      </template>

      <div v-if="settingsErrors.length" ref="settingsSummary" class="hd__err-sum" role="alert" tabindex="-1">
        <b>{{ t('有 {n} 项设置需要修改', { n: settingsErrors.length }) }}</b>
        <ul><li v-for="(e, i) in settingsErrors" :key="i">{{ e }}</li></ul>
      </div>

      <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 17 }" class="hd__form">
        <a-form-item>
          <template #label>
            {{ t('每人可做次数') }}
            <a-tooltip :title="t('全课统一值，保存后本课所有章节一起生效；下调到低于学生已用轮次会被拒绝。')">
              <QuestionCircleOutlined class="hd__help" />
            </a-tooltip>
          </template>
          <div class="hd__row">
            <a-input-number v-model:value="settings.maxAttempt" :min="1" :max="20" :disabled="!canEdit"
                            style="width: 120px" :aria-describedby="settingsErrors.length ? 'hw-setting-err' : undefined"
                            @blur="validateSettings" />
            <span class="hd__unit">{{ t('次') }}</span>
          </div>
        </a-form-item>
        <a-form-item>
          <template #label>
            {{ t('开放时间') }}
            <a-tooltip :title="t('默认长期有效，学生随时可做；改为限时段后只有窗口内能抽卷交卷。')">
              <QuestionCircleOutlined class="hd__help" />
            </a-tooltip>
          </template>
          <a-checkbox v-model:checked="settings.longTerm" :disabled="!canEdit" @change="onLongTermChange">
            {{ t('长期有效（随时可做）') }}
          </a-checkbox>
        </a-form-item>
        <a-form-item v-if="!settings.longTerm" :label="t('起止时间')">
          <a-range-picker v-model:value="settings.dateRange" show-time format="YYYY-MM-DD HH:mm"
                          value-format="YYYY-MM-DD HH:mm" style="width: 100%" :disabled="!canEdit"
                          :placeholder="[t('开始时间'), t('结束时间')]" @change="validateSettings" />
        </a-form-item>
        <a-form-item>
          <template #label>
            {{ t('需先完成本章节') }}
            <a-tooltip :title="t('开启后学生要先学完本章节内容才能抽卷；开关值全课统一，完成情况仍按各自章节判。')">
              <QuestionCircleOutlined class="hd__help" />
            </a-tooltip>
          </template>
          <a-switch v-model:checked="settings.requireFinish" :checked-value="1" :un-checked-value="0"
                    :checked-children="t('是')" :un-checked-children="t('否')" :disabled="!canEdit" />
        </a-form-item>
        <div v-if="settingsErrors.length" id="hw-setting-err" class="hd__err-inline">
          {{ settingsErrors.join(' ') }}
        </div>
      </a-form>
    </a-modal>

    <!-- 进度统计 -->
    <a-modal v-model:open="stat.open" :title="t('进度统计 - {name}', { name: chapterName || t('本章节作业') })"
             width="1000px" :footer="null">
      <a-spin :spinning="stat.loading">
        <a-descriptions size="small" :column="4" bordered class="hd__stat-sum">
          <a-descriptions-item :label="t('参与人数')">{{ statSum.userCount || 0 }}</a-descriptions-item>
          <a-descriptions-item :label="t('已占用轮次')">{{ statSum.attemptCount || 0 }}</a-descriptions-item>
          <a-descriptions-item :label="t('已交卷')">{{ statSum.submittedCount || 0 }}</a-descriptions-item>
          <a-descriptions-item :label="t('成绩已确认')">{{ statSum.confirmedCount || 0 }}</a-descriptions-item>
        </a-descriptions>
        <a-alert type="warning" show-icon class="hd__tip"
                 :message="t('一人可有多轮，下面是逐轮成绩；未确认的轮次学生看不到。')" />
        <a-table :columns="attemptColumns" :data-source="stat.attempts" row-key="rowKey" size="small"
                 :pagination="false" :scroll="{ y: 420 }">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'userName'">{{ record.userName || record.userId }}</template>
            <template v-else-if="column.key === 'state'">
              <a-tag :color="gradeColor(record.state)">{{ gradeName(record.state) }}</a-tag>
            </template>
            <template v-else-if="column.key === 'op'">
              <a-button v-if="record.state == 0 && hasPerm('exam:homework:reset')" type="link" size="small" danger
                        @click="handleReset(record)">{{ t('回收此轮') }}</a-button>
              <span v-else class="hd__muted">—</span>
            </template>
          </template>
        </a-table>
        <div v-if="!stat.loading && !stat.attempts.length" class="hd__pool-empty" role="status">
          <b>{{ t('还没有学生抽过这张池里的卷') }}</b>
        </div>
      </a-spin>
    </a-modal>

    <a-drawer v-model:open="gen.open" :title="t('本章出题入池 - {name}', { name: chapterName || '' })"
              :width="drawerWidth" destroy-on-close :mask-closable="false" :body-style="{ padding: 0 }" @close="loadPapers">
      <HomeworkGenPanel v-if="gen.open" :group-id="current.groupId" :chapter-id="chapterId"
                        :chapter-name="chapterName" :course-name="courseName" :course-id="courseId" @saved="loadPapers" />
    </a-drawer>

    <a-drawer v-model:open="preview.open" :title="t('试卷预览 - {name}', { name: preview.title })"
              :width="drawerWidth" destroy-on-close>
      <AiPaperPreview v-if="preview.open && preview.paperId" :paper-id="preview.paperId" />
    </a-drawer>

    <a-drawer v-model:open="qEdit.open" :title="t('编辑题目 - {name}', { name: qEdit.title })"
              :width="drawerWidth" destroy-on-close>
      <AiPaperQuestionEditor v-if="qEdit.open && qEdit.paperId" :paper-id="qEdit.paperId"
                             @saved="onQuestionsSaved" @cancel="qEdit.open = false" />
    </a-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, defineAsyncComponent } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { t } from '@/i18n'
import { SyncOutlined, SendOutlined, StopOutlined, BarChartOutlined, SettingOutlined,
  QuestionCircleOutlined, ThunderboltOutlined } from '@ant-design/icons-vue'
import { getUserPermissions } from '@/utils/user'
import {
  ensureHomeworkChapter, getHomeworkGroup, updateHomeworkGroup, closeHomeworkGroup,
  publishHomeworkGroup, updateHomeworkPaperStatus, getHomeworkStatistics, resetHomeworkAttempt
} from '@/api/exam/homework'
import AiPaperPreview from '@/views/manager/exam/components/AiPaperPreview.vue'
import AiPaperQuestionEditor from '@/views/manager/exam/components/AiPaperQuestionEditor.vue'

const HomeworkGenPanel = defineAsyncComponent(() => import('./HomeworkGenPanel.vue'))

const props = defineProps({
  courseId: { type: [String, Number], default: '' },
  chapterId: { type: [String, Number], required: true, default: '' },
  chapterName: { type: String, default: '' },
  courseName: { type: String, default: '' },
  canEdit: { type: Boolean, default: false }
})
const emit = defineEmits(['changed'])

// A 适配层直接取权限：空权限时静默返回 false，不打印 checkPermi 的 console.error
const hasPerm = (key) => {
  const list = getUserPermissions() || []
  return list.includes('*:*:*') || list.includes(key)
}

const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const acting = ref(false)
const loadError = ref('')
const current = ref({})
const papers = ref([])
const drawerWidth = ref(Math.round(typeof window === 'undefined' ? 1200 : window.innerWidth * 0.95))

const paperColumns = computed(() => [
  { title: t('试卷'), dataIndex: 'title', key: 'title', ellipsis: true },
  { title: t('题数'), dataIndex: 'questionCount', key: 'questionCount', width: 64 },
  { title: t('总分'), dataIndex: 'totalScore', key: 'totalScore', width: 64 },
  { title: t('排考'), dataIndex: 'exam', key: 'exam', width: 150 },
  { title: t('已抽'), dataIndex: 'attemptCount', key: 'attemptCount', width: 70 },
  { title: t('可分配'), dataIndex: 'status', key: 'status', width: 110 },
  { title: t('操作'), key: 'op', width: 96 }
])
const attemptColumns = computed(() => [
  { title: t('学生'), dataIndex: 'userName', key: 'userName', width: 120 },
  { title: t('试卷'), dataIndex: 'paperTitle', key: 'paperTitle', ellipsis: true },
  { title: t('轮次'), dataIndex: 'attemptNo', key: 'attemptNo', width: 60 },
  { title: t('得分'), dataIndex: 'score', key: 'score', width: 70 },
  { title: t('交卷时间'), dataIndex: 'submitTime', key: 'submitTime', width: 150 },
  { title: t('状态'), dataIndex: 'state', key: 'state', width: 110 },
  { title: t('操作'), key: 'op', width: 100 }
])

const enabledCount = computed(() => papers.value.filter(p => p.status == 1).length)
const statusName = (s) => Number(s) === 1 ? t('已发布') : Number(s) === 2 ? t('已关闭') : t('未发布')
const statusColor = (s) => Number(s) === 1 ? 'green' : Number(s) === 2 ? 'default' : 'orange'
const gradeName = (s) => Number(s) === 2 ? t('已确认') : Number(s) === 1 ? t('已交卷待确认') : t('未交卷')
const gradeColor = (s) => Number(s) === 2 ? 'green' : Number(s) === 1 ? 'blue' : 'default'

const poolTip = computed(() => [
  t('学生在章节节点点「开始作业」时，从卷池随机抽一张没做过的卷；都做过了则允许重复抽。'),
  Number(settings.requireFinish) === 1 ? t('做作业前需先完成本章节学习') : t('不限制章节学习进度'),
  t('交卷后展示逐题解析；学生交卷后本课任课老师都能在作业看板看到。'),
  t('题目要改：先把那张卷的「可分配」关掉，且它还没被学生抽过，行末【编辑题目】才可点。'),
  papers.value.length > Number(settings.maxAttempt)
    ? t('本章卷池 {a} 张已超全课可做次数（{b}），后面只能重复抽。', { a: papers.value.length, b: settings.maxAttempt }) : ''
].filter(Boolean).join(''))

const applyChapter = (data) => {
  current.value = data.group || {}
  papers.value = (data.papers || []).map(p => ({ ...p, _switching: false }))
  syncSettings()
}
async function loadAll() {
  if (!props.chapterId) return
  loadError.value = ''
  loading.value = true
  try {
    const res = await ensureHomeworkChapter(props.chapterId, props.courseId, props.chapterName)
    applyChapter(res.data || {})
  } catch (e) { loadError.value = e?.message || t('作业接口不可用') }
  finally { loading.value = false }
}
async function loadPapers() {
  if (!current.value.groupId) return
  detailLoading.value = true
  try {
    const res = await getHomeworkGroup(current.value.groupId)
    applyChapter(res.data || {})
  } catch (e) { message.error(e?.message || t('卷池刷新失败')) }
  finally { detailLoading.value = false }
}

// ---------- 设置 ----------
const settings = reactive({ longTerm: true, dateRange: [], requireFinish: 1, maxAttempt: 10, remark: '' })
const initial = ref('')
const settingsErrors = ref([])
const settingsSummary = ref(null)
const settingsModal = reactive({ open: false })

const snapshot = () => ({
  longTerm: settings.longTerm, dateRange: [...(settings.dateRange || [])],
  requireFinish: settings.requireFinish, maxAttempt: settings.maxAttempt, remark: settings.remark
})
const dirty = computed(() => !!current.value.groupId && JSON.stringify(snapshot()) !== initial.value)
const syncSettings = () => {
  const row = current.value
  const hasWindow = row.beginTime && row.endTime
  settings.longTerm = !hasWindow
  settings.dateRange = hasWindow ? [String(row.beginTime).slice(0, 16), String(row.endTime).slice(0, 16)] : []
  settings.requireFinish = row.requireFinish == null ? 1 : row.requireFinish
  settings.maxAttempt = Number(row.maxAttempt) > 0 ? Number(row.maxAttempt) : 10
  settings.remark = row.remark || ''
  initial.value = JSON.stringify(snapshot())
  settingsErrors.value = []
}
const validateSettings = () => {
  const errs = []
  if (!(Number(settings.maxAttempt) >= 1)) errs.push(t('请填写每人可做次数，至少 1 次'))
  if (!settings.longTerm && !(settings.dateRange?.[0] && settings.dateRange?.[1])) {
    errs.push(t('请选齐开放起止时间，或改勾「长期有效」'))
  }
  settingsErrors.value = errs
  return !errs.length
}
const openSettings = () => {
  if (!current.value.groupId) { message.warning(t('本章节作业还没准备好，请稍候或刷新重试')); return }
  syncSettings()
  settingsModal.open = true
}
const cancelSettings = () => { syncSettings(); settingsModal.open = false }
const onLongTermChange = (e) => { if (e.target.checked) { settings.dateRange = []; validateSettings() } }
async function saveSettings() {
  if (!validateSettings()) { await nextTick(); settingsSummary.value?.focus(); return }
  saving.value = true
  try {
    await updateHomeworkGroup({
      groupId: current.value.groupId,
      requireFinish: settings.requireFinish,
      maxAttempt: Number(settings.maxAttempt),
      showAnalysis: 1,
      remark: settings.remark,
      beginTime: settings.longTerm ? null : (settings.dateRange?.[0] || null),
      endTime: settings.longTerm ? null : (settings.dateRange?.[1] || null),
      longTerm: settings.longTerm ? 1 : 0
    })
    message.success(t('设置已保存'))
    settingsModal.open = false
    await loadAll()
  } catch (e) { message.error(e?.message || t('保存失败，请重试')) }
  finally { saving.value = false }
}

// ---------- 发布 / 关闭 ----------
function handlePublish() {
  if (dirty.value) { message.warning(t('设置改动还没保存，先点「保存设置」')); return }
  if (!papers.value.length) { message.warning(t('卷池为空，请先「本章出题入池」')); return }
  Modal.confirm({
    title: t('确认发布作业？'),
    content: t('发布后将为卷池内每张还没排考的试卷各建一场作业考试，学生可在章节页开始作业。'),
    okText: t('确定'), cancelText: t('取消'),
    onOk: async () => {
      acting.value = true
      try {
        const res = await publishHomeworkGroup(current.value.groupId)
        message.success(t('发布成功，新增 {n} 场作业考试', { n: res.data?.published || 0 }))
        await loadAll()
        emit('changed')
      } catch (e) { message.error(e?.message || t('发布失败，请重试')) }
      finally { acting.value = false }
    }
  })
}
function handleClose() {
  Modal.confirm({
    title: t('确认关闭作业？'),
    content: t('关闭后学生端立即看不到这份作业，也不能再抽卷；已经抽到卷的学生仍可交完这一轮。'),
    okText: t('确定'), cancelText: t('取消'),
    onOk: async () => {
      acting.value = true
      try {
        await closeHomeworkGroup(current.value.groupId)
        message.success(t('已关闭'))
        await loadAll()
        emit('changed')
      } catch (e) { message.error(e?.message || t('关闭失败，请重试')) }
      finally { acting.value = false }
    }
  })
}

// ---------- 卷池 ----------
async function togglePaper(record, checked) {
  const status = checked ? 1 : 0
  record._switching = true
  try {
    await updateHomeworkPaperStatus(record.paperId, status)
    record.status = status
    message.success(status === 1 ? t('已启用') : t('已停用，不再分配给新学生'))
  } catch (e) { message.error(e?.message || t('状态更新失败')) }
  finally { record._switching = false; await loadPapers() }
}
const gen = ref({ open: false })
const openGenerate = () => {
  if (!current.value.groupId) { message.warning(t('本章节作业还没准备好，请稍候或刷新重试')); return }
  gen.value.open = true
}
const preview = ref({ open: false, title: '', paperId: '' })
const previewPaper = (row) => { preview.value = { open: true, title: row.title || '', paperId: row.paperId } }

const canEditQuestions = (row) => props.canEdit && hasPerm('exam:aiExam:publish')
  && Number(row.status) !== 1 && (Number(row.attemptCount) || 0) === 0
const questionEditTip = (row) => {
  if (!props.canEdit) return t('当前账号没有本章节作业的编辑权（只能看），不能改题目')
  if (!hasPerm('exam:aiExam:publish')) return t('没有【AI试卷管理】的试卷发布权限，不能改题目')
  const drawn = Number(row.attemptCount) || 0
  if (drawn > 0) return t('本张卷已被抽 {n} 轮，改题会与学生卷面错位，不可编辑', { n: drawn })
  if (Number(row.status) === 1) return t('这张卷还在「启用」（可分配），先停用再编辑')
  return ''
}
const qEdit = ref({ open: false, title: '', paperId: '' })
const openQuestionEdit = (row) => { qEdit.value = { open: true, title: row.title || '', paperId: row.paperId } }
const onQuestionsSaved = () => { qEdit.value.open = false; loadPapers() }

// ---------- 统计 ----------
const stat = reactive({ open: false, loading: false, attempts: [] })
const statSum = ref({})
const openStatistics = () => { stat.open = true; loadStatistics() }
async function loadStatistics() {
  if (!current.value.groupId) return
  stat.loading = true
  try {
    const res = await getHomeworkStatistics(current.value.groupId)
    const data = res.data || {}
    statSum.value = data.summary || {}
    stat.attempts = (data.attempts || []).map(r => ({ ...r, rowKey: `${r.userId}_${r.examId}_${r.attemptNo}` }))
  } catch (e) { message.error(e?.message || t('进度统计加载失败')) }
  finally { stat.loading = false }
}
function handleReset(record) {
  Modal.confirm({
    title: t('确认回收此轮？'),
    content: t('回收「{name}」的第 {n} 轮？该轮不占用可做次数，回收后学生可重新抽卷。',
      { name: record.userName || record.userId, n: record.attemptNo }),
    okText: t('确定'), cancelText: t('取消'),
    onOk: async () => {
      await resetHomeworkAttempt({ groupId: current.value.groupId, userId: record.userId, attemptNo: record.attemptNo })
      message.success(t('已回收'))
      loadStatistics(); loadPapers()
    }
  })
}

onMounted(loadAll)
</script>

<style scoped>
.hd { display: flex; flex-direction: column; gap: 12px; }
.hd__bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); }
.hd__title { display: flex; align-items: center; gap: 8px; font-weight: 600; color: var(--ink-2); font-size: 13px; }
.hd__chap { font-weight: 400; color: var(--ink-4); }
.hd__state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px;
  border: 1px dashed var(--line-2); border-radius: var(--r); color: var(--ink-3); font-size: 12.5px; }
.hd__state b { color: var(--ink-2); }
.hd__tip { margin-bottom: 10px; }
.hd__pool-hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 14px 0 8px; }
.hd__sub { font-weight: 600; font-size: 13px; color: var(--ink-2); }
.hd__link { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.hd__pool-empty { display: flex; flex-direction: column; gap: 6px; padding: 26px 14px; text-align: center;
  border: 1px dashed var(--line-2); border-radius: var(--r); color: var(--ink-3); font-size: 12.5px; }
.hd__pool-empty b { color: var(--ink-2); }
.hd__disabled-wrap { display: inline-block; cursor: not-allowed; }
.hd__muted { color: var(--ink-4); }
.hd__help { color: var(--ink-4); margin-left: 4px; }
.hd__row { display: flex; align-items: center; gap: 8px; }
.hd__unit { color: var(--ink-3); font-size: 12px; }
.hd__form :deep(.ant-form-item) { margin-bottom: 12px; }
.hd__err-sum { margin-bottom: 12px; padding: 10px 14px; border: 1px solid var(--danger-line);
  background: var(--danger-soft); border-radius: var(--r); color: var(--danger); font-size: 12.5px; }
.hd__err-sum:focus { outline: 2px solid var(--danger); outline-offset: 2px; }
.hd__err-sum ul { margin: 6px 0 0; padding-left: 18px; }
.hd__err-inline { color: var(--danger); font-size: 12px; margin: -4px 0 10px; }
.hd__stat-sum { margin-bottom: 12px; }
</style>
