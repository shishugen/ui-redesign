<template>
  <div class="sc">
    <div v-if="loadError" class="sc__state" role="alert">
      <b>{{ t('资源数据加载失败') }}</b><span>{{ loadError }}</span>
      <a-button size="small" @click="initConfigAndUser">{{ t('重试') }}</a-button>
    </div>

    <div class="sc__bar">
      <a-space wrap :size="6">
        <a-input v-model:value="searchVal" allow-clear :placeholder="t('搜索用户')"
                 :disabled="!userList.length" style="width: 210px">
          <template #prefix><span class="sc__count">{{ t('共 {n} 人', { n: userList.length }) }}</span></template>
        </a-input>
        <a-button type="primary" ghost :disabled="currScheduleItem?.state != 1"
                  @click="openBatchHandle(0)">{{ selectedIds.length ? t('批量创建') : t('创建') }}</a-button>
        <a-button type="primary" ghost :disabled="!containerMap.size"
                  @click="openBatchHandle(1)">{{ selectedIds.length ? t('批量同步') : t('同步') }}</a-button>
        <template v-if="configTypeList.includes('notebook')">
          <a-button type="primary" ghost :disabled="currScheduleItem?.state != 1 || !containerMap.size"
                    @click="openBatchHandle(2)">{{ selectedIds.length ? t('批量开机') : t('开机') }}</a-button>
          <a-button danger ghost :disabled="!containerMap.size"
                    @click="openBatchHandle(3)">{{ selectedIds.length ? t('批量关机') : t('关机') }}</a-button>
        </template>
        <a-button danger ghost :disabled="!containerMap.size"
                  @click="openBatchHandle(4)">{{ selectedIds.length ? t('批量释放') : t('释放') }}</a-button>
        <a-button :loading="isRefreshing" :aria-label="t('刷新容器状态')" @click="searchContainer(true)">
          <template #icon><SyncOutlined /></template>{{ t('刷新') }}
        </a-button>
      </a-space>

      <a-space wrap :size="6">
        <div v-if="scheduleOption.scheduleMode == 0" class="sc__times">
          <span class="sc__times-k">{{ t('实验时间') }}：</span>
          <span v-if="currScheduleItem.itemId">{{ formatDateAndTime(currScheduleItem.beginTime, currScheduleItem.actualEndTime) }}</span>
          <span v-if="currScheduleItem.itemId">（{{ formatTimePeriod(currScheduleItem.beginTime, currScheduleItem.actualEndTime) }}）</span>
          <a-tag v-if="stateMap[currScheduleItem.state]" :color="stateMap[currScheduleItem.state].color">
            {{ t(stateMap[currScheduleItem.state].text) }}
          </a-tag>
        </div>
        <template v-else>
          <span class="sc__times-k">{{ t('实验时段（{n}）', { n: scheduleItemList.length }) }}:</span>
          <a-select v-model:value="currItemId" :disabled="!scheduleItemList.length" style="min-width: 280px"
                    :placeholder="t('当前实验')" :aria-label="t('选择实验时段')" @change="changeItems">
            <a-select-option v-for="item in scheduleItemList" :key="item.itemId" :value="item.itemId">
              {{ formatDateAndTime(item.beginTime, item.actualEndTime) }}
              <a-tag v-if="stateMap[item.state]" :color="stateMap[item.state].color">{{ t(stateMap[item.state].text) }}</a-tag>
            </a-select-option>
          </a-select>
        </template>
        <a-button :loading="isScheduleLoading" @click="handleRefresh">{{ t('刷新实验') }}</a-button>
      </a-space>
    </div>

    <a-table :loading="loading" :data-source="showUserList" :columns="columns" row-key="userId"
             :row-selection="{ selectedRowKeys: selectedIds, onChange: onSelectChange }"
             :pagination="false" size="middle" :scroll="{ y: tableHeight - 80 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'configInfo'">
          <div v-if="record.configList?.length">
            <div v-for="config in record.configList" :key="config.configId" class="sc__cfg">
              <a-tag :color="sourceOf(config.imageSource).color">{{ config.imageSource }}</a-tag>
              <b>{{ config.configName }}</b>
              <span class="sc__cfg-meta">
                {{ t('CPU：{c} 核 · 加速卡：{g} · 内存：{m} G', { c: config.cpu, g: config.gpu, m: config.memory }) }}
              </span>
            </div>
          </div>
          <span v-else class="sc__muted">{{ t('暂未配置') }}</span>
        </template>

        <template v-else-if="column.key === 'status'">
          <div v-for="config in (record.configList || [])" :key="config.configId" class="sc__cfg">
            <a-popover trigger="click" placement="leftTop">
              <template #title>{{ t('容器详情') }}</template>
              <template #content>
                <dl class="sc__pop">
                  <dt>{{ t('容器类型') }}</dt><dd>{{ config.imageSource }}</dd>
                  <dt>{{ t('所属用户') }}</dt><dd>{{ record.nickName }}</dd>
                  <dt>{{ t('节点名称') }}</dt><dd>{{ config.configName }}</dd>
                  <dt>{{ t('容器镜像') }}</dt><dd>{{ config.imageName }}:{{ config.version }}</dd>
                  <template v-if="config.description">
                    <dt>{{ t('镜像信息') }}</dt><dd>{{ config.description }}</dd>
                  </template>
                  <template v-if="config.container">
                    <dt>{{ t('容器状态') }}</dt>
                    <dd><a-tag :color="getStatus(config.container.status).color">{{ getStatus(config.container.status).title }}</a-tag></dd>
                    <dt>{{ t('容器 ID') }}</dt><dd>{{ config.container.id }}</dd>
                    <template v-if="config.container.containerName">
                      <dt>{{ t('容器名称') }}</dt><dd>{{ config.container.containerName }}</dd>
                    </template>
                    <dt>{{ t('容器信息') }}</dt><dd>{{ config.container.message || '—' }}</dd>
                    <dt>{{ t('创建时间') }}</dt><dd>{{ config.container.createTime || '—' }}</dd>
                  </template>
                </dl>
              </template>
              <button type="button" class="sc__status-btn"
                      :aria-expanded="undefined" :aria-label="t('查看 {name} 的容器详情', { name: config.configName })">
                <a-tag v-if="config.container" :color="getStatus(config.container.status).color">
                  {{ getStatus(config.container.status).title }}
                </a-tag>
                <a-tag v-else>{{ t('未创建') }}</a-tag>
              </button>
            </a-popover>
          </div>
        </template>

        <template v-else-if="column.key === 'action'">
          <div v-for="config in (record.configList || [])" :key="config.configId" class="sc__cfg">
            <a-button type="link" size="small" :disabled="currScheduleItem?.state != 1 || !!config.container"
                      @click="openHandleByUser(0, record.userId, record.nickName, config.configId)">
              <template #icon><DesktopOutlined /></template>{{ t('创建') }}
            </a-button>
            <a-dropdown v-if="config.container" :trigger="['click']">
              <a-button type="link" size="small" :aria-label="t('更多操作')">
                <template #icon><MenuOutlined /></template>{{ t('更多') }}
              </a-button>
              <template #overlay>
                <a-menu @click="({ key }) => onRowAction(String(key), record, config)">
                  <a-menu-item key="1" :disabled="!config.container">{{ t('同步') }}</a-menu-item>
                  <a-menu-item key="2" :disabled="config.container.status !== 'Running'">{{ t('开机') }}</a-menu-item>
                  <a-menu-item key="3" :disabled="config.container.status !== 'Running'">{{ t('关机') }}</a-menu-item>
                  <a-menu-item key="4" :disabled="!config.container">{{ t('释放') }}</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="url" :disabled="!config.container?.url">{{ t('打开链接') }}</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </template>
      </template>
    </a-table>
    <div class="sc__foot">{{ t('共 {n} 人', { n: showUserList.length }) }}</div>

    <a-modal v-model:open="handleDialogOpen" :title="t('确认{action}？', { action: t(handleMap[handleType]?.text || '') })"
             :ok-text="t('确认')" :cancel-text="t('取消')" :confirm-loading="handleLoading" @ok="confirmHandle">
      <p class="sc__prompt">{{ t(handleMap[handleType]?.tipsText || '') }}</p>
      <div v-if="handleUserIds.length" class="sc__users">
        <a-tag v-for="id in handleUserIds" :key="id">{{ userNameOf(id) }}</a-tag>
      </div>
      <a-checkbox v-if="handleType == 4" v-model:checked="handleIsDelete">{{ t('强制删除') }}</a-checkbox>
    </a-modal>
  </div>
