<template>
  <div ref="rootRef" class="trn" :class="{ 'is-resizing': isResizing }">
    <!-- 左：教学班级 -->
    <aside class="trn__side" :style="{ width: width + 'px' }">
      <div v-show="leftShow" class="trn__side-hd">{{ t('教学班级') }}</div>
      <div v-show="leftShow" class="trn__side-bd">
        <button
          v-for="item in assignList"
          :key="item.assignId"
          type="button"
          class="trn__cls"
          :class="{ 'is-active': item.assignId === currAssign.assignId }"
          :aria-current="item.assignId === currAssign.assignId ? 'true' : 'false'"
          @click="handleSelect(item)"
        >
          <span class="trn__cls-name">{{ item.classesName }}</span>
          <span v-if="isAdmin()" class="trn__cls-teacher">{{ item.teacherName }}</span>
        </button>
        <div v-if="!assignList.length" class="trn__empty" role="status">
          <div class="trn__empty-t">{{ t('这门课程还没有分配班级') }}</div>
          <div class="trn__empty-d">{{ t('先到「课程分配」把课程分配给班级，再回来开实验。') }}</div>
        </div>
      </div>
    </aside>

    <div
      v-show="leftShow"
      class="trn__divider"
      role="separator"
      aria-orientation="vertical"
      :aria-valuenow="width"
      :aria-label="t('拖拽调整左栏宽度，方向键微调')"
      tabindex="0"
      @mousedown="startResize"
      @keydown.left.prevent="nudge(-24)"
      @keydown.right.prevent="nudge(24)"
    />
    <button
      type="button"
      class="trn__toggle"
      :aria-label="leftShow ? t('收起班级栏') : t('展开班级栏')"
      :title="leftShow ? t('收起班级栏') : t('展开班级栏')"
      @click="toggle"
    >
      <LeftOutlined v-if="leftShow" />
      <RightOutlined v-else />
    </button>

    <!-- 右：学生与资源 -->
    <section class="trn__main">
      <header class="trn__hd">
        <div class="trn__hd-l">
          <a-input-search
            v-model:value="searchVal"
            allow-clear
            class="trn__search"
            :placeholder="t('搜索学生')"
            :disabled="!studentList.length"
            :aria-label="t('搜索学生')"
            @change="handleSearch"
          >
            <template #enterButton>
              <span class="trn__count">{{ currAssign.classesName || t('未选择班级') }}（{{ total }}）</span>
            </template>
          </a-input-search>

          <span class="trn__kv">
            <span class="trn__k">{{ t('实验状态') }}</span>
            <span class="tag" :class="arrangeStateClass">{{ arrangeStateText }}</span>
          </span>
          <span v-if="currArrange.arrangeId" class="trn__kv">
            <span class="trn__k">{{ t('实验时间') }}</span>
            <span class="trn__v">{{ currArrange.beginTime }} ~ {{ currArrange.actualEndTime }}</span>
          </span>
          <span v-if="currTimeLimit" class="trn__kv">
            <span class="trn__k">{{ t('时限') }}</span>
            <span class="trn__v">{{ currTimeLimit }}</span>
          </span>
        </div>

        <div class="trn__hd-r">
          <a-button size="small" @click="handleRefresh">{{ t('刷新实验') }}</a-button>
          <a-button size="small" type="primary" :disabled="currArrange.arrangeState < 2" @click="startTraining">
            {{ t('开启实验') }}
          </a-button>
          <a-button size="small" danger :disabled="!currArrange.arrangeId || currArrange.arrangeState == 2" @click="toEndTraining">
            {{ t('结束实验') }}
          </a-button>
        </div>
      </header>

      <div class="trn__bar">
        <a-button size="small" :disabled="!selectedRowKeys.length || !canManage" @click="batchCreateResource">{{ t('批量创建') }}</a-button>
        <a-button size="small" :disabled="!selectedRowKeys.length || !canManage || !resourceCount" @click="batchReleaseResource">{{ t('批量删除') }}</a-button>
        <a-button size="small" :disabled="!canManage" @click="createAll">{{ t('创建资源') }}</a-button>
        <a-button size="small" :disabled="!resourceCount" @click="releaseAll">{{ t('释放资源') }}</a-button>
        <a-button size="small" :disabled="!currArrange.arrangeId" @click="searchContainer(true)">{{ t('刷新资源') }}</a-button>
        <span class="trn__bar-r">{{ t('共（{n}）条数据 · 资源 {r} 个', { n: showStudents.length, r: resourceCount }) }}</span>
      </div>

      <div class="trn__body">
        <a-table
          :loading="loading"
          :data-source="showStudents"
          :columns="columns"
          :row-selection="{ selectedRowKeys, onChange: onSelectChange }"
          :pagination="false"
          :scroll="{ y: tableHeight }"
          row-key="userId"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'nickName'">
              <span class="trn__user">{{ record.nickName }}</span>
            </template>
            <template v-else-if="column.key === 'userName'">
              <span class="mono trn__user">{{ record.userName }}</span>
            </template>

            <template v-else-if="column.key === 'containerConfig'">
              <div v-for="config in record.configList || []" :key="config.configId" class="trn__cell">
                <span class="tag" :class="imageSourceClass(config.imageSource)">{{ config.imageSource }}</span>
                <a-popover trigger="hover" placement="rightTop">
                  <template #title>{{ t('容器镜像') }}</template>
                  <template #content>
                    <dl class="trn__pop">
                      <div><dt>{{ t('镜像类型') }}</dt><dd>{{ config.imageSource }}</dd></div>
                      <div><dt>{{ t('配置名称') }}</dt><dd>{{ config.configName }}</dd></div>
                      <div><dt>{{ t('配置信息') }}</dt><dd>{{ t('CPU：{c}核、加速卡：{g}、内存：{m}G', { c: config.cpu, g: config.gpu, m: config.memory }) }}</dd></div>
                      <div><dt>{{ t('容器镜像') }}</dt><dd>{{ config.imageName }}:{{ config.version }}</dd></div>
                      <div><dt>{{ t('映射端口') }}</dt><dd>{{ config.ports }}</dd></div>
                    </dl>
                  </template>
                  <span class="trn__hint">
                    {{ t('CPU：{c}核、内存：{m}G', { c: config.cpu, m: config.memory }) }}
                  </span>
                </a-popover>
              </div>
            </template>

            <template v-else-if="column.key === 'status'">
              <div v-for="config in record.configList || []" :key="config.configId" class="trn__cell">
                <span v-if="config.container" class="tag" :class="getStatus(config.container.status).cls">
                  {{ getStatus(config.container.status).title }}
                </span>
                <span v-else class="tag">{{ t('未创建') }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'detail'">
              <div v-for="config in record.configList || []" :key="config.configId" class="trn__cell">
                <a-popover v-if="config.container" trigger="hover" placement="leftTop">
                  <template #title>{{ t('容器详情') }}</template>
                  <template #content>
                    <dl class="trn__pop">
                      <div><dt>{{ t('容器类型') }}</dt><dd>{{ config.imageSource }}</dd></div>
                      <div><dt>{{ t('所属用户') }}</dt><dd>{{ record.nickName }}</dd></div>
                      <div><dt>{{ t('容器 ID') }}</dt><dd>{{ config.container.id }}</dd></div>
                      <div><dt>{{ t('容器状态') }}</dt><dd>{{ config.container.status }}</dd></div>
                      <div><dt>{{ t('容器信息') }}</dt><dd>{{ config.container.message }}</dd></div>
                      <div v-if="config.imageSource == 'local'"><dt>{{ t('容器名称') }}</dt><dd>{{ config.container.containerName }}</dd></div>
                      <div v-if="config.imageSource == 'local'"><dt>{{ t('容器镜像') }}</dt><dd>{{ config.container.imageName }}</dd></div>
                      <div v-if="config.container.jupyterUrl">
                        <dt>jupyterUrl</dt>
                        <dd><a :href="config.container.jupyterUrl" target="_blank" rel="noopener">{{ t('打开链接') }}</a></dd>
                      </div>
                      <div><dt>{{ t('创建时间') }}</dt><dd>{{ config.container.createTime }}</dd></div>
                    </dl>
                  </template>
                  <span class="tag ok">{{ t('容器详情') }}</span>
                </a-popover>
                <span v-else class="faint">—</span>
              </div>
            </template>

            <template v-else-if="column.key === 'action'">
              <div v-for="config in record.configList || []" :key="config.configId" class="trn__cell">
                <a-button type="link" size="small" :disabled="!!config.container || currArrange.arrangeState >= 2"
                          @click="handleCreateContainer(record.nickName, config.configId, record.userId)">
                  {{ t('创建') }}
                </a-button>
                <a-button type="link" size="small" :disabled="!config.container" @click="handleSyncContainer(config.container)">
                  {{ t('同步') }}
                </a-button>
                <a-button type="link" size="small" danger :disabled="!config.container"
                          @click="handleRemoveContainer(record.nickName, config.container)">
                  {{ t('移除') }}
                </a-button>
                <a v-if="config.container && config.container.jupyterUrl" :href="config.container.jupyterUrl"
                   target="_blank" rel="noopener" class="trn__link">{{ t('打开链接') }}</a>
              </div>
            </template>
          </template>
        </a-table>
      </div>
    </section>

    <!-- 开启实验 -->
    <a-modal v-model:open="trainingDialogOpen" :title="t('实验开启提示')" :width="680" @ok="submitCreate" :ok-text="t('确认')" :cancel-text="t('取消')">
      <p class="trn__note">{{ t('资源创建需时，建议提前预约实验时间。') }}</p>
      <a-form layout="vertical">
        <a-form-item :label="t('实验时间')">
          <div class="trn__range">
            <a-date-picker
              v-model:value="chooseBeginTime"
              format="YYYY-MM-DD HH:mm"
              show-time
              :disabled-date="disabledDate"
              :placeholder="t('请选择开始时间')"
              @change="changeBeginTime"
            />
            <span class="trn__tilde">~</span>
            <a-date-picker
              v-model:value="chooseEndTime"
              format="YYYY-MM-DD HH:mm"
              show-time
              :disabled="!chooseBeginTime"
              :placeholder="t('请选择结束时间')"
              @change="changeEndTime"
            />
          </div>
        </a-form-item>
        <a-form-item :label="t('实验时长')">
          <div class="trn__range">
            <a-input-number v-model:value="durationDays" :min="0" :step="1" addon-after="天" :disabled="!chooseBeginTime" @change="changeDuration" />
            <a-input-number v-model:value="durationHours" :min="0" :step="1" addon-after="小时" :disabled="!chooseBeginTime" @change="changeDuration" />
            <a-input-number v-model:value="durationMinutes" :min="0" :step="1" addon-after="分" :disabled="!chooseBeginTime" @change="changeDuration" />
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 结束实验 -->
    <a-modal v-model:open="endDialogOpen" :title="t('结束实验提示')" :width="520" @ok="confirmEndTraining" :ok-text="t('确认')" :cancel-text="t('取消')">
      <p class="trn__dlg-t">{{ t('确认结束班级《{c}》的排课实验吗？', { c: currAssign.classesName || '' }) }}</p>
      <p class="trn__dlg-d">{{ t('确认结束实验后，资源将回收并删除，是否继续？') }}</p>
      <p class="trn__dlg-d">
        <span>{{ t('强制删除') }}</span>
        <a-switch v-model:checked="endIsDelete" checked-children="是" un-checked-children="否" />
      </p>
    </a-modal>

    <!-- 资源创建 / 释放 -->
    <a-modal v-model:open="createDialogOpen" :title="t('资源创建提示')" :width="520" @ok="confirmCreate" :ok-text="t('确认')" :cancel-text="t('取消')">
      <p class="trn__dlg-t">{{ createTitle }}</p>
      <p class="trn__dlg-d">{{ t('已创建资源的用户将自动忽略，是否继续？') }}</p>
    </a-modal>

    <a-modal v-model:open="releaseDialogOpen" :title="t('资源释放提示')" :width="520" @ok="confirmRelease" :ok-text="t('确认')" :cancel-text="t('取消')">
      <p class="trn__dlg-t">{{ releaseTitle }}</p>
      <p class="trn__dlg-d">{{ t('确认释放后，资源将回收并删除。') }}</p>
      <p class="trn__dlg-d">
        <span>{{ t('强制删除') }}</span>
        <a-switch v-model:checked="endIsDelete" checked-children="是" un-checked-children="否" />
      </p>
    </a-modal>
  </div>
</template>

<script setup name="CourseTraining">
/*
 * 班级实验资源管理（旧页 P224）。
 * 注意：全库检索旧项目 ui/src，本文件**零引用**——没有路由、没有菜单、也没有任何组件 import 它，
 * 属于「孤儿页」。为满足「功能不丢 + 同名同路径」，这里仍然按旧页功能完整重写，
 * 状态记为 implemented（不接受 done，因为没有真实入口可做 CDP 验收），详见 docs/records/P224.md。
 */
import { computed, onMounted, onUnmounted, reactive, ref, toRefs } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { LeftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { findListStudents } from '@/api/system/clazz/teacherStudent.js'
import { getUser } from '@/api/system/user.js'
import { findListAssignPlus } from '@/api/course/assign.js'
import { isAdmin, getUserId } from '@/utils/user'
import { findConfigImageList } from '@/api/course/config.js'
import {
  createClassesResource, releaseResource, getLastArrange,
  endArrangeByArrangeId, supplementResource, createResourceByArrange
} from '@/api/course/arrange'
import {
  findListContainer, syncContainerById, delContainer, getContainer
} from '@/api/kube/container'
import {
  findListScnet, syncContainer as scnetSyncContainer,
  deleteScnetContainer, delScnetContainer
} from '@/api/kube/scnetContainer'
import { findListNotebook, syncNotebook, releaseNotebook, delNotebook } from '@/api/kube/notebook'
// 旧页 import 了但从未调用的两个接口（D 组口径要求同名 import 仍在，故保留）
import { delPaper } from '@/api/exam/paper'
import { useSplitPane } from '../composables/useSplitPane'

const props = defineProps({
  tabKey: { type: Array, default: () => [] },
  tabName: { type: String, default: '' },
  courseId: { type: String, default: '' }
})

// 分栏逻辑与其它三个面板共用同一份实现
const { rootRef, leftWidth, leftShow, isResizing, width, toggle, startResize, nudge } = useSplitPane({
  initial: 220, min: 160, minRight: 640
})
void delPaper
void getContainer

const loading = ref(false)
const searchVal = ref('')
const studentList = ref([])
const showStudents = ref([])
const total = ref(0)
const selectedRowKeys = ref([])
const assignList = ref([])
const configList = ref([])
const configTypeList = ref([])
const tableHeight = ref(360)

const queryParams = ref({ pageNum: 1, pageSize: 10, deptId: '', nickName: '' })
const currAssign = ref({ assignId: '', classesId: '', classesName: '', teacherId: '', teacherName: '' })

const data = reactive({
  createForm: {
    courseId: undefined, chapterId: undefined, classesId: undefined, userId: '',
    timeoutLimit: '', period: 90, beginTime: '', endTime: '', createType: 1
  },
  currArrange: { arrangeId: '', arrangeState: undefined },
  currTimeLimit: ''
})
const { createForm, currArrange, currTimeLimit } = toRefs(data)

const columns = [
  { title: t('用户名称'), key: 'nickName', width: 130, ellipsis: true },
  { title: t('用户账号'), key: 'userName', width: 120, ellipsis: true },
  { title: t('容器配置'), key: 'containerConfig', width: 250 },
  { title: t('容器状态'), key: 'status', width: 110, align: 'center' },
  { title: t('容器详情'), key: 'detail', width: 110, align: 'center' },
  { title: t('操作'), key: 'action', width: 220 }
]

const canManage = computed(() => !!currArrange.value.arrangeId && currArrange.value.arrangeState != 2)
const arrangeStateText = computed(() => {
  if (!currArrange.value.arrangeId) return t('未开始')
  const s = currArrange.value.arrangeState
  return s == 0 ? t('未开始') : s == 1 ? t('实验中') : t('已结束')
})
const arrangeStateClass = computed(() => {
  const s = currArrange.value.arrangeState
  return s == 1 ? 'ok' : s == 2 ? '' : 'warn'
})

function imageSourceClass(source) {
  return source === 'local' ? 'pri' : source === 'scnet' ? 'warn' : ''
}
function getStatus(status) {
  const raw = String(status ?? '')
  switch (raw) {
    case 'Waiting': case 'Creating': case '0':
    case 'Restarting': case 'Shutting': case 'Releasing':
    case 'Deploying': case '1': case '201':
      return { cls: 'warn', title: raw === 'Deploying' || raw === '201' ? t('部署中') : t('创建中') }
    case 'Running': case '200':
      return { cls: 'ok', title: t('运行中') }
    case 'Completed': case '202':
      return { cls: '', title: t('已终止') }
    case 'Terminated':
      return { cls: 'err', title: t('已关机') }
    case 'Failed': case '2': case '5': case '8':
      return { cls: 'err', title: t('异常') }
    default:
      return { cls: '', title: t('未创建') }
  }
}

/* ---------------- 学生 ---------------- */
function handleSearch() {
  const kw = searchVal.value
  showStudents.value = studentList.value.filter((item) => !kw || String(item.nickName || '').includes(kw))
}
function onSelectChange(keys) {
  selectedRowKeys.value = keys
}

async function handleSelect(item) {
  selectedRowKeys.value = []
  currAssign.value = item
  await getUserList()
}

async function getUserList() {
  if (!currAssign.value.classesId) return
  queryParams.value.deptId = currAssign.value.classesId
  try {
    const [studentRes, teacherRes] = await Promise.all([
      findListStudents(queryParams.value),
      getUser(currAssign.value.teacherId)
    ])
    studentList.value = studentRes?.rows || []
    total.value = studentRes?.total || 0
    if (teacherRes?.data) {
      studentList.value.unshift({
        userId: teacherRes.data.userId,
        nickName: teacherRes.data.nickName,
        userName: teacherRes.data.userName,
        configList: []
      })
    }
    studentList.value.forEach((item) => {
      item.configList = configList.value.map((config) => ({ ...config }))
    })
    showStudents.value = [...studentList.value]
    findCurrArrange()
  } catch (e) {
    message.error(t('学生名单加载失败'))
  }
}

/* ---------------- 排课 ---------------- */
function findCurrArrange() {
  loading.value = true
  getLastArrange({
    courseId: props.courseId,
    classesId: currAssign.value.classesId,
    arrangeUserId: currAssign.value.teacherId,
    arrangeType: 1
  }).then((res) => {
    currArrange.value = res?.data || { arrangeId: '', arrangeState: undefined }
  }).catch(() => {
    currArrange.value = { arrangeId: '', arrangeState: undefined }
  }).finally(() => {
    loading.value = false
    calculateTimeLimit()
    searchContainer(true)
  })
}

function calculateTimeLimit() {
  const { beginTime, actualEndTime } = currArrange.value
  if (!beginTime || !actualEndTime) {
    currTimeLimit.value = ''
    return
  }
  let diff = Math.abs(new Date(actualEndTime).getTime() - new Date(beginTime).getTime())
  const days = Math.floor(diff / 86400000)
  diff %= 86400000
  const hours = Math.floor(diff / 3600000)
  diff %= 3600000
  const minutes = Math.floor(diff / 60000)
  currTimeLimit.value = days > 0
    ? t('{d} 天 {h} 小时 {m} 分钟', { d: days, h: hours, m: minutes })
    : t('{h} 小时 {m} 分钟', { h: hours, m: minutes })
}

function handleRefresh() {
  findCurrArrange()
}

/* ---------------- 资源 ---------------- */
const localContainerList = ref([])
const scnetContainerList = ref([])
const scnetNoteBookList = ref([])
const containerMap = ref(new Map())

const resourceCount = computed(() => localContainerList.value.length + scnetContainerList.value.length + scnetNoteBookList.value.length)
const checkHasCreate = computed(() => {
  let n = 0
  localContainerList.value.forEach((c) => { if (Number(c.containerStatus) === 0) n += 1 })
  scnetContainerList.value.forEach((c) => { if (c.status === 'Deploying' || c.status === 'Waiting') n += 1 })
  scnetNoteBookList.value.forEach((c) => { if (c.status === 'Deploying' || c.status === 'Waiting') n += 1 })
  return n
})

async function searchContainer(isLoading) {
  loading.value = !!isLoading
  containerMap.value = new Map()
  if (currArrange.value?.arrangeId) {
    const params = { arrangeId: currArrange.value.arrangeId }
    try {
      if (configTypeList.value.includes('local')) {
        const res = await findListContainer(params)
        localContainerList.value = res?.rows || []
        localContainerList.value.forEach((local) => {
          containerMap.value.set(`${local.configId}_${local.userId}`, Object.assign({
            id: local.containerId, status: local.containerStatus,
            message: local.containerMessage, imageSource: 'local'
          }, local))
        })
      }
      if (configTypeList.value.includes('scnet')) {
        const res = await findListScnet(params)
        scnetContainerList.value = res?.rows || []
        scnetContainerList.value.forEach((scnet) => {
          containerMap.value.set(`${scnet.configId}_${scnet.userId}`, Object.assign({
            id: scnet.scnetContainerId, status: scnet.status,
            message: scnet.message, imageSource: 'scnet'
          }, scnet))
        })
      }
      if (configTypeList.value.includes('notebook')) {
        const res = await findListNotebook(params)
        scnetNoteBookList.value = res?.rows || []
        scnetNoteBookList.value.forEach((nb) => {
          containerMap.value.set(`${nb.configId}_${nb.userId}`, Object.assign({
            id: nb.scnetNotebookId, status: nb.status,
            message: nb.message, imageSource: 'notebook'
          }, nb))
        })
      }
      handleContainer()
    } catch (e) {
      message.error(t('资源数据加载失败'))
    }
  }
  loading.value = false
}

function handleContainer() {
  studentList.value.forEach((item) => {
    (item.configList || []).forEach((config) => {
      config.container = containerMap.value.get(`${config.configId}_${item.userId}`)
    })
  })
  showStudents.value = [...studentList.value]
}

/* ---------------- 容器操作 ---------------- */
function handleSyncContainer(container) {
  const done = (res) => {
    message.success(t('同步成功'))
    if (res?.data) setTimeout(() => searchContainer(true), 1000)
  }
  const fail = () => message.error(t('同步失败'))
  switch (container.imageSource) {
    case 'local':
      syncContainerById(container.id).then(done).catch(fail)
      break
    case 'scnet':
      scnetSyncContainer(container.taskId).then(done).catch(fail)
      break
    case 'notebook':
      syncNotebook({ scnetNotebookIds: container.scnetNotebookId }).then(done).catch(fail)
      break
    default:
      break
  }
}

function handleRemoveContainer(userName, container) {
  Modal.confirm({
    title: t('删除确认'),
    content: t('是否确认删除用户《{u}》的容器？', { u: userName }),
    okText: t('确 定'),
    cancelText: t('取 消'),
    onOk: () => {
      const after = (res) => {
        message.success(t('操作成功'))
        containerMap.value.delete(`${container.configId}_${container.userId}`)
        handleContainer()
        return res
      }
      switch (container.imageSource) {
        case 'local':
          return delContainer(container.id).then(after)
        case 'scnet':
          return container.taskId
            ? deleteScnetContainer(container.taskId, true).then(after)
            : delScnetContainer(container.id).then(after)
        case 'notebook':
          return container.taskId
            ? releaseNotebook(container.taskId).then(after)
            : delNotebook(container.id).then(after)
        default:
          return Promise.resolve()
      }
    }
  })
}

/* ---------------- 开启 / 结束实验 ---------------- */
const trainingDialogOpen = ref(false)
const endDialogOpen = ref(false)
const endIsDelete = ref(false)
const chooseBeginTime = ref(null)
const chooseEndTime = ref(null)
const durationDays = ref(0)
const durationHours = ref(0)
const durationMinutes = ref(0)

const disabledDate = (current) => current && current < dayjs().startOf('day')

function changeBeginTime() {
  if (chooseBeginTime.value) {
    createForm.value.beginTime = chooseBeginTime.value.format('YYYY-MM-DD HH:mm')
  } else {
    createForm.value.beginTime = ''
    createForm.value.endTime = ''
    chooseEndTime.value = null
  }
  calculateDuration()
}
function changeEndTime() {
  createForm.value.endTime = chooseEndTime.value ? chooseEndTime.value.format('YYYY-MM-DD HH:mm') : ''
  calculateDuration()
}
function calculateDuration() {
  const { beginTime, endTime } = createForm.value
  if (!beginTime || !endTime) {
    durationDays.value = 0; durationHours.value = 0; durationMinutes.value = 0
    return
  }
  const diff = new Date(endTime).getTime() - new Date(beginTime).getTime()
  if (diff <= 0) {
    message.warning(t('结束时间需大于开始时间'))
    chooseEndTime.value = null
    createForm.value.endTime = ''
    return
  }
  let rest = diff
  durationDays.value = Math.floor(rest / 86400000)
  rest %= 86400000
  durationHours.value = Math.floor(rest / 3600000)
  rest %= 3600000
  durationMinutes.value = Math.floor(rest / 60000)
}
function changeDuration() {
  if (!createForm.value.beginTime) return
  const add = durationDays.value * 1440 + durationHours.value * 60 + durationMinutes.value
  // 旧页这里用 moment(beginTime).add(...)，新项目只装了 dayjs，等价改写
  const next = dayjs(createForm.value.beginTime, 'YYYY-MM-DD HH:mm').add(add, 'minute')
  createForm.value.endTime = next.format('YYYY-MM-DD HH:mm')
  chooseEndTime.value = next
}

function minutesToHMS(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const s = Math.floor((minutes % 1) * 60)
  return [h, m, s].map((x) => String(x).padStart(2, '0')).join(':')
}

function startTraining() {
  createForm.value.courseId = props.courseId
  createForm.value.classesId = currAssign.value.classesId
  createForm.value.userId = currAssign.value.teacherId
  createForm.value.createType = 1
  createForm.value.timeoutLimit = minutesToHMS(createForm.value.period)
  chooseBeginTime.value = dayjs()
  createForm.value.endTime = ''
  chooseEndTime.value = null
  changeBeginTime()
  trainingDialogOpen.value = true
}

function submitCreate() {
  const { beginTime, endTime } = createForm.value
  if (!beginTime || !endTime) {
    message.warning(t('请完整输入开始时间与结束时间'))
    return
  }
  if (new Date(endTime).getTime() - new Date(beginTime).getTime() <= 0) {
    message.warning(t('结束时间需大于开始时间'))
    return
  }
  createClassesResource(createForm.value).then((res) => {
    message.success(t('操作成功！'))
    if (res?.data) currArrange.value = res.data
    trainingDialogOpen.value = false
    setTimeout(() => searchContainer(true), 2000)
  }).catch(() => message.error(t('开启失败，请稍后重试')))
}

function toEndTraining() {
  if (checkHasCreate.value > 0) {
    message.warning(t('当前实验正在创建资源，暂不可结束！'))
    return
  }
  endIsDelete.value = false
  endDialogOpen.value = true
}
function confirmEndTraining() {
  endArrangeByArrangeId(currArrange.value.arrangeId, endIsDelete.value).then((res) => {
    message.success(t('操作成功！'))
    if (res?.data) currArrange.value = res.data
    endDialogOpen.value = false
    setTimeout(() => searchContainer(true), 2000)
  }).catch(() => message.error(t('结束失败，请稍后重试')))
}

/* ---------------- 资源创建 / 释放 ---------------- */
const createDialogOpen = ref(false)
const createTitle = ref('')
const createFlag = ref(0)
const createConfigs = ref([])
const createUserIds = ref([])
const releaseDialogOpen = ref(false)
const releaseTitle = ref('')
const releaseFlag = ref(0)
const releaseUserIds = ref([])

function createAll() {
  createFlag.value = 0
  createConfigs.value = []
  createUserIds.value = []
  createTitle.value = t('确认为所有用户创建实验资源吗？')
  createDialogOpen.value = true
}
function batchCreateResource() {
  if (!selectedRowKeys.value.length) {
    message.warning(t('请选择数据'))
    return
  }
  createUserIds.value = [...selectedRowKeys.value]
  createConfigs.value = configList.value.map((item) => item.configId)
  createFlag.value = 1
  createTitle.value = t('确认为所选的 {n} 个用户创建资源吗？', { n: selectedRowKeys.value.length })
  createDialogOpen.value = true
}
function handleCreateContainer(userName, configId, userId) {
  createUserIds.value = [userId]
  createConfigs.value = [configId]
  createFlag.value = 2
  createTitle.value = t('确认为用户《{u}》创建资源？', { u: userName })
  createDialogOpen.value = true
}

function confirmCreate() {
  if (!canManage.value) {
    selectedRowKeys.value = []
    createDialogOpen.value = false
    message.warning(t('实验已结束'))
    return
  }
  const after = (res) => {
    if (res?.data || createFlag.value === 0) {
      message.success(t('操作完成，请稍后刷新状态'))
      selectedRowKeys.value = []
      createUserIds.value = []
      createConfigs.value = []
      createDialogOpen.value = false
      setTimeout(() => searchContainer(true), 1000)
    }
  }
  if (createFlag.value === 0) {
    supplementResource(currArrange.value.arrangeId).then(after).catch(() => message.error(t('创建失败')))
    return
  }
  createResourceByArrange({
    arrangeId: currArrange.value.arrangeId,
    configIds: createConfigs.value,
    userIds: createUserIds.value
  }).then(after).catch(() => message.error(t('创建失败')))
}

function releaseAll() {
  releaseFlag.value = 0
  releaseUserIds.value = []
  releaseTitle.value = t('确认释放所有资源吗？')
  endIsDelete.value = false
  releaseDialogOpen.value = true
}
function batchReleaseResource() {
  if (!selectedRowKeys.value.length) {
    message.warning(t('请选择数据'))
    return
  }
  releaseFlag.value = 1
  releaseUserIds.value = [...selectedRowKeys.value]
  releaseTitle.value = t('确认删除所选的 {n} 个用户的资源吗？', { n: selectedRowKeys.value.length })
  releaseDialogOpen.value = true
}
function confirmRelease() {
  releaseResource({
    arrangeId: currArrange.value.arrangeId,
    userIds: releaseUserIds.value,
    isDelete: endIsDelete.value
  }).then(() => {
    message.success(t('操作成功，系统正在释放资源，请稍后刷新'))
    releaseDialogOpen.value = false
    releaseUserIds.value = []
    selectedRowKeys.value = []
    setTimeout(() => searchContainer(true), 2000)
  }).catch(() => message.error(t('释放失败')))
}

/* ---------------- 初始化 ---------------- */
async function initData() {
  try {
    const [configRes, assignRes] = await Promise.all([
      findConfigImageList({ courseId: props.courseId }),
      findListAssignPlus({ courseId: props.courseId, assignType: 0, teacherId: isAdmin() ? undefined : getUserId() })
    ])
    configList.value = configRes?.rows || []
    configTypeList.value = [...new Set(configList.value.map((item) => item.imageSource))]
    assignList.value = assignRes?.rows || []
    if (assignList.value.length) handleSelect(assignList.value[0])
  } catch (e) {
    message.error(t('课程配置或分配加载失败'))
  }
}

function onResize() {
  tableHeight.value = Math.max(200, (document.documentElement.clientHeight - 260) * 0.8)
}

let trainingTimer = null
onMounted(() => {
  window.addEventListener('resize', onResize)
  onResize()
  initData()
  trainingTimer = setInterval(() => {
    if (props.tabKey.includes(props.tabName) && currArrange.value.arrangeId) {
      getLastArrange({
        courseId: props.courseId,
        classesId: currAssign.value.classesId,
        arrangeUserId: currAssign.value.teacherId,
        arrangeType: 1
      }).then((res) => {
        currArrange.value = res?.data || { arrangeId: '', arrangeState: undefined }
      }).catch(() => { /* 轮询失败静默 */ })
    }
  }, 30000)
})

onUnmounted(() => {
  if (trainingTimer) clearInterval(trainingTimer)
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.trn { position: relative; display: flex; height: 100%; min-height: 0; background: var(--panel); }
.trn.is-resizing .trn__side, .trn.is-resizing .trn__toggle { transition: none !important; }

.trn__side {
  flex: none; display: flex; flex-direction: column; min-width: 0;
  border-right: 1px solid var(--line-3); background: var(--bg-soft);
  transition: width .2s ease;
}
.trn__side-hd {
  padding: 11px 12px; font-size: 12.5px; font-weight: 600; color: var(--ink-3);
  border-bottom: 1px solid var(--line-3);
}
.trn__side-bd { flex: 1; min-height: 0; overflow: auto; padding: 8px; }
.trn__cls {
  display: flex; flex-direction: column; gap: 2px; width: 100%;
  padding: 8px 10px; margin-bottom: 3px;
  border: 0; border-radius: var(--r-sm); background: transparent;
  font: inherit; text-align: left; cursor: pointer;
  transition: background .14s ease;
}
.trn__cls:hover { background: var(--panel); }
.trn__cls.is-active { background: var(--pri-100); }
.trn__cls-name { font-size: 13px; font-weight: 600; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trn__cls.is-active .trn__cls-name { color: var(--pri-ink); }
.trn__cls-teacher { font-size: 11.5px; color: var(--ink-4); }

.trn__divider {
  flex: none; width: 5px; cursor: ew-resize; background: transparent;
  transition: background .14s ease;
}
.trn__divider:hover, .trn__divider:focus-visible { background: var(--pri-200); outline: none; }
.trn__toggle {
  position: absolute; z-index: 5; margin-left: -11px; margin-top: 40px;
  width: 18px; height: 46px; padding: 0;
  display: grid; place-items: center;
  border: 1px solid var(--line-2); border-left: 0; border-radius: 0 var(--r-sm) var(--r-sm) 0;
  background: var(--panel); color: var(--ink-3); font-size: 11px; cursor: pointer;
  box-shadow: var(--sh-1);
}
.trn__toggle:hover { color: var(--pri); border-color: var(--pri-200); }

.trn__main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.trn__hd {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 14px; border-bottom: 1px solid var(--line-3);
}
.trn__hd-l { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; min-width: 0; flex: 1; }
.trn__search { width: 260px; }
.trn__count { font-size: 11.5px; color: var(--ink-4); white-space: nowrap; }
.trn__kv { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.trn__k { color: var(--ink-4); }
.trn__v { color: var(--ink-2); }
.trn__hd-r { display: flex; align-items: center; gap: 8px; flex: none; }

.trn__bar {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 8px 14px; border-bottom: 1px solid var(--line-3); background: var(--bg-soft);
}
.trn__bar-r { margin-left: auto; font-size: 11.5px; color: var(--ink-4); }

.trn__body { flex: 1; min-height: 0; overflow: auto; padding: 0 14px 14px; }
.trn__cell { display: flex; align-items: center; gap: 6px; padding: 2px 0; min-height: 24px; }
.trn__user { font-size: 12.5px; color: var(--ink-2); }
.trn__hint { font-size: 11.5px; color: var(--ink-4); }
.trn__link { font-size: 12px; color: var(--pri); }

.trn__pop { margin: 0; display: grid; gap: 6px; min-width: 320px; }
.trn__pop div { display: flex; gap: 10px; font-size: 12.5px; }
.trn__pop dt { flex: none; width: 5.6em; color: var(--ink-4); }
.trn__pop dd { margin: 0; color: var(--ink-2); word-break: break-all; }

.trn__empty { padding: 26px 12px; text-align: center; }
.trn__empty-t { font-size: 12.5px; font-weight: 600; color: var(--ink-2); }
.trn__empty-d { margin-top: 5px; font-size: 11.5px; color: var(--ink-4); }

.trn__note {
  margin: 0 0 14px; padding: 9px 12px; border-radius: var(--r-sm);
  border: 1px solid var(--pri-200); background: var(--pri-50);
  font-size: 12.5px; color: var(--pri-ink);
}
.trn__range { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.trn__tilde { color: var(--ink-4); }
.trn__dlg-t { margin: 0 0 8px; font-size: 15px; font-weight: 600; color: var(--ink); }
.trn__dlg-d { margin: 0 0 6px; font-size: 12.5px; color: var(--ink-3); display: flex; align-items: center; gap: 8px; }

@media (max-width: 1024px) {
  .trn__side { width: 180px !important; }
  .trn__divider, .trn__toggle { display: none; }
  .trn__search { width: 180px; }
}
</style>
