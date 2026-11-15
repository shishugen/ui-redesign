<template>
  <div class="class-usage">
    <!-- 条件查询提到页面最前面：班级与窗口是整页的主语（额度、按课明细、表格、趋势都跟着它们走），
         藏在「班级用量」卡里会让上面两块没头没尾。表格的筛人条件也在这条上，
         走 quotaUserTable 的 externalFilter 模式，两处只有一条生效路径 -->
    <div class="usage-filter-bar">
      <a-space wrap>
        <a-select
          v-model:value="classId"
          :options="classOptions"
          :placeholder="t('选择班级')"
          style="width: 260px"
          :loading="classLoading"
          show-search
          :filter-option="(input, option) => String(option.label).includes(input)"
          @change="handleClassChange" />
        <!-- 统计窗口：与角色用量页同一个组件、同一份后端档位清单。
             两个维度只能差在「人怎么筛出来」，不能差在「有没有这个维度」 -->
        <UsageWindowSelect
          v-model:value="windowDays"
          :options="windowOptions"
          :loading="optionsLoading"
          placeholder="统计窗口" />
        <a-input
          v-model:value="filterKeyword"
          :placeholder="t('搜昵称或账号')"
          allow-clear
          style="width: 180px" />
        <a-checkbox v-model:checked="filterOnlyProblem">{{ t('只看缺额度的') }}</a-checkbox>
      </a-space>
    </div>

    <!-- 班级排课额度：这一套账不在任何学生头上，而在「这个班」头上。
         该班一枚这种包都没有时整块不显示 —— 与下面表格「没配包的池不显示」同一口径，
         摆一排 0 只会让人以为班级额度是 0，而不是「这个班压根没走这套账」 -->
    <a-card
      v-if="quota && quota.packages.length"
      :bordered="false"
      class="section-card">
      <template #title>
        <a-space :size="8">
          <span class="card-title">{{ t('班级排课额度') }}</span>
          <span class="card-sub" v-if="selectedClass">{{ selectedClass.deptName }}</span>
        </a-space>
      </template>
      <template #extra>
        <a-tag color="purple">{{ t(scopeName('class_course')) }}</a-tag>
      </template>

      <!-- 口径原话由后端枚举随数据下发，不在页面重写一份 -->

      <a-table
        :columns="packageColumns"
        :data-source="quota.packages"
        :pagination="false"
        :loading="quotaLoading"
        size="small"
        row-key="allocationId">
        <template #headerCell="{ column }">
          <!-- 在跑数是实时事实，不解释会被拿去和墙钟对账：表头挂一句口径 -->
          <a-tooltip v-if="column.key === 'running'" :title="runningTip">
            <span>{{ column.title }}</span>
          </a-tooltip>
          <template v-else>{{ column.title }}</template>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'pool'">
            <!-- 池名优先用后端随包下发的值：本地推导的映射只覆盖学生行上长出来的池，
                 只发了班级包的池（比如 scnet）会被兜底成原始 code -->
            <a-tag :color="poolColor(record.resourceType)">{{ record.resourceTypeName || poolName(record.resourceType) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'running'">
            <!-- 台数 + 去重人数：一人多开几台时只写台数会让人误以为很多人在上机 -->
            <a-tag v-if="record.runningInstances > 0" color="success">{{ t('{n} 台 / {m} 人', { n: record.runningInstances, m: record.runningUsers }) }}</a-tag>
            <span v-else class="cell-sub">{{ t('空闲') }}</span>
          </template>
          <template v-else-if="column.key === 'used'">
            <span>{{ formatMinutes(record.usedMinutes) }}</span>
            <span class="cell-sub"> / {{ formatMinutes(record.grantMinutes) }}</span>
          </template>
          <template v-else-if="column.key === 'remain'">
            <span :class="record.remainMinutes > 0 ? 'text-ok' : 'text-danger'">{{ formatMinutes(record.remainMinutes) }}</span>
          </template>
          <template v-else-if="column.key === 'period'">
            <a-tag :color="periodColor(record.resetPeriod)">{{ record.resetPeriodName || t(periodName(record.resetPeriod)) }}</a-tag>
            <span class="cell-sub">{{ record.periodKey }}</span>
          </template>
        </template>
      </a-table>

      <!-- 超支不是 0 就要当面说：额度用尽不停课是定稿，但这个数得让老师看见该找管理员补包了。
           它是历史累计而不是本期（超支不属于任何包、也就无所谓哪一期），措辞不能写成「本期」 -->
      <div v-if="quota.exhaustedMinutes > 0" class="exhaust-tip">
        {{ t('历史累计超出额度') }} <span class="text-danger">{{ formatMinutes(quota.exhaustedMinutes) }}</span>{{ t('，') }}
        {{ t('这部分无包可扣但照样计了账；需要补包请联系管理员。') }}
      </div>

      <!-- 按课明细：墙钟与容器运行总时长并排。两个数字口径本来就不同，并排只为让人看见差额 -->
      <div class="course-block" v-if="quota.courses.length">
        <div class="course-title">{{ t('近 {n} 天按课占用', { n: quota.days }) }}</div>
        <!-- 不解释就会被人当成数据错：右边大于左边是口径必然，不是算错了。
             放在表体上方而不是卡头：卡头 nowrap，长句会被裁。 -->
        <div class="course-note">
          {{ t('墙钟是这节课') }}<b>{{ t('占了多久') }}</b>{{ t('（一段连续时间，与几个人上机无关）；容器运行总时长是这节课') }}<b>{{ t('所有机器各自跑过的分钟相加') }}</b>{{ t('（人时）。') }}
          {{ t('所以多一人上机、或一人多开一台，右边就会大于左边；两个数不同源、不可互相校验，并排只为让人看见差额') }}
          {{ t('—— 右边为 0 而左边有数，就是排了课没人上机（按定稿照样扣）。') }}
        </div>
        <a-table
          :columns="courseColumns"
          :data-source="quota.courses"
          :pagination="false"
          size="small"
          :row-key="(r) => `${r.scheduleId}-${r.resourceType}`">
          <template #headerCell="{ column }">
            <!-- 与时长包表「正在使用」列同一做法：口径容易被拿去互验的列，表头挂一句 -->
            <a-tooltip v-if="column.key === 'run'" :title="courseRunTip">
              <span>{{ column.title }}</span>
            </a-tooltip>
            <template v-else>{{ column.title }}</template>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'pool'">
              <!-- 与时长包表同一口径：后端 CourseItem 已随数据翻好池名，推导只做兜底 -->
              <a-tag :color="poolColor(record.resourceType)">{{ record.resourceTypeName || poolName(record.resourceType) }}</a-tag>
            </template>
            <template v-else-if="column.key === 'running'">
              <!-- 一列两态：有机器开着给实时数，没有就给这节课的历史累计 ——
                   已结束的课自然落到历史态，「正在使用」从此不再是一闪而过的信息 -->
              <a-tag v-if="record.runningInstances > 0" color="success">{{ t('{n} 台 / {m} 人', { n: record.runningInstances, m: record.runningUsers }) }}</a-tag>
              <span v-else-if="record.totalInstances > 0" class="cell-sub">{{ t('共用过 {n} 台 · {m} 人', { n: record.totalInstances, m: record.totalUsers }) }}</span>
              <span v-else class="cell-sub">{{ t('空闲') }}</span>
            </template>
            <template v-else-if="column.key === 'state'">
              <a-tag :color="courseState(record).color">{{ courseState(record).label }}</a-tag>
            </template>
            <template v-else-if="column.key === 'window'">
              {{ formatTime(record.beginTime) }} ~ {{ formatTime(record.endTime) }}
              <div v-if="windowLength(record)" class="cell-sub">{{ windowLength(record) }}</div>
            </template>
            <template v-else-if="column.key === 'wall'">
              {{ formatMinutes(record.minutes) }}
              <span v-if="record.exhaustedMinutes > 0" class="cell-sub">
                （{{ t('含超支') }} {{ formatMinutes(record.exhaustedMinutes) }}）
              </span>
            </template>
            <template v-else-if="column.key === 'run'">
              <span :class="record.minutes > 0 && !record.actualRunMinutes ? 'text-warn' : ''">
                {{ formatMinutes(record.actualRunMinutes) }}
              </span>
            </template>
          </template>
        </a-table>
      </div>

      <!-- 并发历史：实时那列「正在使用」是一闪而过的信息，这块是它的历史对面。
           默认收起：大部分时候没人看曲线，不能让它白占一屏 -->
      <div class="course-block">
        <a-collapse v-model:activeKey="histKeys" ghost>
          <a-collapse-panel key="runningHist" :header="t('并发历史')">
            <a-space :size="12" wrap class="hist-tools">
              <!-- 只有窗口这一维可选：这一页的主语永远是「本班排课」。个人用机与全校合计两档
                   挪进了后台「用量统计」页，后端也跟着只放管理员 —— 全校量级不该出现在
                   只看自己班的页面上 -->
              <a-radio-group v-model:value="histWindow" size="small" button-style="solid">
                <a-radio-button v-for="w in HIST_WINDOW_OPTIONS" :key="w.value" :value="w.value">{{ t(w.label) }}</a-radio-button>
              </a-radio-group>
            </a-space>
            <!-- 口径说明独立成块：放进 a-space 后长句换行时容器高度算不住，图例会被压在文字上 -->
            <div class="cell-sub hist-note">{{ t('每 5 分钟看一次，只在台数/人数变了的时候记一个点 —— 每个点的值一直延续到下一个点（阶梯线那段就是）。明细只留一个学期，整学期那一档自动换成日峰值。那条「总并发」虚线是后端按本班跨池合并算出来的，不是三条池线相加') }}</div>
            <!-- extend-to-now：变化点档要把最后一段封到此刻（值还在延续），日峰值档不要 -->
            <RunningHistoryChart :rows="histRows" :pool-names="poolNames" :loading="histLoading" :extra-of="histExtra" :extend-to-now="histWindow !== 'term'" />
          </a-collapse-panel>
        </a-collapse>
      </div>
    </a-card>

    <a-card :bordered="false" class="section-card">
      <template #title>
        <a-space :size="8">
          <span class="card-title">{{ t('班级用量') }}</span>
          <span class="card-sub" v-if="classList.length">{{ scopeLabel }}</span>
        </a-space>
      </template>
      <template #extra>
        <!-- 与学生「我的资源」页同款：定时刷新的说法只在 tooltip 里讲一句，不占卡头宽度 -->
        <a-tooltip :title="autoRefreshHint()">
          <a-button type="text" size="small" :loading="loading" @click="handleRefresh">
            <template #icon><ReloadOutlined /></template>
            {{ t('刷新') }}
          </a-button>
        </a-tooltip>
      </template>

      <a-empty
        v-if="!classList.length && !classLoading"
        :description="isAdmin()
          ? t('库里还没有可用班级（未停用、未删除的班），先去学生管理建班再来看用量')
          : t('你还没有被分配班级，看不到任何用量数据')" />
      <QuotaUserTable
        v-else
        :rows="rows"
        :loading="loading || classLoading"
        :empty-text="emptyText"
        :window-title="windowDays ? windowColumnTitle : ''"
        :window-tip="windowHint"
        show-class-usage
        :ban-suffix="t('（解除禁用请联系管理员）')"
        external-filter
        :keyword="filterKeyword"
        :only-problem="filterOnlyProblem"
        @detail="openDetail" />
    </a-card>

    <!-- 本班窗口内的按池按天趋势。选了窗口才有图：没有窗口就没有「哪几天」可说 -->
    <a-card v-if="windowDays && classId" :bordered="false" class="section-card">
      <template #title>
        <a-space :size="8">
          <span class="card-title">{{ windowLabel || t('窗口内') }}{{ t('消耗趋势') }}</span>
          <span class="card-sub" v-if="selectedClass">{{ selectedClass.deptName }}</span>
        </a-space>
      </template>
      <UsageTrendChart
        :meta="windowMeta"
        :series="dailySeries"
        :pool-names="poolNames"
        :hint="windowHint"
        :loading="dailyLoading" />
    </a-card>

    <!-- 下钻单人：复用管理员那个抽屉，但取数换成带归属校验的教师接口 -->
    <ConsumptionDrawer
      v-model:open="detailOpen"
      :user-id="detailUserId"
      :fetch-detail="getStudentDetail" />
  </div>
</template>

<script setup>
/**
 * 教师端「班级用量」：我任教的班里，每人本期还剩多少额度。
 * <p>
 * 全页只读，接口都是后端按登录人收敛范围：班级列表只有我被分配的班（管理员看全部），
 * classId / userId 越界一律报错而不是返回空数据。这一页有意不放在管理员配额页的 tab 里，
 * 与学生「我的资源」同级，因为两边的口径本来就是同一套数字。
 * <p>
 * 表格本体是配额页那个 quotaUserTable：管理员的角色用量页用的是同一个组件，
 * 两页只差「人怎么筛出来」和「下钻走哪个接口」，不差算法。所以这里只剩班级选择与取数。
 * <p>
 * 池列从数据行的 pools 里推 code，且只有真的分到包（或被禁用）的池才在行里
 * （后端与 allocQuotas 同口径过滤，没配包的池不下发）：
 * 一个只配了超算容器的班，这里就不会长出 Notebook / 本地容器两列。
 * 不调 /resourceTypes 下拉接口：那个接口在 kube:resourceAllocation:list 下，
 * 老师没有这个权限，页面不该为了拿几个池名去 403。
 * <p>
 * 统计窗口与角色用量页共用一套件（useUsageWindow + 下拉 + 趋势图）：
 * 两个维度上的窗口数字出自同一段后端算数，前端也只允许有一份口径算法。
 * 窗口档位清单 (/usageWindows) 不卡权限，与额度池/适用范围/重置周期三张下拉同一做法。
 * <p>
 * 班级排课额度那一大块走本页自己的 /scheduleQuota（带归属校验），口径文案也随它一起下发：
 * 这一页不能去调管理员权限键下的 /usageScopes 才能读懂自己面上的数字。
 */
import { ref, computed, watch, onMounted } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { isAdmin } from '@/utils/user'
import { parseTime } from '@/utils/aigc'
import { listVisibleClasses, listClassStudents, getStudentDetail, getClassUsageDaily, getClassScheduleQuota } from '@/api/kube/classUsage'
import { formatMinutes, periodColor, periodName, poolColor, scopeName } from '@/views/manager/kube/quota/quotaUtils'
import { useAutoRefresh, autoRefreshHint } from '@/views/manager/kube/quota/autoRefresh'
import ConsumptionDrawer from '@/views/manager/kube/quota/consumptionDrawer.vue'
import QuotaUserTable from '@/views/manager/kube/quota/quotaUserTable.vue'
import UsageWindowSelect from '@/views/manager/kube/quota/usageWindowSelect.vue'
import UsageTrendChart from '@/views/manager/kube/quota/usageTrendChart.vue'
import { useRunningHistory, HIST_WINDOW_OPTIONS } from '@/views/manager/kube/quota/runningHistory'
import RunningHistoryChart from '@/views/manager/kube/quota/runningHistoryChart.vue'
import { useUsageWindow } from '@/views/manager/kube/quota/usageWindow'

const classList = ref([])
const classLoading = ref(false)
const rows = ref([])
const loading = ref(false)
const classId = ref(undefined)
const detailOpen = ref(false)
const detailUserId = ref('')

// 提到页面顶部的筛人条件：走 quotaUserTable 的 externalFilter 模式，生效判据只由那一个开关决定
const filterKeyword = ref('')
const filterOnlyProblem = ref(false)

const {
  days: windowDays,
  meta: windowMeta,
  optionsLoading,
  windowOptions,
  windowLabel,
  windowColumnTitle,
  windowHint,
  loadOptions,
  setMeta
} = useUsageWindow()

const dailySeries = ref([])
const dailyLoading = ref(false)
let dailySeq = 0

const quota = ref(null)
const quotaLoading = ref(false)
let quotaSeq = 0

// 并发历史：默认收起、展开才拉。取数与口径换算用的是两页共用的那一份，本页只认「本班排课」一档
const histKeys = ref([])
const {
  rows: histRows,
  loading: histLoading,
  window: histWindow,
  load: loadHistory,
  extraOf: histExtra
} = useRunningHistory()

/** 池 code → 中文名，从行里推（与表格列同一来源），不给图多一个请求 */
const poolNames = computed(() => {
  const map = {}
  for (const row of rows.value) {
    for (const pool of row.pools || []) {
      if (pool.resourceType && !map[pool.resourceType]) {
        map[pool.resourceType] = pool.resourceTypeName || pool.resourceType
      }
    }
  }
  // 跨池总并发那一行：后端 resource_type 存的就是空串，它不是「未填池」而是合并口径
  map[''] = t('总并发')
  return map
})

/** 池名也只从行里推：排课额度表里可能有一个行上没长出来的池（比如只发了班级包、个人包一枚没有） */
function poolName(resourceType) {
  return poolNames.value[resourceType] || resourceType
}

function formatTime(time) {
  return time ? parseTime(time, '{y}-{m}-{d} {h}:{i}') : '-'
}

const classOptions = computed(() =>
  classList.value.map((c) => ({
    value: String(c.deptId),
    label: `${c.deptName}（${t('{n} 人', { n: c.studentCount || 0 })}）`
  }))
)

/**
 * 管理员看的是全校所有班（后端 teacherId 为空那条分支，含暂时还没学员的空班），
 * 副标题不说成“我可见”免得他以为只看到了自己任课的班。
 * 口径与后端一致：userId=1 或持有 admin 角色；前端 isAdmin() 只看角色，
 * 所以超管账号没挂 admin 角色时这里会退化成老师文案，但数据范围始终由后端定。
 */
const scopeLabel = computed(() =>
  isAdmin()
    ? t('全部班级 {n} 个', { n: classList.value.length })
    : t('我任教的班 {n} 个', { n: classList.value.length })
)

/** 当前选中的班，只为了拿它的学员数把空表说清 */
const selectedClass = computed(() =>
  classList.value.find((c) => String(c.deptId) === classId.value)
)

/**
 * 空表文案分三种：没选班 / 这个班本来就没学员（管理员能把空班选进来）/ 有人但被筛选筛空了。
 * 全写成“当前筛选下没有人”会把“这个班还没进人”说成筛错了，老师会去翻筛选器。
 */
const emptyText = computed(() => {
  if (!classId.value) {
    return t('请先选择班级')
  }
  if (!selectedClass.value?.studentCount) {
    return t('这个班还没有学员')
  }
  return t('当前筛选下没有人')
})

/**
 * 班级排课额度块的补充说明。上一行是后端枚举的口径原话（占用与个人包的关系），
 * 这一段只说本页这两张表看着容易读错的三件事：两个数字不是一个东西、
 * 一个包不是每节课一份、用尽不停课。这三句都是「不写就会有人报 bug」的那种。
 */
const quotaRuleTip = computed(() =>
  t('墙钟占用是按排课窗口记的账，容器运行总时长是这批机器真跑过的分钟；两者口径不同，不可相加也不需要相等。')
  + t('这一份额度是全班共用一个盘子，不是每节课一份：同一天几节课会合并在同一格里互扣。')
  + t('额度用完不会停课，只会超出。')
)

const packageColumns = computed(() => [
  { title: t('时长包'), dataIndex: 'packageName', key: 'packageName' },
  { title: t('资源池'), key: 'pool', width: 120 },
  { title: t('本期已占 / 授予'), key: 'used', width: 190 },
  { title: t('剩余'), key: 'remain', width: 110 },
  { title: t('正在使用'), key: 'running', width: 130 },
  { title: t('涉及几节课'), dataIndex: 'courseCount', key: 'courseCount', width: 110 },
  { title: t('重置周期'), key: 'period', width: 170 }
])

/** 与按课明细那两个数字同一句提醒：一个是账一个是事实，不相加也不互相校验 */
const runningTip = computed(() =>
  t('该班排课实例里这个池当前真开着的机器数与开机人数（未释放的计量行，一人多开只算一人）；是实时事实，与墙钟扣账无关 —— 下课释放后归零，同池多个包显示同一个数。'))

/** 容器运行总时长列的同款提醒：这一格是全部容器相加的人时，不是墙钟，容易被当成「该和墙钟对上」的数 */
const courseRunTip = computed(() =>
  t('这节课这个池全部容器实际运行时长之和（每台机器各自跑过的分钟相加，人时口径）：多机同时上机会比墙钟大，已释放的机器也照算在历史里。'))

const courseColumns = computed(() => [
  { title: t('课表窗口'), key: 'window', width: 230 },
  { title: t('资源池'), key: 'pool', width: 120 },
  { title: t('正在使用'), key: 'running', width: 130 },
  { title: t('状态'), key: 'state', width: 90 },
  { title: t('墙钟占用（账）'), key: 'wall', width: 200 },
  { title: t('容器运行总时长'), key: 'run', width: 150 }
])

/**
 * 后端时间字段的三种形态都出现过：数字时间戳、"yyyy-MM-dd HH:mm:ss"、
 * ISO 串（带 T/Z，Spring Boot 对 Date 的默认序列化）。
 * 上一版无差别把 - 换成 / 正好把 ISO 串改坏（"2026/10/14T..." 解析成 Invalid Date），
 * 状态列因此全落在「进行中」—— 带 T 的直接交给 new Date，只有空格分隔的才换斜线（Safari 认）。
 */
function toTs(t) {
  if (!t) return NaN
  if (typeof t === 'number') return t
  const s = String(t)
  const ts = /[TZ]/.test(s) ? new Date(s).getTime() : new Date(s.replace(/-/g, '/')).getTime()
  return Number.isNaN(ts) ? new Date(s).getTime() : ts
}

/**
 * 课表窗口自身的时长：向下取整分钟，与墙钟落账同一口径。
 * end 是提前下课后的实时值，所以这个时长跟着实际下课走，不是排课的标称时长；
 * 两个时间缺任一或倒挂时直接不显示（空串让模板的 v-if 收口），不拿 0 分骗人。
 */
function windowLength(record) {
  const begin = toTs(record.beginTime)
  const end = toTs(record.endTime)
  if (Number.isNaN(begin) || Number.isNaN(end)) return ''
  const mins = Math.floor((end - begin) / 60000)
  return mins > 0 ? formatMinutes(mins) : ''
}

/**
 * 这节课现在是什么状态：拿课表窗口与当前时间比，前端判而不是后端算 ——
 * 后端只在查询那一刻算，页面挂着不动状态会冻结；前端判则到点自己翻成「已结束」。
 * end 是后端从排课表现查的实时下课时刻（coalesce 实际下课），提前下课的课在这里跟着提前。
 * 与「正在使用」是两件事：课到点结束但机器忘关，就是「已结束 + 在跑」并存。
 */
function courseState(record) {
  const now = Date.now()
  const begin = toTs(record.beginTime)
  const end = toTs(record.endTime)
  if (!Number.isNaN(begin) && now < begin) {
    return { label: t('未开始'), color: 'default' }
  }
  if (!Number.isNaN(end) && now > end) {
    return { label: t('已结束'), color: 'default' }
  }
  return { label: t('进行中'), color: 'processing' }
}

function openDetail(record) {
  detailUserId.value = String(record.userId)
  detailOpen.value = true
}

async function loadClasses() {
  classLoading.value = true
  try {
    const res = await listVisibleClasses()
    classList.value = res.data || []
    if (classList.value.length && !classList.value.some((c) => String(c.deptId) === classId.value)) {
      classId.value = String(classList.value[0].deptId)
    }
  } finally {
    classLoading.value = false
  }
}

async function loadStudents(silent = false) {
  if (!classId.value) {
    rows.value = []
    return
  }
  // 静默那一轮不亮遮罩，也不能把手点那一轮的遮罩提前关掉（与个人资源页同一规矩）
  if (!silent) {
    loading.value = true
  }
  try {
    const res = await listClassStudents(classId.value, windowDays.value)
    rows.value = res.data || []
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

/**
 * 取本班窗口内的日粒度趋势。归属校验在后端与列表同一道闸门，这里不传任何身份参数。
 * 序号守卫与角色页同一个理由：换班与换窗口都会重取，慢的那一次不该盖住新的一次。
 */
async function loadDaily(silent = false) {
  const seq = ++dailySeq
  if (!windowDays.value || !classId.value) {
    dailySeries.value = []
    setMeta(null)
    return
  }
  if (!silent) {
    dailyLoading.value = true
  }
  try {
    const res = await getClassUsageDaily(classId.value, windowDays.value)
    if (seq !== dailySeq) {
      return
    }
    setMeta(res.data || null)
    dailySeries.value = res.data?.series || []
  } finally {
    if (seq === dailySeq && !silent) {
      dailyLoading.value = false
    }
  }
}

/**
 * 三块一起重取。定时那一轮传 silent=true（async 函数天生回 Promise，
 * hook 的「上一轮没落地不叠下一轮」判据拿得到）；手点走 handleRefresh 亮遮罩并重计定时器。
 */
function reloadAll(silent = false) {
  loadStudents(silent)
  loadDaily(silent)
  loadQuota(silent)
}

/**
 * 取本班的班级排课额度。归属校验在后端与列表、趋势同一道闸门，这里不传任何身份参数。
 * <p>
 * 不绑统计窗口、选了班就取：包那半边是「当前周期」的账，与选不选窗口无关；
 * days 只决定按课明细往回看几天，没选窗口就不传、让后端拿默认档，
 * 标题按返回体里的 days 说话 —— 前端再记一份默认天数，两边迟早显示成两个不同的窗口。
 */
async function loadQuota(silent = false) {
  const seq = ++quotaSeq
  if (!classId.value) {
    quota.value = null
    return
  }
  if (!silent) {
    quotaLoading.value = true
  }
  try {
    const res = await getClassScheduleQuota(classId.value, windowDays.value)
    if (seq !== quotaSeq) {
      return
    }
    quota.value = res.data || null
  } finally {
    if (seq === quotaSeq && !silent) {
      quotaLoading.value = false
    }
  }
}

function handleClassChange() {
  loadStudents()
  loadDaily()
  loadQuota()
  // 换班：曲线的主语变了。hook 的指纹带着班级ID，展开着就直接重拉，收起着等下次展开
  syncHist()
}

// 换窗口：行上那一列与图一起重取，按课明细的回看天数也跟着走
watch(windowDays, () => {
  loadStudents()
  loadDaily()
  loadQuota()
})

onMounted(async () => {
  loadOptions()
  await loadClasses()
  await loadStudents()
  loadDaily()
  loadQuota()
})

// 定时那一轮静默重取三块（与学生「我的资源」页共用同一份 hook，3 分钟、后台暂停、不叠加都是它的行为）
const { restart: restartAutoRefresh } = useAutoRefresh(() => reloadAll(true))

/**
 * 手点刷新：亮遮罩，并把定时器归零重计。
 * 不归零会出现「刚手点完一秒又被定时刷一轮」，两轮同时改同一批数据。
 */
function handleRefresh() {
  reloadAll()
  restartAutoRefresh()
}

/**
 * 并发曲线的两个触发口（展开、换窗口）都走这里：收起状态一律不请求，
 * 展开时同一「口径 + 主体 + 窗口」的指纹只认一次，重复触发不会多打一遍接口。
 */
function syncHist(force = false) {
  if (histKeys.value.includes('runningHist')) {
    loadHistory(classId.value, force)
  }
}

watch(histKeys, () => {
  syncHist()
})
watch(histWindow, () => {
  syncHist()
})
</script>

<style scoped>
.class-usage {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 顶部筛选条与下面卡片拉开一个卡片间距（gap 已给，这里不再加 margin） */
.usage-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.section-card {
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}

.card-title {
  font-weight: 600;
  color: var(--ink);
}

.card-sub {
  color: var(--ink-3);
  font-size: 12px;
}

.cell-sub {
  color: var(--ink-3);
  font-size: 12px;
}

.hist-tools {
  margin-bottom: 6px;
}

/* 口径说明自己占一行：与图表的 legend 拉开，长句换行也不会压到图上 */
.hist-note {
  margin-bottom: 10px;
  line-height: 1.6;
}

.exhaust-tip {
  margin-top: 12px;
  font-size: 12.5px;
  color: var(--ink-2);
}

.course-block {
  margin-top: 16px;
}

.course-title {
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--ink);
}

/* 口径说明：比标题轻、比单元格里的小字重，得让人在表头看到「事实」两个字的瞬间就扫到 */
.course-note {
  margin: -2px 0 10px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--ink-3);
}

.course-note b {
  font-weight: 600;
  color: var(--ink-2);
}

.text-danger {
  color: var(--danger);
}

.text-ok {
  color: var(--ok);
}

.text-warn {
  color: var(--warn);
}
</style>