</template>

<script setup name="ScheduleContainer">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'
import { SyncOutlined, MenuOutlined, DesktopOutlined } from '@ant-design/icons-vue'
import { findConfigImageList } from '@/api/course/config.js'
import { getUser } from '@/api/system/user.js'
import { findListStudents } from '@/api/system/clazz/teacherStudent.js'
import { handleScheduleResource } from '@/api/learning/schedule.js'
import { findListScheduleItem } from '@/api/learning/scheduleItem.js'
import { formatDateAndTime, formatTimePeriod } from '@/utils/aigc.js'
import { findListContainer } from '@/api/kube/container.js'
import { findListScnet } from '@/api/kube/scnetContainer.js'
import { findListNotebook } from '@/api/kube/notebook.js'

const props = defineProps({
  schedule: { type: Object, required: true, default: () => ({}) }
})
const scheduleOption = computed(() => Object.assign({
  scheduleId: undefined, scheduleTitle: '', scheduleType: 0, courseId: undefined,
  classesId: undefined, classesName: '', scheduleUserId: undefined, scheduleUserName: '',
  scheduleDays: 1, scheduleMode: 0, state: 0, beginTime: '', endTime: ''
}, props.schedule))

const stateMap = {
  0: { color: 'processing', text: '未开始', value: 0 },
  1: { color: 'success', text: '进行中', value: 1 },
  2: { color: 'default', text: '已结束', value: 2 }
}
const imageSourceMap = {
  local: { color: 'cyan', text: '本地', value: 'local' },
  scnet: { color: 'purple', text: '超算', value: 'scnet' },
  notebook: { color: 'volcano', text: 'notebook', value: 'notebook' }
}
const sourceOf = (key) => imageSourceMap[key] || { color: 'default', text: key || '' }
const handleMap = {
  0: { text: '创建', tipsText: '已成功创建资源的用户系统将会自动忽略!', color: 'var(--pri)' },
  1: { text: '同步', tipsText: '确认同步后，请稍后片刻再刷新查看!', color: 'var(--pri)' },
  2: { text: '开机', tipsText: '确认开机后，资源将处于运行状态!', color: 'var(--pri)' },
  3: { text: '关机', tipsText: '确认关机后，资源将处于停止状态!', color: 'var(--danger)' },
  4: { text: '释放', tipsText: '确认释放后，资源将回收并删除!', color: 'var(--danger)' }
}
const columns = computed(() => [
  { title: t('用户名称'), key: 'nickName', dataIndex: 'nickName', width: 100, ellipsis: true, sorter: true },
  { title: t('用户账号'), key: 'userName', dataIndex: 'userName', width: 100, ellipsis: true, sorter: true },
  { title: t('容器配置'), key: 'configInfo', width: 260 },
  { title: t('容器状态'), key: 'status', width: 100, align: 'center' },
  { title: t('操作'), key: 'action', width: 150, align: 'center' }
])

