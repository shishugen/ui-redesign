<template>
  <div class="sch">
    <!-- 工具条：无页头条（§3.4），刷新不单列，搜索/重置即重查 -->
    <div class="sch__bar">
      <a-space :size="6" wrap>
        <a-button type="primary" @click="handleAdd">
          <template #icon><PlusOutlined /></template>{{ t('新增') }}
        </a-button>
        <a-button danger :disabled="!ids.length" @click="handleBatchDelete">
          <template #icon><DeleteOutlined /></template>{{ t('批量删除') }}
        </a-button>
      </a-space>
      <div class="sch__filters">
        <a-select v-model:value="queryParams.scheduleType" :options="typeOptions" allow-clear
                  :placeholder="t('排课类型')" style="width: 116px" @change="handleQuery" />
        <a-select v-model:value="queryParams.courseId" :options="courseOptions" show-search allow-clear
                  :filter-option="filterOption" :placeholder="t('搜索课程')" style="width: 220px" @change="handleQuery">
          <template #option="{ label, classify }">
            <a-tag :color="getCourseClassify(classify).color">{{ getCourseClassify(classify).label }}</a-tag>{{ label }}
          </template>
        </a-select>
        <a-select v-model:value="queryParams.classesId" :options="classesOptions" show-search allow-clear
                  :filter-option="filterOption" :placeholder="t('搜索班级')" style="width: 160px" @change="handleQuery" />
        <a-select v-if="isAdmin()" v-model:value="queryParams.scheduleUserId" :options="userOptions" show-search
                  allow-clear :filter-option="false" :loading="searchLoading" :placeholder="t('搜索排课人')"
                  style="width: 170px" @search="handleUserSearch" @change="handleQuery" />
        <a-select v-model:value="queryParams.searchState" :options="stateOptions" allow-clear
                  :placeholder="t('排课状态')" style="width: 110px" @change="handleQuery" />
        <a-button type="primary" @click="handleQuery">
          <template #icon><SearchOutlined /></template>{{ t('搜索') }}
        </a-button>
        <a-button @click="resetQuery">
          <template #icon><ReloadOutlined /></template>{{ t('重置') }}
        </a-button>
      </div>
    </div>

    <div v-if="loadError" class="sch__state" role="alert">
      <b>{{ t('排课列表加载失败') }}</b><span>{{ loadError }}</span>
      <a-button size="small" @click="getList">{{ t('重试') }}</a-button>
    </div>
    <a-table v-else :loading="loading" :data-source="scheduleList" :columns="columns" row-key="scheduleId"
             :row-selection="{ selectedRowKeys: ids, onChange: onSelectChange }"
             :pagination="false" size="middle" :scroll="{ x: 'max-content' }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'scheduleType'">
          <span :style="{ color: typeOf(record.scheduleType).ink }">{{ t(typeOf(record.scheduleType).text) }}</span>
        </template>
        <template v-else-if="column.key === 'courseName'">
          <button type="button" class="sch__course" :title="t('点击进入课程《{name}》', { name: record.courseName })"
                  @click="handleToCourse(record)">
            <a-tag :color="getCourseClassify(record.classify).color">{{ getCourseClassify(record.classify).label }}</a-tag>
            <span>{{ record.courseName }}</span>
          </button>
        </template>
        <template v-else-if="column.key === 'trainingObject'">
          <div v-if="record.classesId">{{ record.classesName }}</div>
          <div class="sch__sub">{{ record.scheduleUserName }}</div>
        </template>
        <template v-else-if="column.key === 'scheduleMode'">{{ t(modeOf(record.scheduleMode).text) }}</template>
        <template v-else-if="column.key === 'scheduleTime'">
          <div>{{ formatDateAndTime(record.beginTime, record.endTime) }}</div>
          <div class="sch__sub">（{{ formatTimePeriod(record.beginTime, record.endTime) }}）</div>
        </template>
        <template v-else-if="column.key === 'state'">
          <a-tag :color="stateOf(record.state).color">{{ t(stateOf(record.state).text) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space :size="0" wrap>
            <a-button type="link" size="small" @click="handleResource(record)">
              <template #icon><DesktopOutlined /></template>{{ t('资源') }}
            </a-button>
            <a-button type="link" size="small" @click="handleDetail(record)">
              <template #icon><FileSearchOutlined /></template>{{ t('详情') }}
            </a-button>
            <a-button type="link" size="small" :disabled="record.state == 2" @click="handleEdit(record)">
              {{ t('编辑') }}
            </a-button>
            <a-button type="link" size="small" danger :disabled="record.state == 2" @click="handleEnd(record)">
              {{ t('结束') }}
            </a-button>
            <a-button type="link" size="small" danger :disabled="record.state == 1" @click="handleDelete(record)">
              {{ t('删除') }}
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
    <div v-if="!loading && !loadError && !scheduleList.length" class="sch__empty" role="status">
      <b>{{ t('没有匹配的排课计划') }}</b>
      <span>{{ t('调整筛选条件后重新搜索，或点「新增」创建一条排课计划。') }}</span>
      <a-button size="small" @click="handleAdd">{{ t('新增') }}</a-button>
    </div>

    <Pagination :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize"
                @pagination="getList" />

    <!-- 新增 / 编辑抽屉 -->
    <a-drawer v-model:open="editOpen" :title="editTitle" :width="drawerWidth" :mask-closable="false" @close="cancel">
      <a-spin :spinning="editLoading" :tip="t('正在加载')">
        <a-form layout="vertical" class="sch__form">
          <a-row :gutter="16">
            <a-col :xs="24" :lg="12">
              <a-form-item :label="t('排课类型')">
                <a-select v-if="!form.scheduleId" v-model:value="form.scheduleType" :options="typeOptions"
                          :placeholder="t('排课类型')" @change="changeSelectScheduleType" />
                <span v-else>{{ t(typeOf(form.scheduleType).text) }}</span>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :lg="12">
              <a-form-item :label="t('实验课程')">
                <a-select v-if="!form.scheduleId" v-model:value="form.courseId" :options="courseOptions"
                          show-search allow-clear :filter-option="filterOption" :disabled="!courseOptions.length"
                          :placeholder="t('请选择实验课程')" @change="changeSelectCourse">
                  <template #option="{ label, classify }">
                    <a-tag :color="getCourseClassify(classify).color">{{ getCourseClassify(classify).label }}</a-tag>{{ label }}
                  </template>
                </a-select>
                <span v-else>{{ form.courseName }}</span>
              </a-form-item>
            </a-col>
            <template v-if="form.scheduleType != 2">
              <a-col :xs="24" :lg="12">
                <a-form-item :label="t('排课班级')">
                  <a-select v-if="!form.scheduleId" v-model:value="form.classesId" :options="formClassesOptions"
                            allow-clear :placeholder="t('请选择排课班级')" @change="changeSelectClasses" />
                  <span v-else>{{ form.classesName }}</span>
                </a-form-item>
              </a-col>
              <a-col :xs="24" :lg="12">
                <a-form-item :label="t('排课人员')">
                  <a-select v-if="!form.scheduleId && isAdmin()" v-model:value="form.scheduleUserId"
                            :options="teacherOptions" allow-clear :placeholder="t('不选默认为当前用户')" />
                  <span v-else>{{ form.scheduleUserName || getNickName() }}</span>
                </a-form-item>
              </a-col>
            </template>
            <a-col :xs="24" :lg="12">
              <a-form-item :label="t('可用额度')">{{ formatDurationHour(availableQuota) }}</a-form-item>
            </a-col>
            <a-col :xs="24" :lg="12">
              <a-form-item :label="t('资源类型')">
                <b v-if="form.resourceType">{{ t(sourceOf(form.resourceType).text) }}</b>
                <span v-else class="sch__muted">{{ t('暂未配置') }}</span>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :lg="12">
              <a-form-item :label="t('安排模式')">
                <a-radio-group v-model:value="form.scheduleMode" :disabled="!!form.scheduleId">
                  <a-radio :value="0">{{ t('单时段模式') }}</a-radio>
                  <a-radio :value="1">{{ t('多时段模式') }}</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
          </a-row>

          <template v-if="form.scheduleMode == 1">
            <div class="sch__row">
              <a-form-item :label="t('实验天数')">
                <a-input-number v-model:value="dayCount" :min="1" :step="1" :disabled="!!form.scheduleId"
                                style="width: 120px" @change="changeScheduleDays" />
              </a-form-item>
              <a-button @click="addDay"><template #icon><PlusOutlined /></template>{{ t('添加天数') }}</a-button>
              <span class="sch__hint">{{ t('有效时长：{v}', { v: formatDurationHour(form.totalSeconds || 0) }) }}</span>
            </div>
            <a-form-item :label="t('实验时间')">
              <DateTimeRangePicker :schedule-dates="form.groupByDateScheduleItems" :minute-step="5"
                                   :state-map="stateMap" @date-change="onDayDateChange"
                                   @range-change="onRangeChange" @add-range="onAddRange"
                                   @remove-range="onRemoveRange" @end-range="handleEndItem"
                                   @copy-day="copyDay" @remove-day="removeDay" />
            </a-form-item>
          </template>
          <template v-else>
            <a-form-item :label="t('实验时间')">
              <div class="sch__single">
                <a-date-picker v-model:value="chooseBeginTime" format="YYYY-MM-DD HH:mm"
                               :disabled-date="disabledDate" :disabled="form.state > 0"
                               :show-time="{ defaultValue: dayjs('00:00', 'HH:mm') }"
                               :placeholder="t('请选择开始时间')" @change="changeBeginTime" />
                <span>~</span>
                <a-date-picker v-model:value="chooseEndTime" format="YYYY-MM-DD HH:mm"
                               :disabled-date="disabledDate" :disabled="!chooseBeginTime"
                               :show-time="{ defaultValue: dayjs('00:00', 'HH:mm') }"
                               :placeholder="t('请选择结束时间')" @change="changeEndTime" />
              </div>
              <div class="sch__dur">
                <a-input-number v-model:value="durationDays" :min="0" :disabled="!chooseBeginTime"
                                :addon-after="t('天')" @change="changeDuration" />
                <a-input-number v-model:value="durationHours" :min="0" :disabled="!chooseBeginTime"
                                :addon-after="t('时')" @change="changeDuration" />
                <a-input-number v-model:value="durationMinutes" :min="0" :disabled="!chooseBeginTime"
                                :addon-after="t('分')" @change="changeDuration" />
              </div>
            </a-form-item>
          </template>

          <div v-if="formError" class="sch__err" role="alert">{{ formError }}</div>
        </a-form>
      </a-spin>
      <template #footer>
        <a-space>
          <a-button @click="cancel">{{ t('取消') }}</a-button>
          <a-button type="primary" :loading="saving" @click="submitForm">{{ t('提交') }}</a-button>
        </a-space>
      </template>
    </a-drawer>

    <!-- 保存冲突 -->
    <a-modal v-model:open="saveDialogOpen" :title="t('排课提示')" width="800px" :footer="null">
      <div class="sch__conflict">
        <h3>{{ t('所选排课时段内已存在排课记录，请合理调整时间！') }}</h3>
        <p>{{ t('当前选择时段：《{v}》', { v: formatDateAndTime(existSchedule.beginTime, existSchedule.endTime) }) }}</p>
      </div>
      <a-divider>{{ t('已存在的排课信息') }}</a-divider>
      <a-table :data-source="existScheduleList" :columns="existColumns" :pagination="false" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'scheduleType'">{{ t(typeOf(record.scheduleType).text) }}</template>
          <template v-else-if="column.key === 'scheduleObject'">
            <div v-if="record.classesId">{{ record.classesName }}</div>
            <div class="sch__sub">{{ record.scheduleUserName }}</div>
          </template>
          <template v-else-if="column.key === 'scheduleTime'">
            {{ formatDateAndTime(record.beginTime, record.endTime) }}
            <span class="sch__sub">（{{ formatTimePeriod(record.beginTime, record.endTime) }}）</span>
          </template>
          <template v-else-if="column.key === 'state'">
            <a-tag :color="stateOf(record.state).color">{{ t(stateOf(record.state).text) }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-modal>

    <!-- 详情 -->
    <a-modal v-model:open="detailOpen" :title="t('排课详情')" width="800px" :footer="null">
      <a-spin :spinning="detailLoading">
        <dl class="sch__detail">
          <div><dt>{{ t('排课标题') }}</dt><dd>{{ form.scheduleTitle }}</dd></div>
          <div><dt>{{ t('创建时间') }}</dt><dd>{{ form.createTime || '—' }}</dd></div>
          <div><dt>{{ t('实验课程') }}</dt><dd>{{ form.courseName }}</dd></div>
          <div><dt>{{ t('安排模式') }}</dt><dd>{{ t(modeOf(form.scheduleMode).text) }}</dd></div>
          <div><dt>{{ t('排课人员') }}</dt><dd>{{ form.scheduleUserName }}</dd></div>
          <div v-if="form.classesId"><dt>{{ t('排课班级') }}</dt><dd>{{ form.classesName }}</dd></div>
          <template v-if="form.scheduleMode == 0">
            <div><dt>{{ t('计划时间') }}</dt>
              <dd>{{ formatDateAndTime(form.beginTime, form.endTime) }}
                （{{ formatTimePeriod(form.beginTime, form.endTime) }}）</dd></div>
            <div><dt>{{ t('实际时间') }}</dt>
              <dd>{{ formatDateAndTime(form.beginTime, form.actualEndTime) }}
                （{{ formatTimePeriod(form.beginTime, form.actualEndTime) }}）</dd></div>
            <div><dt>{{ t('实验状态') }}</dt><dd><a-tag :color="stateOf(form.state).color">{{ t(stateOf(form.state).text) }}</a-tag></dd></div>
          </template>
          <template v-else>
            <div><dt>{{ t('计划时间') }}</dt><dd>{{ formatDateAndTime(form.beginTime, form.endTime) }}</dd></div>
            <div><dt>{{ t('计划天数') }}</dt><dd>{{ t('{n} 天', { n: form.groupByDateScheduleItems?.length || 0 }) }}</dd></div>
            <div><dt>{{ t('有效时长') }}</dt><dd>{{ formatDurationHour(form.totalSeconds || 0) }}</dd></div>
          </template>
        </dl>
        <template v-if="form.scheduleMode == 1">
          <div v-for="(day, i) in (form.groupByDateScheduleItems || [])" :key="i" class="sch__day">
            <header><a-tag color="blue">{{ t('第 {n} 天', { n: i + 1 }) }}</a-tag>{{ day.scheduleDate }}</header>
            <div v-for="(r, j) in day.timeRanges" :key="j" class="sch__range">
              <span>{{ r.startHM }} ~ {{ r.endHM }}</span>
              <span class="sch__sub">{{ formatTimePeriod(r.beginTime, r.endTime) }}</span>
              <a-tag :color="stateOf(r.state).color">{{ t(stateOf(r.state).text) }}</a-tag>
            </div>
          </div>
        </template>
      </a-spin>
    </a-modal>

    <!-- 结束 / 删除确认 -->
    <a-modal v-model:open="endOpen" :title="t('结束提示')" :ok-text="t('确认')" :cancel-text="t('取消')" @ok="confirmEnd">
      <p class="sch__confirm-t">{{ handleForm.mainTitle }}</p>
      <p class="sch__sub">{{ handleForm.subTitle }}</p>
      <p>{{ t('确认结束后，资源将回收并删除，是否继续？') }}</p>
      <a-checkbox v-model:checked="handleForm.isDelete">{{ t('强制删除') }}</a-checkbox>
    </a-modal>
    <a-modal v-model:open="deleteOpen" :title="t('删除提示')" :ok-text="t('确认')" :cancel-text="t('取消')" @ok="confirmDelete">
      <p class="sch__confirm-t">{{ handleForm.mainTitle }}</p>
      <p class="sch__sub">{{ handleForm.subTitle }}</p>
      <p>{{ t('确认删除后，数据将不存在，请谨慎操作。是否继续？') }}</p>
    </a-modal>

    <a-drawer v-model:open="resourceOpen" :width="resourceWidth" :title="t('实验资源')" destroy-on-close>
      <ScheduleContainer v-if="resourceOpen && currSchedule.scheduleId" :schedule="currSchedule" />
    </a-drawer>
  </div>
</template>

<script setup name="CourseSchedule">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { t } from '@/i18n'
import dayjs from 'dayjs'
import { PlusOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined,
  DesktopOutlined, FileSearchOutlined } from '@ant-design/icons-vue'
import { formatTimePeriod, formatDateAndTime, formatDurationHour } from '@/utils/aigc.js'
import { isAdmin, getUserId, getNickName } from '@/utils/user.js'
// 以下 F1 方法与旧页 import 集合逐一对齐（verify --strict D 组口径）
import { getClassScheduleResources } from '@/api/kube/classUsage.js'
import { findListConfig } from '@/api/course/config.js'
import { getMyQuota } from '@/api/kube/resourceAllocation'
import { findListCoursePlus } from '@/api/course/course.js'
import { listAllClasses } from '@/api/system/clazz/teacherStudent'
import { listSchedulePlus, delSchedule, saveSchedule, endSchedule, getOccupy } from '@/api/learning/schedule.js'
import { findListScheduleItem, endScheduleItem } from '@/api/learning/scheduleItem.js'
import { findListAssignPlus } from '@/api/course/assign.js'
import { listUser } from '@/api/system/user.js'
import Pagination from '@/components/Pagination/index.vue'
import ScheduleContainer from './container/index.vue'
import DateTimeRangePicker from './components/dateTimeRangePicker.vue'

const FMT = 'YYYY-MM-DD HH:mm'

const stateMap = {
  0: { color: 'processing', text: '未开始', value: 0, ink: 'var(--pri)' },
  1: { color: 'success', text: '进行中', value: 1, ink: 'var(--ok)' },
  2: { color: 'default', text: '已结束', value: 2, ink: 'var(--ink-4)' }
}
const scheduleTypeMap = {
  0: { color: 'green', text: '培训计划', value: 0, ink: 'var(--ok)' },
  1: { color: 'orange', text: '教学排课', value: 1, ink: 'var(--warn)' },
  2: { color: 'default', text: '个人学习', value: 2, ink: 'var(--ink-3)' }
}
const modeMap = {
  0: { color: 'success', text: '单时段模式', value: 0 },
  1: { color: 'processing', text: '多时段模式', value: 1 }
}
const imageSourceMap = {
  local: { text: '本地容器', value: 'local' },
  scnet: { text: '超算容器', value: 'scnet' },
  notebook: { text: '超算notebook', value: 'notebook' }
}
// 旧页 modeMap[x].text / imageSourceMap[x].text 无兜底，未知值直接崩
const stateOf = (k) => stateMap[k] || { color: 'default', text: t('未知'), ink: 'var(--ink-4)' }
const typeOf = (k) => scheduleTypeMap[k] || { color: 'default', text: t('未知'), ink: 'var(--ink-4)' }
const modeOf = (k) => modeMap[k] || { text: t('未知') }
const sourceOf = (k) => imageSourceMap[k] || { text: k || t('暂未配置') }

const stateOptions = computed(() => Object.values(stateMap).map(x => ({ label: t(x.text), value: x.value })))
const typeOptions = computed(() => Object.values(scheduleTypeMap).map(x => ({ label: t(x.text), value: x.value })))
const columns = computed(() => [
  { title: t('排课类型'), dataIndex: 'scheduleType', key: 'scheduleType', width: 90 },
  { title: t('实验课程'), dataIndex: 'courseName', key: 'courseName', width: 220, ellipsis: true },
  { title: t('实验对象'), key: 'trainingObject', width: 140 },
  { title: t('安排模式'), key: 'scheduleMode', width: 110, align: 'center' },
  { title: t('实验时间'), key: 'scheduleTime', width: 200 },
  { title: t('状态'), key: 'state', width: 90, align: 'center' },
  { title: t('操作'), key: 'action', width: 300 }
])
const existColumns = computed(() => [
  { title: t('排课类型'), key: 'scheduleType', width: 100 },
  { title: t('排课对象'), key: 'scheduleObject', width: 140 },
  { title: t('实验时间'), key: 'scheduleTime', width: 220 },
  { title: t('状态'), key: 'state', width: 90, align: 'center' }
])

const loading = ref(false)
const loadError = ref('')
const editLoading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const searchLoading = ref(false)
const formError = ref('')
const scheduleList = ref([])
const courseList = ref([])
const classesList = ref([])
const userOptions = ref([])
const ids = ref([])
const currSelectRows = ref([])
const total = ref(0)
const drawerWidth = ref(Math.round((typeof window === 'undefined' ? 1440 : window.innerWidth) * 0.7))
const resourceWidth = ref(Math.round((typeof window === 'undefined' ? 1440 : window.innerWidth) * 0.9))
const editOpen = ref(false)
const editTitle = ref('')
const saveDialogOpen = ref(false)
const detailOpen = ref(false)
const endOpen = ref(false)
const deleteOpen = ref(false)
const resourceOpen = ref(false)
const existSchedule = ref({})
const existScheduleList = ref([])
const currSchedule = ref({})
const handleForm = reactive({ isDelete: false, scheduleId: '', mainTitle: '', subTitle: '' })

const emptyForm = () => ({
  scheduleId: '', scheduleTitle: '', scheduleType: 0, courseId: undefined,
  classesId: undefined, scheduleUserId: undefined, scheduleDays: 1, scheduleMode: 0,
  state: 0, beginTime: '', endTime: '', scheduleItems: [],
  groupByDateScheduleItems: [], singleScheduleItems: [],
  resourceType: undefined, totalSeconds: 0
})
const form = ref(emptyForm())
const queryParams = ref({
  pageNum: 1, pageSize: 10, orderByColumn: 'create_time', isAsc: 'desc',
  scheduleUserId: undefined, scheduleType: undefined, courseId: undefined,
  classesId: undefined, searchState: undefined
})

const courseOptions = computed(() => [...courseList.value]
  .sort((a, b) => (b.sort || 0) - (a.sort || 0))
  .map(x => ({ label: x.courseName, value: x.courseId, classify: x.classify })))
const classesOptions = computed(() => classesList.value.map(x =>
  ({ label: x.deptName, value: String(x.deptId) })))
const formClassesOptions = ref([])
const teacherOptions = ref([])
const filterOption = (input, option) => String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
const getCourseClassify = (c) => {
  const n = parseInt(c, 10)
  if (n === 0) return { label: t('实践'), color: 'warning' }
  if (n === 1) return { label: t('案例'), color: 'processing' }
  return { label: '', color: 'default' }
}

const occupyQuota = ref(0)
const quotaPackages = ref([])
const availableQuota = computed(() => {
  if (!form.value.courseId || !form.value.resourceType || !quotaPackages.value.length) return 0
  const sum = quotaPackages.value
    .filter(p => p.resourceType === form.value.resourceType)
    .reduce((s, p) => s + (Number(p.remainMinutes) || 0) * 60, 0)
  return Math.max(0, sum - (Number(occupyQuota.value) || 0))
})

const chooseBeginTime = ref(null)
const chooseEndTime = ref(null)
const durationDays = ref(0)
const durationHours = ref(0)
const durationMinutes = ref(0)
const dayCount = ref(1)
let userTimer = null
let refreshTimer = null

// ---------- 数据 ----------
async function getList() {
  loading.value = true
  loadError.value = ''
  try {
    if (!isAdmin()) queryParams.value.scheduleUserId = getUserId()
    const res = await listSchedulePlus(queryParams.value)
    scheduleList.value = res.rows || []
    total.value = Number(res.total) || 0
  } catch (e) {
    loadError.value = e?.message || t('排课接口不可用')
    scheduleList.value = []
  } finally { loading.value = false }
}
const handleQuery = () => { queryParams.value.pageNum = 1; getList() }
const resetQuery = () => {
  const keep = { pageNum: 1, pageSize: queryParams.value.pageSize, orderByColumn: 'create_time', isAsc: 'desc' }
  queryParams.value = { ...keep, scheduleUserId: undefined, scheduleType: undefined,
    courseId: undefined, classesId: undefined, searchState: undefined }
  getList()
}
const onSelectChange = (keys, rows) => { ids.value = keys; currSelectRows.value = rows }
const handleUserSearch = (keyword) => {
  clearTimeout(userTimer)
  userTimer = setTimeout(async () => {
    if (!keyword?.trim()) { userOptions.value = []; return }
    searchLoading.value = true
    try {
      const res = await listUser({ nickName: keyword.trim(), userName: keyword.trim() })
      userOptions.value = (res.rows || []).map(u => ({ label: `${u.nickName}（${u.userName}）`, value: u.userId }))
    } catch (e) { userOptions.value = [] }
    finally { searchLoading.value = false }
  }, 300)
}
async function loadBaseOptions() {
  try {
    const [c, cl] = await Promise.all([
      findListCoursePlus({ orderByColumn: 'sort', isAsc: 'asc', state: 2, status: 1 }),
      listAllClasses()
    ])
    courseList.value = c.rows || []
    classesList.value = cl.rows || []
  } catch (e) { /* 空态由下拉自身呈现 */ }
}

// ---------- 额度 ----------
async function initQuota() {
  quotaPackages.value = []
  occupyQuota.value = 0
  try {
    if (form.value.scheduleType == 2) {
      const [q, o] = await Promise.all([
        getMyQuota(),
        getOccupy({ scheduleUserId: getUserId(), resourceType: form.value.resourceType, scheduleType: 2 })
      ])
      ;(q.data || []).forEach(item => {
        quotaPackages.value.push(...(item.packages || []).filter(p => p.usageScope == 'course'))
      })
      occupyQuota.value = Number(o.data) || 0
    } else if (form.value.classesId) {
      const [q, o] = await Promise.all([
        getClassScheduleResources(form.value.classesId),
        getOccupy({ classesId: form.value.classesId, resourceType: form.value.resourceType })
      ])
      quotaPackages.value = q.data?.packages || []
      occupyQuota.value = Number(o.data) || 0
    }
  } catch (e) { quotaPackages.value = [] }
}

// ---------- 表单联动 ----------
const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const getCurrentHM = () => {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}
const createDayItem = (offset = 0) => {
  const days = form.value.groupByDateScheduleItems || []
  const d = days.length ? new Date(days[days.length - 1].scheduleDate) : new Date()
  d.setDate(d.getDate() + (days.length ? 1 : offset))
  return { scheduleDate: formatDate(d), state: 0,
    timeRanges: [{ startHM: getCurrentHM(), endHM: undefined, state: 0 }] }
}
const resetClassesAndTeacher = () => {
  formClassesOptions.value = []
  teacherOptions.value = []
  form.value.classesId = undefined
  form.value.scheduleUserId = undefined
}
const resetForm = () => {
  form.value = emptyForm()
  resetClassesAndTeacher()
  occupyQuota.value = 0
  quotaPackages.value = []
  formError.value = ''
  durationDays.value = 0; durationHours.value = 0; durationMinutes.value = 0
  chooseBeginTime.value = null; chooseEndTime.value = null
  dayCount.value = 1
}
const cancel = () => { editOpen.value = false; resetForm() }

const changeSelectScheduleType = () => {
  if (form.value.scheduleType == 2) {
    form.value.classesId = undefined
    initQuota()
  } else if (form.value.courseId) changeSelectCourse()
  else initQuota()
}
async function changeSelectCourse() {
  try {
    const res = await findListConfig({ courseId: form.value.courseId })
    form.value.resourceType = res.rows?.[0]?.imageSource
  } catch (e) { form.value.resourceType = undefined }
  if (form.value.scheduleType == 2) { await initQuota(); return }
  resetClassesAndTeacher()
  try {
    const res = await findListAssignPlus({
      assignType: 0, courseId: form.value.courseId,
      teacherId: isAdmin() ? undefined : getUserId()
    })
    const rows = res.rows || []
    const map = new Map()
    rows.forEach(x => { if (!map.has(x.classesId)) map.set(x.classesId, { classesId: x.classesId, classesName: x.classesName }) })
    formClassesOptions.value = [...map.values()].map(x => ({ label: x.classesName, value: x.classesId }))
    teacherOptions.value = [...new Map(rows.map(x => [x.teacherId, { label: x.teacherName, value: x.teacherId }])).values()]
    if (formClassesOptions.value.length && form.value.classesId == null) form.value.classesId = formClassesOptions.value[0].value
  } catch (e) { formClassesOptions.value = [] }
  await initQuota()
}
const changeSelectClasses = () => { initQuota() }

async function getScheduleItemsById(scheduleId) {
  const res = await findListScheduleItem({ scheduleId, orderByColumn: 'end_time', isAsc: 'asc' })
  const rows = res.rows || []
  form.value.scheduleItems = rows
  if (rows.length) {
    form.value.groupByDateScheduleItems = groupByDate(rows)
    form.value.singleScheduleItems = [rows[0]]
    chooseBeginTime.value = dayjs(rows[0].beginTime)
    chooseEndTime.value = dayjs(rows[0].endTime)
    calculateDuration()
  }
  dayCount.value = form.value.groupByDateScheduleItems.length || 1
  handleDuration()
  return res
}
const groupByDate = (arr) => {
  const map = new Map()
  arr.forEach(item => {
    const date = String(item.beginTime || '').substring(0, 10)
    const range = {
      itemId: item.itemId, timeKey: item.timeKey, scheduleId: item.scheduleId,
      state: item.state, beginTime: item.beginTime, endTime: item.endTime,
      actualEndTime: item.actualEndTime,
      startHM: String(item.beginTime || '').substring(11),
      endHM: String(item.endTime || '').substring(11)
    }
    if (map.has(date)) {
      map.get(date).timeRanges.push(range)
      if (item.state > 0) map.get(date).state = item.state
    } else map.set(date, { scheduleDate: date, timeRanges: [range], state: item.state })
  })
  return [...map.values()]
}

// ---------- 时长 ----------
const getDiffSeconds = (start, end) => {
  const [sh, sm] = String(start).split(':').map(Number)
  const [eh, em] = String(end).split(':').map(Number)
  return (eh * 3600 + em * 60) - (sh * 3600 + sm * 60)
}
const handleDuration = () => {
  const f = form.value
  f.totalSeconds = 0
  if (f.scheduleMode == 0) {
    const s = f.singleScheduleItems?.[0]
    if (s?.beginTime && s?.endTime) f.totalSeconds = Math.max(0, Math.floor((new Date(s.endTime) - new Date(s.beginTime)) / 1000))
  } else {
    (f.groupByDateScheduleItems || []).forEach(day => (day.timeRanges || []).forEach(r => {
      if (r.startHM && r.endHM) f.totalSeconds += getDiffSeconds(r.startHM, r.endHM)
    }))
  }
}
const calculateDuration = () => {
  const s = form.value.singleScheduleItems?.[0]
  if (!s) return
  if (s.beginTime && s.endTime) {
    const diff = new Date(s.endTime) - new Date(s.beginTime)
    if (Number.isFinite(diff) && diff > 0) {
      durationDays.value = Math.floor(diff / 86400000)
      durationHours.value = Math.floor((diff % 86400000) / 3600000)
      durationMinutes.value = Math.floor((diff % 3600000) / 60000)
    }
  }
  handleDuration()
}
const changeBeginTime = () => {
  const s = form.value.singleScheduleItems[0]
  s.beginTime = chooseBeginTime.value ? chooseBeginTime.value.format(FMT) : ''
  if (!chooseBeginTime.value) { s.endTime = ''; chooseEndTime.value = null }
  calculateDuration()
}
const changeEndTime = () => {
  const s = form.value.singleScheduleItems[0]
  if (chooseEndTime.value && s.beginTime) {
    const end = chooseEndTime.value.format(FMT)
    // 旧页只在 calculateDuration 里告警并清空，这里提交前也会再校验一次
    if (new Date(end) <= new Date(s.beginTime)) {
      message.warning(t('结束时间需大于开始时间'))
      chooseEndTime.value = null
      s.endTime = ''
    } else s.endTime = end
  } else s.endTime = ''
  calculateDuration()
}
const changeDuration = () => {
  const s = form.value.singleScheduleItems[0]
  if (!s?.beginTime) return
  const mins = (Number(durationDays.value) || 0) * 1440 + (Number(durationHours.value) || 0) * 60 + (Number(durationMinutes.value) || 0)
  // 旧页用 moment().add(minutes)，本批不引入 moment，改 dayjs（新项目已通过 antd 依赖存在）
  const end = dayjs(s.beginTime).add(mins, 'minute').format(FMT)
  s.endTime = end
  chooseEndTime.value = dayjs(end)
  handleDuration()
}
const disabledDate = (current) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return current && current.valueOf() < today.getTime()
}
const changeScheduleDays = (val) => {
  const n = Number(val) || 1
  const items = form.value.groupByDateScheduleItems || []
  while (items.length < n) items.push(createDayItem())
  if (items.length > n) items.splice(n)
  form.value.groupByDateScheduleItems = items
  dayCount.value = items.length
  handleDuration()
}
const addDay = () => { changeScheduleDays((form.value.groupByDateScheduleItems?.length || 0) + 1) }
const copyDay = (day) => {
  const items = form.value.groupByDateScheduleItems || []
  const d = items.length ? new Date(items[items.length - 1].scheduleDate) : new Date()
  d.setDate(d.getDate() + 1)
  items.push({
    scheduleDate: formatDate(d), state: 0,
    timeRanges: (day.timeRanges || []).map(r => ({ startHM: r.startHM, endHM: r.endHM, state: 0 }))
  })
  dayCount.value = items.length
  handleDuration()
}
const removeDay = (i) => {
  const items = form.value.groupByDateScheduleItems || []
  if (items.length <= 1) return
  items.splice(i, 1)
  dayCount.value = items.length
  handleDuration()
}
// 时段选择器标准 emits 的落点：父组件改自己的数组，子组件不再 mutate props
const onDayDateChange = (i, v) => { form.value.groupByDateScheduleItems[i].scheduleDate = v; handleDuration() }
const onRangeChange = (i, j, field, v) => {
  form.value.groupByDateScheduleItems[i].timeRanges[j][field] = v
  handleDuration()
}
const onAddRange = (i) => {
  form.value.groupByDateScheduleItems[i].timeRanges.push({ startHM: undefined, endHM: undefined, state: 0 })
  handleDuration()
}
const onRemoveRange = (i, j) => {
  const ranges = form.value.groupByDateScheduleItems[i].timeRanges
  if (ranges.length <= 1) return
  ranges.splice(j, 1)
  handleDuration()
}

// ---------- 校验与提交 ----------
const timeToMinutes = (v) => {
  if (!v) return 0
  const [h, m] = String(v).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function validateScheduleItems() {
  const f = form.value
  const fail = (text) => { formError.value = text; message.warning(text); return false }
  formError.value = ''
  if ([null, undefined, ''].includes(f.scheduleType)) return fail(t('请选择排课类型'))
  if (!f.courseId) return fail(t('请选择课程'))
  if (!f.classesId && f.scheduleType != 2) return fail(t('请选择班级'))
  if (!f.resourceType) return fail(t('所选课程暂未配置镜像'))
  if (availableQuota.value < (f.totalSeconds || 0) || availableQuota.value <= 0) return fail(t('可用实验时长额度不足！'))

  if (f.scheduleMode == 1) {
    const days = f.groupByDateScheduleItems || []
    if (!days.length) return fail(t('请选择时间'))
    const dateSet = new Set()
    for (let i = 0; i < days.length; i++) {
      const day = days[i]
      if (!day.scheduleDate) return fail(t('第 {n} 天请选择实验日期', { n: i + 1 }))
      if (dateSet.has(day.scheduleDate)) return fail(t('第 {n} 天的日期「{v}」与其他天重复，请更换', { n: i + 1, v: day.scheduleDate }))
      dateSet.add(day.scheduleDate)
      const ranges = day.timeRanges || []
      if (!ranges.length) return fail(t('第 {n} 天请添加时间段', { n: i + 1 }))
      const keys = new Set()
      const sorted = []
      for (let j = 0; j < ranges.length; j++) {
        const r = ranges[j]
        if (!r.startHM || !r.endHM) return fail(t('第 {n} 天第 {m} 个时间段请选择完整的起止时间', { n: i + 1, m: j + 1 }))
        const sm = timeToMinutes(r.startHM), em = timeToMinutes(r.endHM)
        if (sm >= em) return fail(t('第 {n} 天第 {m} 个时间段结束时间需晚于开始时间', { n: i + 1, m: j + 1 }))
        const key = `${r.startHM}-${r.endHM}`
        if (keys.has(key)) return fail(t('第 {n} 天存在重复的时间段「{a} ~ {b}」，请调整',
          { n: i + 1, a: r.startHM, b: r.endHM }))
        keys.add(key)
        sorted.push({ sm, em })
      }
      // 旧页只比前一个 endMin、且间隔检测用未排序数组；这里统一用排序后的历史最大结束时间
      sorted.sort((a, b) => a.sm - b.sm)
      let maxEnd = -1
      for (let k = 0; k < sorted.length; k++) {
        if (k > 0 && sorted[k].sm < maxEnd) return fail(t('第 {n} 天的时间段存在重叠，请调整', { n: i + 1 }))
        if (k > 0 && sorted[k].sm - maxEnd < 10) return fail(t('第 {n} 天的时间段间隔少于 10 分钟，请合理调整', { n: i + 1 }))
        maxEnd = Math.max(maxEnd, sorted[k].em)
      }
    }
  } else {
    const s = f.singleScheduleItems?.[0]
    if (!s) return fail(t('请选择时间'))
    if (s.beginTime && s.endTime) {
      // 旧页把 "YYYY-MM-DD HH:mm" 喂给只认 HH:mm 的 timeToMinutes → NaN，比较恒 false
      if (new Date(s.endTime) <= new Date(s.beginTime)) return fail(t('时间段结束时间需晚于开始时间'))
    } else return fail(t('请选择完整的起止时间'))
  }
  return true
}
const getTotalRange = (list) => {
  if (!list?.length) return { totalBeginTime: '', totalEndTime: '' }
  const begins = list.map(x => new Date(x.beginTime).getTime())
  const ends = list.map(x => new Date(x.endTime).getTime())
  return {
    totalBeginTime: dayjs(new Date(Math.min(...begins))).format(FMT),
    totalEndTime: dayjs(new Date(Math.max(...ends))).format(FMT)
  }
}
async function submitForm() {
  if (!validateScheduleItems()) return
  const f = form.value
  const items = []
  if (f.scheduleMode == 1) {
    (f.groupByDateScheduleItems || []).forEach(day => (day.timeRanges || [])
      .filter(r => r.startHM && r.endHM)
      .forEach(r => items.push({
        itemId: r.itemId || undefined, scheduleId: f.scheduleId,
        beginTime: `${day.scheduleDate} ${r.startHM}`, endTime: `${day.scheduleDate} ${r.endHM}`,
        actualEndTime: r.actualEndTime
      })))
  } else {
    (f.singleScheduleItems || []).forEach(s => items.push({
      itemId: s.itemId || undefined, scheduleId: f.scheduleId,
      beginTime: s.beginTime, endTime: s.endTime, actualEndTime: s.actualEndTime
    }))
  }
  const range = getTotalRange(items)
  const payload = {
    scheduleId: f.scheduleId, scheduleTitle: f.scheduleTitle, scheduleType: f.scheduleType,
    courseId: f.courseId, classesId: f.classesId || undefined,
    scheduleUserId: f.scheduleUserId || getUserId(), classify: f.classify,
    scheduleMode: f.scheduleMode, resourceType: f.resourceType,
    scheduleDays: (f.groupByDateScheduleItems || []).length,
    beginTime: range.totalBeginTime, endTime: range.totalEndTime, scheduleItems: items
  }
  saving.value = true
  try {
    const res = await saveSchedule(payload)
    if (res.data?.state == 0) {
      message.success(t('保存成功'))
      cancel()
      handleQuery()
    } else {
      existSchedule.value = res.data?.data || {}
      existScheduleList.value = res.data?.existList || []
      saveDialogOpen.value = true
    }
  } catch (e) { message.error(e?.message || t('保存失败，请重试')) }
  finally { saving.value = false }
}

// ---------- 行操作 ----------
const handleAdd = () => {
  resetForm()
  editTitle.value = t('新增排课计划')
  form.value.groupByDateScheduleItems = [createDayItem(0)]
  form.value.singleScheduleItems = [{ state: 0, beginTime: '', endTime: '' }]
  chooseBeginTime.value = dayjs()
  changeBeginTime()
  editOpen.value = true
}
async function handleEdit(row) {
  resetForm()
  form.value = JSON.parse(JSON.stringify(row))
  editTitle.value = t('修改排课计划')
  editOpen.value = true
  editLoading.value = true
  try { await getScheduleItemsById(row.scheduleId) }
  catch (e) { message.error(t('加载排课明细失败')) }
  finally {
    editLoading.value = false
    await changeSelectCourse()
  }
}
const handleBatchDelete = () => {
  if (currSelectRows.value.some(x => x.state == 1)) { message.warning(t('所选数据存在未结束的排课，暂不可批量删除！')); return }
  Modal.confirm({
    title: t('确认删除？'),
    content: t('是否确认删除所选的 {n} 个数据项？', { n: ids.value.length }),
    okText: t('确认'), cancelText: t('取消'),
    onOk: async () => {
      await delSchedule(ids.value)
      message.success(t('删除成功'))
      ids.value = []
      getList()
    }
  })
}
const fillHandleForm = (row) => {
  handleForm.scheduleId = row.scheduleId
  handleForm.mainTitle = t('确认删除《{name}》吗？', { name: row.scheduleTitle })
  handleForm.subTitle = row.scheduleType == 2
    ? t('课程：《{c}》、排课人员：《{u}》', { c: row.courseName, u: row.scheduleUserName })
    : t('课程：《{c}》、班级：《{cl}》、教师：《{u}》',
      { c: row.courseName, cl: row.classesName, u: row.scheduleUserName })
}
const handleDelete = (row) => { fillHandleForm(row); deleteOpen.value = true }
const confirmDelete = async () => {
  try {
    await delSchedule(handleForm.scheduleId)
    message.success(t('删除成功'))
    deleteOpen.value = false
    getList()
  } catch (e) { message.error(e?.message || t('删除失败，请重试')) }
}
const handleEnd = (row) => {
  fillHandleForm(row)
  handleForm.mainTitle = t('确认结束《{name}》吗？', { name: row.scheduleTitle })
  handleForm.isDelete = false
  endOpen.value = true
}
const confirmEnd = async () => {
  try {
    await endSchedule({ scheduleId: handleForm.scheduleId, isDelete: handleForm.isDelete })
    message.success(t('操作成功'))
    endOpen.value = false
    getList()
  } catch (e) { message.error(e?.message || t('操作失败，请重试')) }
}
const handleEndItem = (range) => {
  Modal.confirm({
    title: t('确认结束时段？'),
    content: t('确认结束时段《{a} ~ {b}》的排课吗？', { a: range.startHM, b: range.endHM }),
    okText: t('确认'), cancelText: t('取消'),
    onOk: async () => {
      const res = await endScheduleItem(range.itemId)
      range.state = 2
      range.endHM = String(res.data?.actualEndTime || '').substring(11)
      message.success(t('操作成功'))
      getList()
    }
  })
}
const handleDetail = async (row) => {
  form.value = JSON.parse(JSON.stringify(row))
  detailOpen.value = true
  detailLoading.value = true
  try { await getScheduleItemsById(row.scheduleId) }
  catch (e) { message.error(t('加载排课明细失败')) }
  finally { detailLoading.value = false }
}
const handleResource = (row) => { currSchedule.value = { ...row }; resourceOpen.value = true }
// 课程名点击 → 在线学习页（B03 第十六批已迁，独立整页路由，新窗口打开与旧页一致）
const handleToCourse = (row) => {
  if (!row.courseId) { message.warning(t('该排课没有关联课程')); return }
  const hash = `#/online/learning?courseId=${encodeURIComponent(row.courseId)}`
  window.open(`${window.location.pathname}${hash}`, '_blank')
}

const handleResize = () => {
  drawerWidth.value = Math.round(window.innerWidth * 0.7)
  resourceWidth.value = Math.round(window.innerWidth * 0.9)
}
onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  loadBaseOptions()
  getList()
  refreshTimer = setInterval(() => getList(), 30000)
})
// 旧页 onUnmounted 只清了 userTimer，30s 定时与 resize 监听都泄漏；
// 且 onMounted 里 clearInterval(trainingTimer) 引用未声明变量，会抛 ReferenceError
onUnmounted(() => {
  clearInterval(refreshTimer)
  clearTimeout(userTimer)
  window.removeEventListener('resize', handleResize)
})
defineExpose({ getList })
</script>

<style scoped>
.sch { display: flex; flex-direction: column; gap: 0; }
.sch__bar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 12px 14px; background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-lg) var(--r-lg) 0 0; }
.sch__filters { display: flex; gap: 6px; flex-wrap: wrap; }
.sch__state, .sch__empty { display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 36px 16px; border: 1px dashed var(--line-2); color: var(--ink-3); font-size: 12.5px; }
.sch__state { color: var(--danger); border-color: var(--danger-line); }
.sch__empty b, .sch__state b { color: var(--ink-2); }
.sch__course { display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent;
  cursor: pointer; padding: 0; color: var(--ink-2); text-align: left; }
