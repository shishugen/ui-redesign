<template>
  <!-- 排序设置：拖拽 + 置顶/上移/下移/序号输入（WCAG 2.2：拖拽之外保留单指针与键盘可达方式） -->
  <div class="cs">
    <div v-if="loadError" class="cs__err" role="alert">
      <span>{{ loadError }}</span><a-button size="small" @click="getList">{{ t('重试') }}</a-button>
    </div>

    <a-spin :spinning="loading" :tip="t('正在加载数据中...')">
      <div class="cs__list">
        <div class="cs__row cs__row--hd">
          <span class="cs__c cs__c-seq">{{ t('序号') }}</span>
          <span class="cs__c cs__c-info">{{ t('课程信息') }}</span>
          <span class="cs__c cs__c-state">{{ t('状态') }}</span>
          <span class="cs__c cs__c-status">{{ t('是否上线') }}</span>
          <span class="cs__c cs__c-creator">{{ t('创建者') }}</span>
          <span class="cs__c cs__c-set">{{ t('排序设置') }}</span>
          <span class="cs__c cs__c-act">{{ t('操作') }}</span>
        </div>

        <draggable v-model="courseList" item-key="courseId" handle=".cs__handle"
                   ghost-class="cs__ghost" :animation="200" :disabled="loading" @end="reassignSortValues">
          <template #item="{ element, index }">
            <div class="cs__row">
              <span class="cs__c cs__c-seq">
                <button class="cs__handle" type="button" :aria-label="t('拖动排序')" :title="t('拖动排序')">
                  <HolderOutlined />
                </button>
                <b>{{ index + 1 }}</b>
              </span>
              <span class="cs__c cs__c-info">
                <a-image :width="60" :height="38" :preview="false" :src="imgOf(element)" :fallback="defaultImg" />
                <span class="cs__name">{{ element.courseName }}</span>
              </span>
              <span class="cs__c cs__c-state"><a-tag :color="stateLabel(element.state).color">{{ stateLabel(element.state).label }}</a-tag></span>
              <span class="cs__c cs__c-status"><a-tag :color="statusLabel(element.status).color">{{ statusLabel(element.status).label }}</a-tag></span>
              <span class="cs__c cs__c-creator">{{ element.createByName || '—' }}</span>
              <span class="cs__c cs__c-set">
                <a-input-number v-model:value="element.sort" :min="1" size="small" style="width: 76px" />
                <a-button type="link" size="small" @click="handleSortInputChange(element, element.sort)">{{ t('确认') }}</a-button>
              </span>
              <span class="cs__c cs__c-act">
                <a-button type="link" size="small" :disabled="index === 0" :aria-label="t('置顶')" @click="handleToTop(element)">
                  <ToTopOutlined />
                </a-button>
                <a-button type="link" size="small" :disabled="index === 0" :aria-label="t('上移')" @click="handleToUp(element)">
                  <ArrowUpOutlined />
                </a-button>
                <a-button type="link" size="small" :disabled="index === courseList.length - 1" :aria-label="t('下移')" @click="handleToDown(element)">
                  <ArrowDownOutlined />
                </a-button>
              </span>
            </div>
          </template>
        </draggable>

        <div v-if="!loading && !courseList.length" class="cs__empty" role="status">
          <div class="cs__empty-t">{{ t('还没有可排序的课程') }}</div>
          <div class="cs__empty-d">{{ t('先在列表页新增课程，或调整筛选条件后重试。') }}</div>
        </div>
      </div>
    </a-spin>

    <div class="cs__ft">
      <a-button :disabled="loading" @click="handleReset">{{ t('重置') }}</a-button>
      <a-button type="primary" :loading="submitting" :disabled="loading" @click="handleConfirm">{{ t('确认排序') }}</a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import draggable from 'vuedraggable'