const loadError = ref('')
const loading = ref(false)
const isRefreshing = ref(false)
const isScheduleLoading = ref(false)
const tableHeight = ref(520)
const searchVal = ref('')
const userList = ref([])
const configList = ref([])
const configTypeList = ref([])
const scheduleItemList = ref([])
const currItemId = ref(null)
const currScheduleItem = ref({ itemId: undefined, state: undefined })
const containerMap = ref(new Map())
const selectedIds = ref([])
const handleDialogOpen = ref(false)
const handleLoading = ref(false)
const handleUserIds = ref([])
const handleConfigIds = ref([])
const handleIsDelete = ref(false)
const handleType = ref(0)
let refreshTimer = null
let waitTimer = null

const showUserList = computed(() => {
  const kw = String(searchVal.value || '').trim()
  return kw ? userList.value.filter(u => String(u.nickName || '').includes(kw) || String(u.userName || '').includes(kw))
    : userList.value
})
const userNameOf = (id) => userList.value.find(u => u.userId === id)?.nickName || id

// 旧页错误分支写 statusObj.style='red'，但模板读 .color → 错误态无色；
// 且 status.toString() 遇 null 会崩。这里统一兜底。
const getStatus = (status) => {
  const raw = status == null ? '' : String(status)
  const map = {
    Waiting: ['warning', raw], Creating: ['warning', raw], Restarting: ['warning', raw],
    Shutting: ['warning', raw], Releasing: ['warning', raw], Deploying: ['warning', raw],
    Running: ['success', raw], Completed: ['default', raw],
    Terminated: ['error', raw], Deleting: ['error', raw], Failed: ['error', raw],
    0: ['warning', 'Creating'], 200: ['success', 'Running'], 202: ['default', 'Terminated'],
    1: ['warning', 'Deploying'], 201: ['warning', 'Deploying'],
    2: ['error', 'Error'], 5: ['error', 'Error'], 8: ['error', 'Error']
  }
  const [color, title] = map[raw] || ['default', raw || t('未创建')]
  return { color, title }
}