.sch__course:hover { color: var(--pri); }
.sch__course:focus-visible { outline: 2px solid var(--pri); outline-offset: 2px; }
.sch__sub { font-size: 11.5px; color: var(--ink-4); }
.sch__muted { color: var(--ink-4); }
.sch__form :deep(.ant-form-item) { margin-bottom: 12px; }
.sch__row { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.sch__row :deep(.ant-form-item) { margin-bottom: 0; }
.sch__hint { font-size: 12px; color: var(--ink-3); }
.sch__single { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sch__single :deep(.ant-picker) { flex: 1; min-width: 180px; }
.sch__dur { display: flex; gap: 6px; margin-top: 8px; }
.sch__dur :deep(.ant-input-number) { flex: 1; min-width: 100px; }
.sch__err { padding: 8px 10px; border: 1px solid var(--danger-line); background: var(--danger-soft);
  border-radius: var(--r-xs); color: var(--danger); font-size: 12.5px; }
.sch__conflict { text-align: center; }
.sch__conflict h3 { color: var(--danger); font-size: 15px; }
.sch__conflict p { color: var(--pri); font-size: 12.5px; }
.sch__detail { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 0 0 12px; }
.sch__detail > div { display: flex; gap: 8px; font-size: 12.5px; }
.sch__detail dt { flex: 0 0 76px; color: var(--ink-4); }
.sch__detail dd { margin: 0; color: var(--ink-2); }
.sch__day { padding: 10px; margin-bottom: 8px; border: 1px solid var(--line); border-radius: var(--r); }
.sch__day header { display: flex; gap: 8px; font-weight: 600; color: var(--ink-2); margin-bottom: 6px; }
.sch__range { display: flex; gap: 14px; align-items: center; font-size: 12px; padding: 3px 0; }
.sch__confirm-t { font-size: 14px; font-weight: 600; color: var(--danger); }
</style>