import { HolderOutlined, ToTopOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons-vue'
import { findListCourse, updateCourse } from '@/api/course/course'
import { previewUrl } from '@/api/cloud/file.js'
import defaultImg from '@/assets/images/default_course.png'
import { t } from '@/i18n'

const props = defineProps({
  courseClassify: { type: [String, Number], required: true },
  callbackRefreshList: { type: Function, default: () => {} }
})
const loading = ref(true)
const submitting = ref(false)
const loadError = ref('')
const courseList = ref([])
const snapshot = ref([])
const imgOf = (item) => item.previewImg ? previewUrl + item.previewImg : defaultImg
function stateLabel(s) {
  return ({ 0: { label: t('编辑中'), color: 'default' }, 1: { label: t('审核中'), color: 'orange' },
    2: { label: t('已通过'), color: 'success' }, 3: { label: t('不通过'), color: 'error' } })[s] || { label: '—', color: 'default' }
}
function statusLabel(s) {
  return ({ 0: { label: t('未上线'), color: 'default' }, 1: { label: t('上线中'), color: 'success' } })[s] || { label: '—', color: 'default' }
}
const reassignSortValues = () => courseList.value.forEach((item, idx) => { item.sort = idx + 1 })
const handleSortInputChange = (record, val) => {
  let to = Math.max(1, Math.min(Number(val) || 1, courseList.value.length)) - 1
  const from = courseList.value.findIndex(i => i.courseId === record.courseId)
  if (from === -1 || from === to) return
  const [moved] = courseList.value.splice(from, 1)
  courseList.value.splice(to, 0, moved)
  reassignSortValues()
}
const handleToTop = (row) => {
  const idx = courseList.value.findIndex(i => i.courseId === row.courseId)
  if (idx <= 0) return
  courseList.value.unshift(courseList.value.splice(idx, 1)[0])
  reassignSortValues()
}
const handleToUp = (row) => {
  const idx = courseList.value.findIndex(i => i.courseId === row.courseId)
  if (idx <= 0) return
  ;[courseList.value[idx - 1], courseList.value[idx]] = [courseList.value[idx], courseList.value[idx - 1]]
  reassignSortValues()
}
const handleToDown = (row) => {
  const idx = courseList.value.findIndex(i => i.courseId === row.courseId)
  if (idx === -1 || idx >= courseList.value.length - 1) return
  ;[courseList.value[idx + 1], courseList.value[idx]] = [courseList.value[idx], courseList.value[idx + 1]]
  reassignSortValues()
}
const handleReset = () => {
  courseList.value = snapshot.value.map(i => ({ ...i }))
  message.success(t('已重置'))
}
async function handleConfirm() {
  if (!courseList.value.length) { message.warning(t('暂无课程需要保存')); return }
  submitting.value = true
  try {
    await Promise.all(courseList.value.map(item => updateCourse({ ...item, sort: item.sort })))
    snapshot.value = courseList.value.map(i => ({ ...i }))
    message.success(t('排序已保存'))
    props.callbackRefreshList()
  } catch (e) {
    message.error(t('保存排序失败，请稍后重试'))
  } finally {
    submitting.value = false
  }
}
async function getList() {
  loadError.value = ''
  loading.value = true
  try {
    const res = await findListCourse({ orderByColumn: 'sort', isAsc: 'asc', classify: props.courseClassify })
    courseList.value = res.rows || []
    reassignSortValues()
    snapshot.value = courseList.value.map(i => ({ ...i }))
  } catch (e) {
    loadError.value = t('课程列表接口没有返回数据')
  } finally {
    loading.value = false
  }
}
const handleResize = () => { /* 高度由外部弹窗决定，保留 resize 监听与旧页一致 */ }
onMounted(() => { window.addEventListener('resize', handleResize); getList() })
onUnmounted(() => window.removeEventListener('resize', handleResize))
</script>

<style scoped>
.cs { display: flex; flex-direction: column; gap: 10px; }
.cs__err { display: flex; gap: 10px; align-items: center; color: var(--danger); font-size: 12px; }
.cs__list { max-height: 56vh; overflow: auto; border: 1px solid var(--line); border-radius: var(--r); }
.cs__row {
  display: flex; align-items: center; min-width: 780px; padding: 8px 12px;
  border-bottom: 1px solid var(--line-3); background: var(--panel);
}
.cs__row:last-child { border-bottom: 0; }
.cs__row--hd { position: sticky; top: 0; z-index: 2; background: var(--bg-soft); font-weight: 600; color: var(--ink-2); }
.cs__ghost { opacity: .45; background: var(--pri-50); }
.cs__c { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }
.cs__c-seq { width: 72px; }
.cs__c-info { flex: 1; min-width: 0; }
.cs__c-state, .cs__c-status, .cs__c-creator { width: 100px; justify-content: center; }
.cs__c-set { width: 160px; justify-content: center; }
.cs__c-act { width: 160px; justify-content: center; }
.cs__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cs__handle {
  border: 0; background: transparent; color: var(--ink-4); cursor: grab;
  padding: 4px; border-radius: var(--r-xs); line-height: 1;
}
.cs__handle:hover { background: var(--pri-50); color: var(--pri); }
.cs__empty { padding: 32px; text-align: center; }
.cs__empty-t { font-weight: 600; color: var(--ink-2); }
.cs__empty-d { color: var(--ink-4); font-size: 12px; margin-top: 4px; }
.cs__ft { display: flex; justify-content: flex-end; gap: 8px; }
.cs :deep(.ant-image-img) { object-fit: cover; border-radius: var(--r-xs); }
</style>