async function initConfigAndUser() {
  loadError.value = ''
  userList.value = []
  if (scheduleOption.value.scheduleId == null) return
  loading.value = true
  try {
    const [configRes, teacherRes] = await Promise.all([
      findConfigImageList({ courseId: scheduleOption.value.courseId }),
      getUser(scheduleOption.value.scheduleUserId).catch(() => ({ data: null }))
    ])
    configList.value = configRes?.rows || []
    configTypeList.value = configList.value.map(x => x.imageSource)
    if (teacherRes?.data) userList.value.push(teacherRes.data)
    if (scheduleOption.value.classesId != null) {
      const studentRes = await findListStudents({ deptId: scheduleOption.value.classesId })
      userList.value = [...userList.value, ...(studentRes?.rows || [])]
    }
    userList.value.forEach(u => {
      u.configList = configList.value.map(c => ({ ...c }))
    })
    await searchScheduleItem()
  } catch (e) {
    loadError.value = e?.message || t('资源接口不可用')
  } finally {
    loading.value = false
  }
}

async function searchScheduleItem() {
  if (isScheduleLoading.value) return
  isScheduleLoading.value = true
  try {
    const res = await findListScheduleItem({
      scheduleId: scheduleOption.value.scheduleId, orderByColumn: 'end_time', isAsc: 'asc'
    })
    scheduleItemList.value = res.rows || []
    if (scheduleItemList.value.length) {
      const exist = scheduleItemList.value.find(x => x.itemId == currItemId.value)
      if (!exist) {
        const running = scheduleItemList.value.find(x => x.state == 1)
        const ready = scheduleItemList.value.find(x => x.state == 0)
        currItemId.value = (running || ready || scheduleItemList.value.at(-1)).itemId
      }
      changeItems(currItemId.value)
    }
  } catch (e) {
    loadError.value = e?.message || t('排课明细加载失败')
  } finally {
    isScheduleLoading.value = false
    loading.value = false
  }
}

function changeItems(val) {
  currScheduleItem.value = scheduleItemList.value.find(x => x.itemId == val)
    || { itemId: undefined, state: undefined }
  searchContainer(false)
}

async function searchContainer(withLoading) {
  if (isRefreshing.value) return
  isRefreshing.value = true
  if (withLoading) loading.value = true
  const map = new Map()
  const item = currScheduleItem.value
  if (item.itemId) {
    const params = { scheduleId: item.scheduleId, scheduleItemId: item.itemId }
    try {
      const tasks = []
      if (configTypeList.value.includes('local')) {
        tasks.push(findListContainer(params).then(res => (res?.rows || []).forEach(x => map.set(
          `${x.configId}_${x.userId}`, { ...x, id: x.containerId, status: x.containerStatus,
            message: x.containerMessage, url: undefined, imageSource: 'local' }))))
      }
      if (configTypeList.value.includes('scnet')) {
        tasks.push(findListScnet(params).then(res => (res?.rows || []).forEach(x => map.set(
          `${x.configId}_${x.userId}`, { ...x, id: x.scnetContainerId, containerName: '',
            url: x.jupyterUrl, imageSource: 'scnet' }))))
      }
      if (configTypeList.value.includes('notebook')) {
        tasks.push(findListNotebook(params).then(res => (res?.rows || []).forEach(x => map.set(
          `${x.configId}_${x.userId}`, { ...x, id: x.scnetNotebookId, containerName: '',
            status: x.notebookStatus, url: x.notebookUrl, imageSource: 'notebook' }))))
      }
      await Promise.all(tasks)
      userList.value.forEach(u => {
        (u.configList || []).forEach(c => { c.container = map.get(`${c.configId}_${u.userId}`) })
      })
    } catch (e) {
      message.error(e?.message || t('容器状态加载失败'))
    }
  }
  containerMap.value = map
  isRefreshing.value = false
  loading.value = false
}

const onSelectChange = (keys) => { selectedIds.value = keys }
const handleRefresh = async () => { loading.value = true; await searchScheduleItem() }

function openBatchHandle(type) {
  handleType.value = type
  handleUserIds.value = selectedIds.value.length ? [...selectedIds.value] : userList.value.map(u => u.userId)
  handleConfigIds.value = []
  handleIsDelete.value = false
  if (!handleUserIds.value.length) { message.info(t('暂无用户可操作')); return }
  handleDialogOpen.value = true
}
function openHandleByUser(type, userId, nickName, configId) {
  handleType.value = type
  handleUserIds.value = [userId]
  handleConfigIds.value = [configId]
  handleIsDelete.value = false
  handleDialogOpen.value = true
}
function onRowAction(key, record, config) {
  if (key === 'url') {
    if (config.container?.url) window.open(config.container.url, '_blank', 'noopener')
    return
  }
  openHandleByUser(Number(key), record.userId, record.nickName, config.configId)
}

async function confirmHandle() {
  if (!currScheduleItem.value.itemId) { message.warning(t('排课不存在')); return }
  handleLoading.value = true
  try {
    await handleScheduleResource({
      scheduleId: currScheduleItem.value.scheduleId,
      itemId: currScheduleItem.value.itemId,
      userIds: handleUserIds.value.join(','),
      configIds: handleConfigIds.value.join(','),
      classesId: scheduleOption.value.classesId,
      handleType: handleType.value,
      isDelete: handleIsDelete.value
    })
    message.success(t('操作成功！请耐心等候资源刷新……'))
    selectedIds.value = []
    handleDialogOpen.value = false
    clearTimeout(waitTimer)
    waitTimer = setTimeout(() => searchContainer(true), 800)
  } catch (e) {
    message.error(e?.message || t('操作失败，请重试'))
  } finally { handleLoading.value = false }
}

const handleResize = () => { tableHeight.value = Math.max(360, document.documentElement.clientHeight - 150) }
onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  initConfigAndUser()
  refreshTimer = setInterval(() => searchScheduleItem(), 15000)
})
// 旧页只清了 trainingTimer，resize 监听与 3s 延时刷新都泄漏
onUnmounted(() => {
  clearInterval(refreshTimer)
  clearTimeout(waitTimer)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.sc { display: flex; flex-direction: column; gap: 10px; }
.sc__state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 30px;
  border: 1px dashed var(--danger-line); border-radius: var(--r); color: var(--danger); font-size: 12.5px; }
.sc__bar { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); }
.sc__count { font-size: 11.5px; color: var(--ink-3); font-weight: 600; }
.sc__times { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: var(--ink-2); }
.sc__times-k { color: var(--ink-3); }
.sc__cfg { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-height: 30px;
  padding: 3px 0; border-bottom: 1px solid var(--line-3); }
.sc__cfg:last-child { border-bottom: 0; }
.sc__cfg-meta { font-size: 11.5px; color: var(--ink-4); }
.sc__muted { color: var(--ink-4); font-size: 12px; }
.sc__foot { text-align: right; font-size: 12px; color: var(--ink-4); }
.sc__status-btn { border: 0; background: transparent; cursor: pointer; padding: 2px; }
.sc__status-btn:focus-visible { outline: 2px solid var(--pri); outline-offset: 2px; }
.sc__pop { display: grid; grid-template-columns: 92px 1fr; gap: 6px 12px; max-width: 520px; margin: 0; font-size: 12px; }
.sc__pop dt { color: var(--ink-4); }
.sc__pop dd { margin: 0; color: var(--ink-2); word-break: break-all; }
.sc__prompt { font-size: 13px; color: var(--ink-2); }
.sc__users { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; }
</style>
