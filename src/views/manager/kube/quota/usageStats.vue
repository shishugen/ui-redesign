<template>
  <div class="usage-stats">
    <!-- 条件查询整行放页面最上面：它决定下面几乎每一块的数（汇总条、趋势图、总运行容器、明细表；再下面的并发历史只跟着这里的班级走，窗口和角色它不看），
         夹在两块结果中间就得先滚到它、再滚回来看它改了哪些数。
         连「搜昵称或账号」与「只看缺额度」也一并提上来 —— 它们和角色/班级/窗口是同一组条件，
         拆在两处只会让人以为那是表格自己的小工具。明细表那边已用 external-filter 关掉内部那一行，
         这两个值从 props 进去，两处只有一条生效路径。
         注意：这两项只收窄下面的明细表，不改顶部汇总条的人数（与它们还在表组件内部时一致） -->
    <div class="usage-filter-bar">
      <a-space wrap>
        <a-select
          v-model:value="roleId"
          :options="roleOptions"
          :placeholder="t('全部角色')"
          style="width: 220px"
          :loading="roleLoading"
          allow-clear
          show-search
          :filter-option="(input, option) => String(option.label).includes(input)"
          @change="onRoleChange" />
        <a-select
          v-model:value="deptId"
          :options="deptOptions"
          :placeholder="t('全部班级')"
          style="width: 220px"
          allow-clear
          show-search
          :filter-option="(input, option) => String(option.label).includes(input)" />
        <!-- 统计窗口：选了它才多一列「窗口内已用」与下面那张图；清了就是回到只看本期的账。
             取数由 watch(windowDays) 统一发起，这里不再挂 @change，免得一次选择请两遍 -->
        <UsageWindowSelect
          v-model:value="windowDays"
          :options="windowOptions"
          :loading="optionsLoading"
          placeholder="统计窗口" />
        <a-button type="text" size="small" :loading="loading" @click="reloadAll">
          <template #icon><ReloadOutlined /></template>
          {{ t('刷新') }}
        </a-button>
        <!-- 维护入口不是查询入口：单独一个权限键，没键的账号直接看不到这个按钮，
             而不是点下去才吃一个 403。
             迁移说明：旧页用 v-hasPermi 指令，新项目未注册该指令（D17），
             改用同一份判据的 checkPermi() —— 权限为空时返回 false，不会 console.error -->
        <a-button
          v-if="canBackfill"
          type="text"
          size="small"
          :loading="backfilling"
          @click="onBackfill">
          <template #icon><SyncOutlined /></template>
          {{ t('补齐历史统计') }}
        </a-button>
        <a-input
          v-model:value="keyword"
          :placeholder="t('搜昵称或账号')"
          allow-clear
          style="width: 180px" />
        <a-checkbox v-model:checked="onlyProblem">{{ t('只看缺额度的') }}</a-checkbox>
      </a-space>
    </div>

    <!-- 顶部汇总条：这页真正回答的是「这群人的包发下去到底怎么样了」，
         明细表只是它的证据，所以数得摆在看明细之前。
         条上每个数都跟着班级筛选走：筛到一个班还写着全角色的数，就是自相矛盾 -->
    <div v-if="rows.length" class="usage-summary">
      <span class="s-scope">{{ scopeLabel }}</span>
      <span>{{ t('共') }} <b>{{ filteredRows.length }}</b> {{ t('人') }}</span>
      <span>{{ t('无额度包') }} <b class="s-none">{{ summary.noPackage }}</b> {{ t('人') }}</span>
      <span>{{ t('已用完') }} <b class="s-bad">{{ summary.usedUp }}</b> {{ t('人') }}</span>
      <span>{{ t('即将耗尽') }} <b class="s-warn">{{ summary.warning }}</b> {{ t('人') }}</span>
      <span v-if="summary.banned">{{ t('被禁用') }} <b class="s-bad">{{ summary.banned }}</b> {{ t('人') }}</span>
      <span>{{ t('本期授予合计') }} <b>{{ formatMinutes(summary.grantMinutes) }}</b></span>
      <span>{{ t('本期已用合计') }} <b>{{ formatMinutes(summary.usedMinutes) }}</b></span>
      <!-- 窗口合计只在选了窗口时出现：与“本期已用合计”摆在一起才能看出“这一期大部分是窗口外花掉的” -->
      <span v-if="windowDays">{{ windowLabel || t('近 {n} 天', { n: windowDays }) }}{{ t('已用合计') }}
        <b>{{ formatMinutes(summary.windowMinutes) }}</b></span>
      <span v-if="stoppedCount" class="s-dim">{{ t('另有 {n} 个停用账号未计入本表（他们头上的包仍在发放与累计范围内）', { n: stoppedCount }) }}</span>
    </div>

    <!-- 趋势图：跟着班级筛选走，所以每次换筛选项都要重取一次。
         不选窗口就没有图：没有窗口就没有「哪几天」可说 -->
    <UsageTrendChart
      v-if="windowDays && rows.length"
      class="usage-trend-block"
      :meta="windowMeta"
      :series="dailySeries"
      :pool-names="poolNames"
      :title="`${scopeLabel} · ${t('{name}消耗趋势', { name: windowLabel || t('窗口内') })}`"
      :hint="windowHint"
      :loading="dailyLoading" />

    <!-- 总运行容器：紧贴在上面那张消耗趋势图之后 —— 两块同跟页顶的统计窗口，一个答「这些天池花了多少分钟」，
         一个答「这些机器分别是哪类资源、哪档用途开出来的」。数据源仍然不同：分钟只能从日表来（一行计量
         跨日增长，按 create_time 切天会切出错数），台数只能从计量行现算，所以两个数各自成立，不拿一个验另一个。
         再下面那块并发历史答的是「同一时刻开着几台」，与这里的「窗口内开过几台 + 此刻几台在跑」是两个问题。
         「此刻正在运行」与窗口无关，所以这一块不跟着统计窗口消失：清空窗口后只剩它，那也正是最该看的数。
         台数横竖能相加，人数不能：合计那一格是后端自己去重算的，页面不参与求和。 -->
    <div v-if="totals" class="totals-block">
      <div class="totals-title">{{ totalsTitle }}</div>
      <div class="totals-head">
        <template v-if="windowDays">
          <span><span class="t-big">{{ totals.totalInstances }}</span> {{ t('台运行过') }}</span>
          <span class="t-sep">·</span>
          <span><span class="t-big">{{ totals.totalUsers }}</span> {{ t('人用过') }}</span>
          <span class="t-sep">‖</span>
        </template>
        <span><span class="t-big">{{ totals.totalRunningInstances }}</span> {{ windowDays ? t('台此刻正在运行') : t('台在跑') }}</span>
        <span class="t-sep">·</span>
        <span><span class="t-big">{{ totals.totalRunningUsers }}</span> {{ windowDays ? t('人在用') : t('人开着机器') }}</span>
        <span v-if="totals.totalRunningInstances" class="cell-sub" :class="{ 't-stale': runningStale }">{{ runningFreshText }}</span>
        <span v-if="windowDays && totals.carryoverInstances" class="cell-sub">
          {{ t('另有 {n} 台是 {day} 前开的、这期间仍在跑（没算进「运行过」那个数，但算进了「此刻正在运行」）', { n: totals.carryoverInstances, day: totals.fromDay }) }}
        </span>
        <span v-if="windowDays && totalsStale" class="cell-sub">{{ t('计量数据自 {day} 起，这个窗口比它早', { day: totals.earliestMeterDay }) }}</span>
      </div>
      <a-spin :spinning="totalsLoading">
        <!-- 一格都没有时不摆一张全 0 的表：全 0 看起来像「没人用过机」，而实际更常见的成因是
             那一天统计还没跑到。把计量起始日一起说在这句里，两个成因就分开了 -->
        <a-table
          v-if="totals.cells.length"
          size="small"
          :columns="totalColumns"
          :data-source="totalRows"
          :pagination="false"
          :row-class-name="totalRowClass"
          row-key="usageScope">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'scope'">
              <a-tooltip v-if="record.usageScope === 'unknown'" :title="unknownTip">
                <span>{{ t(record.usageScopeName) }} <InfoCircleOutlined /></span>
              </a-tooltip>
              <span v-else>{{ t(record.usageScopeName) }}</span>
            </template>
            <template v-else>
              <template v-if="cellOf(record, column)">
                <div>{{ cellOf(record, column).instances }} {{ t('台') }}<span class="cell-sub"> · {{ cellOf(record, column).users }} {{ t('人') }}</span></div>
                <!-- 「▸ 在跑」是同一格的另一个口径，不是另一格数据，所以矮一档贴在主数下面；
                     它不为 0 才出现：每格都挂一行「在跑 0 台」只会把这张表压成两倍高 -->
                <div v-if="cellOf(record, column).running" class="cell-sub cell-running">
                  ▸ {{ t('在跑') }} {{ cellOf(record, column).running.instances }} {{ t('台') }} · {{ cellOf(record, column).running.users }} {{ t('人') }}
                </div>
              </template>
              <span v-else class="cell-sub">—</span>
            </template>
          </template>
        </a-table>
        <div v-else class="cell-sub totals-empty">{{ totalsEmptyText }}</div>
      </a-spin>
      <div class="cell-sub totals-foot">
        <template v-if="windowDays">
          {{ t('一行计量 = 一台容器，窗口内开过就算一台，关掉的不减；同一台被关掉再开会去重成一个。') }}
          {{ t('格子里那行「▸ 在跑」是此刻还开着的，') }}<b>{{ t('不受统计窗口影响') }}</b>{{ t('：窗口之前就开着、一直没关的那几台也算在里面。') }}
          {{ t('没开过机、也没在跑的资源池不会长出列，所以这张表的列数会随窗口变。') }}
        </template>
        <template v-else>
          {{ t('这一段与统计窗口无关：此刻还开着几台、分别是什么资源、哪档用途。') }}
          {{ t('选一个统计窗口后，格子里会再多出「这窗口内一共开过几台」。') }}
        </template>
      </div>
    </div>

    <!-- 并发历史：这块答的是「同一时刻开着几台、几个人」，与再下面「每人还剩多少额度」是两个问题，
         所以排在明细表之前、默认展开 —— 一进来就能看到全校近 7 天的占用曲线，代价是首屏多打一次并发历史接口。
         它不跟页顶的统计窗口走，用自己面板里那排小按钮（首屏给全校合计 ＋ 近 7 天，由 useRunningHistory 的入参定）。
         三档互不相加：全校 ≠ 各班相加（峰值时刻不同），总并发 ≠ 各池相加（跨池人数会数两次）。
         这块也不跟角色筛选走：后端只有班级/个人/全校三档主体，没有「某个角色的并发」这回事。 -->
    <div class="running-block">
      <a-collapse v-model:activeKey="histKeys" ghost>
        <a-collapse-panel key="runningHist" :header="t('并发历史（同一时刻开着几台、几个人）')">
          <a-space :size="12" wrap class="hist-tools">
            <a-radio-group v-model:value="histScope" size="small" button-style="solid">
              <a-radio-button v-for="s in HIST_SCOPE_OPTIONS" :key="s.value" :value="s.value">{{ t(s.label) }}</a-radio-button>
            </a-radio-group>
            <a-radio-group v-model:value="histWindow" size="small" button-style="solid">
              <a-radio-button v-for="w in HIST_WINDOW_OPTIONS" :key="w.value" :value="w.value">{{ t(w.label) }}</a-radio-button>
            </a-radio-group>
          </a-space>
          <!-- 口径说明独立成块：放进 a-space 后长句换行时容器高度算不住，图例会被压在文字上 -->
          <div class="cell-sub hist-note">{{ t('每 5 分钟看一次，只在台数/人数变了的时候记一个点 —— 每个点的值一直延续到下一个点（阶梯线那段就是）。明细只留一个学期，整学期那一档自动换成日峰值') }}</div>
          <a-alert
            v-if="histScope === 'class' && !histClassId"
            type="info"
            show-icon
            class="hist-tip"
            :message="t('看「班级排课」这一档要先在上方选一个班级；「未分班」那一档不是班级，取不到排课并发。')" />
          <RunningHistoryChart
            :rows="histRows"
            :pool-names="runningPoolNames"
            :loading="histLoading"
            :extra-of="histExtra"
            :extend-to-now="histWindow !== 'term'" />
          <!-- 全校总览：日汇总层（永不删除）按上面的窗口合并，只在「全校合计」这一档出现 -->
          <div v-if="histScope === 'school' && schoolSummary.length" class="school-block">
            <div class="school-title">{{ t('全校总览 · {label}（各池并发峰值，总统计永久保留）', { label: schoolLabel }) }}</div>
            <a-table
              size="small"
              :columns="schoolColumns"
              :data-source="schoolSummary"
              :pagination="false"
              row-key="resourceType">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'pool'">
                  <a-tag :color="poolColor(record.resourceType)">
                    {{ runningPoolNames[record.resourceType] || record.resourceType || t('总并发') }}
                  </a-tag>
                </template>
              </template>
            </a-table>
            <!-- 窗口落到多天时把口径写明，尤其解释「共用过」为什么是空的 -->
            <div v-if="!schoolSingleDay" class="cell-sub">
              {{ t('窗口内共 {n} 天的日峰值合并：峰值取最大、均值为 Σ变化点台数 ÷ Σ变化点数、时长为各天分钟相加；', { n: schoolRangeDays }) }}
              {{ t('「窗口内共用过」跨天不可加（同一台机器连开多天会被数多次），所以这一列只在窗口落到一天时有值。') }}
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>

    <QuotaUserTable
      :rows="filteredRows"
      :loading="loading"
      :empty-text="emptyText"
      :window-title="windowDays ? windowColumnTitle : ''"
      :window-tip="windowHint"
      :student-label="t('用户')"
      show-dept
      show-role
      :external-filter="true"
      :keyword="keyword"
      :only-problem="onlyProblem"
      @detail="openDetail">
    </QuotaUserTable>

    <!-- 下钻走管理员自己的明细接口（不传 fetch-detail）：
         教师那个接口带班级归属校验，管理员看一个未分班的人会被它拒掉 -->
    <ConsumptionDrawer v-model:open="detailOpen" :user-id="detailUserId" />
  </div>
</template>

<script setup>
/**
 * 后台「用量统计」：某个角色（或全校）下每人本期还剩多少额度，外加一块并发历史。
 * <p>
 * 与班级用量页差在三处，而且每处都是班级页够不着的：
 * 一、不卡 role_key，所以老师、管理员自己也在表里 —— 教师角色那两个共 7200 分钟的包，
 *     在班级页上没有任何地方能看到；
 * 二、名单不按班级筛，所以挂在已删除班里的人会出现（现网就有 3 个），
 *     而班级页的下拉里根本选不到那个班，这批人就成了两张表都照不到的死角；
 * 三、顶部有汇总条，能一眼看出「发了 32 小时，87 个学生里 83 个一次没用过」这种事。
 * <p>
 * 并发历史（同一时刻开着几台、几个人）也挂在这一页，而且是它唯一的地方：三档主体里有两档
 * （个人用机、全校合计）压根不按班收敛，放在老师只看自己班的那张页上既对不上主语，
 * 又等于把全校量级摆到老师面前 —— 后端跟着收紧，那两档只有管理员取得到。
 * <p>
 * 曲线下面还有一块「总运行容器」：曲线只说得出「那一刻开着 N 台」，说不出这 N 台里
 * 多少是本地容器、多少是排课开出来的。那张矩阵把窗口内开过的机器按「资源池 × 使用范围」
 * 拆成格子，跟的是页顶那个统计窗口与上面那批人 —— 与日趋势图同源同范围，两个数才能对着看。
 * <p>
 * 停用的账号不列（业务上他们不能再开机器），但人数单独报出来：
 * 包是按人头每人一份发的，包上的已用是全员累计，少了这句数就对不上、也解释不了。
 * <p>
 * 班级筛选是在已拉回的人里再筛一道（行上本来就带 deptId/deptName/deptState），不回头请求后端；
 * 选项也从当前这批行现构，所以下拉里只会出现在这个角色下真实有人挂着的班 ——
 * 包括那些班级用量页的选班下拉永远给不了的班（已删除、非班级部门）。
 * <p>
 * 数字与学生「我的资源」页同源，算法与班级页同一段代码（后端 computeRows 只认名单不认来源），
 * 所以这三处看到的余额必然相等；不等就是 bug。
 * <p>
 * 统计窗口（近一天~近一年）是叠在本期账上的第二个维度：行上多一列「窗口内已用」、
 * 上面多一张按池按天的趋势图。两个铁律：
 * 一、图与表必须是同一批人 —— 班级筛选变了要重取图，不然筛到 40 人的班而图画着 47 人；
 * 二、窗口数字天生不完整 —— 日粒度统计只从上线那天起有数据，所以档位上标天数、
 *    图下面写口径，而不是让它看起来像一个正常的年度数字。
 */
import { ref, computed, watch, onMounted, h } from 'vue'
import { ReloadOutlined, SyncOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { Modal, message } from 'ant-design-vue'
import { t } from '@/i18n'
import { checkPermi } from '@/utils/permission'
import { listRole } from '@/api/system/role'
import { getRoleUsage, getRoleUsageDaily, getRunningTotals, backfillUsageDaily } from '@/api/kube/resourceAllocation'
import { formatMinutes, poolColor } from './quotaUtils'
import ConsumptionDrawer from './consumptionDrawer.vue'
import QuotaUserTable from './quotaUserTable.vue'
import UsageWindowSelect from './usageWindowSelect.vue'
import UsageTrendChart from './usageTrendChart.vue'
import RunningHistoryChart from './runningHistoryChart.vue'
import {
  useRunningHistory,
  fetchSchoolSummary,
  HIST_SCOPE_OPTIONS,
  HIST_WINDOW_OPTIONS,
  dailyAvg
} from './runningHistory'
import { useUsageWindow } from './usageWindow'

/** 补齐历史统计只在有这个权限键时可见（旧页的 v-hasPermi 换成同一份判据的函数式调用） */
const canBackfill = computed(() => checkPermi(['kube:resourceAllocation:backfill']))

const roleList = ref([])
const roleLoading = ref(false)
/** 页顶筛选条自己的两项筛条件：明细表关掉内部那一行后就读这两个值 */
const keyword = ref('')
const onlyProblem = ref(false)

const rows = ref([])
// 后端给的是按部门分组的明细，不是个总数：筛到某个班时这句人数得跟着筛
const stoppedByDept = ref([])
const loading = ref(false)
const roleId = ref(undefined)
const deptId = ref(undefined)
const detailOpen = ref(false)
const detailUserId = ref('')

// 并发历史：默认就展开、首屏直接取数（那一次 syncHistory 在 onMounted 末尾），收起来再点开只是重新拉一遍
const histKeys = ref(['runningHist'])
const {
  rows: histRows,
  loading: histLoading,
  window: histWindow,
  scope: histScope,
  load: loadHistory,
  extraOf: histExtra
} = useRunningHistory({ scope: 'school', window: '7d' })
const schoolSummary = ref([])
// 标题上的时间：单日档是一个日期，多日档是「起 ~ 止」区间
const schoolLabel = ref('')
// 窗口内实际只有一天有数据时才是 true —— 「共用过」那一列只在这时显示值
const schoolSingleDay = ref(true)
// 合并了几天的数，给表下方那句口径说明用
const schoolRangeDays = ref(0)

// 窗口状态与口径算法都在 useUsageWindow 里，三处页面共用那一份
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

/** 图的数据：只有 series 用得上，元数据交给 setMeta 回到窗口件里 */
const dailySeries = ref([])
const dailyLoading = ref(false)
let dailySeq = 0

/**
 * 「未分班」这一档的选项 key。
 * 不能用空串：allow-clear 后 value 是 undefined，而空串会被当成「没筛」，
 * 两者混在一个值上就筛不到那批人了。
 */
const NONE_DEPT = '__none__'

/** 行上的 deptState 不是班级时，在下拉里给个标记，不然跟正常班长得一样 */
const DEPT_STATE_TAG = {
  deleted: '已删除',
  stopped: '部门已停用',
  not_class: '非班级',
  none: '未分班'
}

/** 归一化：dept_id 为 NULL 和为 0 在库里是同一件事（没分班），后端两边都给不出第二个值 */
function normDept(value) {
  const text = value === null || value === undefined ? '' : String(value)
  return text === '0' ? '' : text
}

/** 某一行落在哪个班级筛选项里 */
function deptKeyOf(row) {
  return normDept(row.deptId) || NONE_DEPT
}

/**
 * 第一项「全部角色」是有意放进去的：管理员要看的是「所有人」，
 * 而且现网 61 个正常用户一次全返回也就几十 KB，没必要逼他先选一个角色才能看到表。
 * value 用空串而不是 undefined：清空下拉时 antd 会给 undefined，
 * 两个值后端都是同一句「不加角色条件」，但空串在请求里更直观。
 */
const roleOptions = computed(() => [
  { value: '', label: t('全部角色') },
  ...roleList.value.map((r) => ({ value: String(r.roleId), label: r.roleName }))
])

/** 当前选中的角色名，只为了给汇总条一句主语 */
const selectedRole = computed(() =>
  roleList.value.find((r) => String(r.roleId) === String(roleId.value))
)

/** 把当前这批人按班归堆，班级下拉的选项和人数都从这儿来 */
const deptGroups = computed(() => {
  const map = new Map()
  for (const row of rows.value) {
    const key = deptKeyOf(row)
    let group = map.get(key)
    if (!group) {
      // 同一个 deptId 的 deptState 必然相同（都来自同一张 sys_dept 行），拿首行就够
      map.set(key, { name: row.deptName || '', state: row.deptState || 'ok', count: 1 })
    } else {
      group.count += 1
    }
  }
  return map
})

/**
 * 班级筛选项：只摆当前这批人真实挂着的班。
 * <p>
 * 不拿 sys_dept 里 type=1、del_flag=0 的那份班名单（班级页用的就是它）：
 * 管理员拿它筛不到已删除班和非班级部门上的人，而这两档正是这张表要抓的东西。
 * 异常态在标签上标出来，不标的话跟正常班长得一样，筛出来的人为什么挂在这儿还得自己查。
 * <p>
 * 一个班里全是停用账号时（现网就有），它不会出现在选项里 —— 表里没人，筛过去也没东西可看，
 * 这批人只在不筛班级时的总数里计到。
 */
const deptOptions = computed(() => {
  const items = []
  for (const [key, group] of deptGroups.value) {
    const isNone = key === NONE_DEPT
    const short = isNone ? t('未分班') : group.name || t('部门 {id}', { id: key })
    const tag = isNone ? '' : t(DEPT_STATE_TAG[group.state])
    items.push({
      value: key,
      short,
      label: `${tag ? t('{name}（{tag}）', { name: short, tag }) : short} · ${t('{n} 人', { n: group.count })}`,
      // 正常班排前面，异常档排后面但未分班垫底：同一堆班里有废班时，常用的还是能一眼找到
      rank: isNone ? 2 : group.state === 'ok' ? 0 : 1
    })
  }
  items.sort((a, b) => a.rank - b.rank || a.short.localeCompare(b.short))
  return items
})

const filteredRows = computed(() => {
  if (deptId.value === undefined || deptId.value === null) {
    return rows.value
  }
  return rows.value.filter((row) => deptKeyOf(row) === deptId.value)
})

/** 汇总条的主语：原来只写「共 47 人」，不说这 47 人是谁，筛到班之后更容易看不出在看哪堆人 */
const scopeLabel = computed(() => {
  const rolePart = selectedRole.value ? selectedRole.value.roleName : t('全部角色')
  const deptPart = deptOptions.value.find((o) => o.value === deptId.value)
  return deptPart ? `${rolePart} · ${deptPart.short}` : rolePart
})

/** 当前筛选范围内被排除的停用账号数：不筛班级是把一切档加总，筛了就只取那一档 */
const stoppedCount = computed(() => {
  const cleared = deptId.value === undefined || deptId.value === null
  const target = cleared ? null : deptId.value === NONE_DEPT ? '' : deptId.value
  let total = 0
  for (const item of stoppedByDept.value) {
    if (cleared || normDept(item.deptId) === target) {
      total += item.userCount || 0
    }
  }
  return total
})

const summary = computed(() => {
  const acc = { noPackage: 0, usedUp: 0, warning: 0, banned: 0, grantMinutes: 0, usedMinutes: 0, windowMinutes: 0 }
  // 只跟到班级为止，不跟着表格内部的搜索框/「只看缺额度」变：
  // 这几行说的是「这堆人整体的额度怎么样了」，不是「当前屏上这几行加起来多少」
  for (const row of filteredRows.value) {
    if (row.statusCode === 'no_package') {
      acc.noPackage += 1
    } else if (row.statusCode === 'used_up') {
      acc.usedUp += 1
    } else if (row.statusCode === 'warning') {
      acc.warning += 1
    }
    if (row.banned) {
      acc.banned += 1
    }
    acc.grantMinutes += row.grantMinutes || 0
    acc.usedMinutes += row.usedMinutes || 0
    // 只在真要窗口列时累加：windowMinutes 为 null 是「这一列没开」，当成 0 加会显出一个假的 0
    if (row.windowMinutes !== null && row.windowMinutes !== undefined) {
      acc.windowMinutes += row.windowMinutes
    }
  }
  return acc
})

/** 池 code → 中文名：从行里推，与表格列同一个来源，不为图去多请求一次下拉接口 */
const poolNames = computed(() => {
  const map = {}
  for (const row of rows.value) {
    for (const pool of row.pools || []) {
      if (pool.resourceType && !map[pool.resourceType]) {
        map[pool.resourceType] = pool.resourceTypeName || pool.resourceType
      }
    }
  }
  return map
})

/**
 * 并发曲线的班级主体：跟着上方的班级筛选走 —— 这页的图从来都跟着筛选，
 * 换筛选项不重取就会「表里 40 人、图画着 47 人」那样两个范围。
 * 「未分班」那一档是 dept_id 为空的哨兵值，不是班级，排课并发无从谈起，所以不当主体。
 */
const histClassId = computed(() =>
  deptId.value && deptId.value !== NONE_DEPT ? String(deptId.value) : ''
)

/** 曲线池名：在这页池名之上多一枚「总并发」—— 后端跨池合并行的 resource_type 就是空串 */
const runningPoolNames = computed(() => ({ ...poolNames.value, '': t('总并发') }))

/**
 * 全校总览的列：峰值 / 均值 / 累计 / 运行时长，与曲线整学期那一档同源同数。
 * 「平均并发」得写明是【按变化点】：日汇总的 sample_count 在班级/个人/全校三档已经
 * 从「采样点数」变成「非零变化点数」（值没变的那几轮不再往分母里堆），
 * 所以它是变化点等权均值而不是时长加权：起 5 分钟就关的 3 台与跑满一天的 3 台同权。
 * （按人档拿不到变化点锚——明细表没有按人行——那一份还是采样点均值，但这一列不取它。）
 *
 * 列名跟着窗口变：多日档下「当天」就不成立了。但「共用过」这一列【不改成窗口口径】，
 * 因为跨天不可加（同一台机器连开 7 天会被数成 7 台），窗口落到多天时直接显示「—」，
 * 宁可空一格也不摆一个看着像真值的错数。
 */
const schoolColumns = computed(() => {
  const one = schoolSingleDay.value
  return [
    { title: t('资源池'), key: 'pool', dataIndex: 'resourceType', width: 120 },
    {
      title: one ? t('并发峰值') : t('窗口内并发峰值'),
      key: 'peak',
      customRender: ({ record }) => t('{n} 台', { n: record.maxInstances })
    },
    { title: t('平均并发（按变化点）'), key: 'avg', customRender: ({ record }) => t('{n} 台', { n: dailyAvg(record) }) },
    {
      title: one ? t('当天共用过') : t('窗口内共用过'),
      key: 'cum',
      customRender: ({ record }) => (record.cumInstances == null
        ? '—'
        : t('{n} 台 · {m} 人', { n: record.cumInstances, m: record.cumUsers }))
    },
    {
      title: one ? t('当天运行总时长') : t('窗口内运行总时长'),
      key: 'run',
      customRender: ({ record }) => formatMinutes(record.runMinutes || 0)
    }
  ]
})

/**
 * 空表两种成因要说清：这个角色本来没人（比如刚建的临时角色），
 * 和有人但被上面的搜索框/勾选项筛空了。
 * 用 rows 是否为空来分，而不是看筛选器状态 —— 筛选器在表格组件内部，这里拿不到，
 * 而 rows 为空本身就足以说明是前者。
 */
const emptyText = computed(() => {
  if (!rows.value.length) {
    return selectedRole.value
      ? t('「{name}」下还没有正常用户（停用账号不列在本表）', { name: selectedRole.value.roleName })
      : t('库里还没有正常用户')
  }
  return t('当前筛选下没有人')
})

function openDetail(record) {
  detailUserId.value = String(record.userId)
  detailOpen.value = true
}

async function loadRoles() {
  roleLoading.value = true
  try {
    const res = await listRole({ pageNum: 1, pageSize: 200 })
    roleList.value = res.rows || []
  } finally {
    roleLoading.value = false
  }
}

async function loadRows() {
  loading.value = true
  try {
    const res = await getRoleUsage(roleId.value === undefined ? '' : roleId.value, windowDays.value)
    rows.value = res.data?.rows || []
    stoppedByDept.value = res.data?.stoppedByDept || []
  } finally {
    loading.value = false
  }
}

/**
 * 取图的数据。
 * <p>
 * 带上 deptId：表格的班级筛选是在已拉回的行里筛，图是另一次请求，
 * 不跟着筛就会出现「表里 40 行、图还画着 47 人合计」。未分班那档的哨兵值与后端同一个。
 * <p>
 * 带序号守卫：换窗口、换角色、换班级都会重取，慢的那一次回来会把新图盖掉，
 * 而图上写的还是另一个窗口的口径——那种脏比不画更难发现。
 */
async function loadDaily() {
  const seq = ++dailySeq
  if (!windowDays.value) {
    dailySeries.value = []
    setMeta(null)
    return
  }
  dailyLoading.value = true
  try {
    const res = await getRoleUsageDaily({
      roleId: roleId.value === undefined ? '' : roleId.value,
      deptId: deptId.value,
      days: windowDays.value
    })
    if (seq !== dailySeq) {
      return
    }
    setMeta(res.data || null)
    dailySeries.value = res.data?.series || []
  } finally {
    if (seq === dailySeq) {
      dailyLoading.value = false
    }
  }
}

/**
 * 总运行容器。这批状态与 loadDaily 同构：同一个窗口、同一批人、同一个序号守卫。
 * 一套返回体里装着两个口径：窗口内开过（跟统计窗口）与此刻在跑（不跟窗口，清空窗口后只剩它）。
 * 合计那一行的 row-key 不能与任何一个使用范围码值撞，也不能拿空串（那是未知维的占位）。
 */
const TOTAL_SUM_KEY = '__sum__'
const totals = ref(null)
const totalsLoading = ref(false)
let totalsSeq = 0

/**
 * 一格（或小计）→ 页面要读的那两个数。投影一次做好，模板里就只读字段、不再算第二遍。
 * <p>
 * 主数会换主语：有窗口时是「窗口内开过几台」，窗口清空后这块只剩「此刻在跑几台」，主数就换成它 ——
 * 同一套模板要能渲染两种形态，靠这里切换，而不是在模板里写两份表格。
 * 「▸ 在跑」那一行只在「有窗口且这一格真在跑」时给；无窗口时它已经是主数，再重复一行只是噪音。
 */
function viewOf(raw) {
  if (!raw) {
    return null
  }
  const hasWindow = !!windowDays.value
  return {
    instances: hasWindow ? raw.instances : raw.runningInstances,
    users: hasWindow ? raw.users : raw.runningUsers,
    running: hasWindow && raw.runningInstances > 0
      ? { instances: raw.runningInstances, users: raw.runningUsers }
      : null
  }
}

const totalColumns = computed(() => {
  const pools = totals.value?.poolTotals || []
  return [
    { title: t('使用范围'), key: 'scope', dataIndex: 'usageScopeName', width: 132 },
    ...pools.map((pool) => ({ title: pool.poolName, key: `pool:${pool.pool}`, pool: pool.pool, align: 'right' })),
    { title: t('合计'), key: 'total', align: 'right', width: 132 }
  ]
})

/**
 * 行 = 使用范围（后端跨池小计那一层），末尾追一行「合计」。
 * 池小计不另开一行：它们本来就是「合计」那一行的各列取值，横着摆才对得上表头。
 */
const totalRows = computed(() => {
  const data = totals.value
  if (!data) {
    return []
  }
  const items = (data.scopeTotals || []).map((scope) => {
    const cells = {}
    for (const cell of data.cells || []) {
      if (cell.usageScope === scope.usageScope) {
        cells[cell.pool] = viewOf(cell)
      }
    }
    return { ...scope, cells, sum: viewOf(scope) }
  })
  const byPool = {}
  for (const pool of data.poolTotals || []) {
    byPool[pool.pool] = viewOf(pool)
  }
  items.push({
    usageScope: TOTAL_SUM_KEY,
    usageScopeName: '合计',
    cells: byPool,
    // 总计这一格直接拿后端 rollup 的总计行，不拿上面各列相加：台数那么加恰好相等，人数会重复计人
    sum: viewOf({
      instances: data.totalInstances,
      users: data.totalUsers,
      runningInstances: data.totalRunningInstances,
      runningUsers: data.totalRunningUsers
    })
  })
  return items
})

/** 「合计」那一列取行自己的小计，池列取交叉出来的那格，这个池这一档窗口内一台没开就是 null */
function cellOf(record, column) {
  if (column.key === 'total') {
    return record.sum
  }
  return record.cells[column.pool] || null
}

function totalRowClass(record) {
  if (record.usageScope === TOTAL_SUM_KEY) {
    return 'totals-sum'
  }
  return record.usageScope === 'unknown' ? 'totals-unknown' : ''
}

/** 「在跑」这个数可信的时限：计量一轮一分钟，容忍连着丢四轮仍认为它在跑 */
const RUNNING_STALE_MINUTES = 5

/** 标题跟着形态换：有窗口时这块答两件事（开过 + 在跑），清空窗口后只剩后一件 */
const totalsTitle = computed(() => {
  const data = totals.value
  if (!data) {
    return ''
  }
  if (!windowDays.value) {
    return t('此刻正在运行 · {scope}', { scope: scopeLabel.value })
  }
  return t('总运行容器 · {win}（{from} ~ {to}）· {scope}', {
    win: windowLabel.value || t('近 {n} 天', { n: windowDays.value }),
    from: data.fromDay,
    to: data.toDay,
    scope: scopeLabel.value
  })
})

/** 只在真有机器在跑时才有必要谈新鲜度：一台都没开着，「可能偏多」这句就是空话 */
const runningStale = computed(() => (
  !!totals.value?.totalRunningInstances && (totals.value.runningIdleMinutes || 0) > RUNNING_STALE_MINUTES
))

/**
 * 新鲜度那句话。「此刻在跑 N 台」靠的是计量行上的 is_closed，而那一列是每分钟那轮任务标的：
 * 任务停摆时该关的没关，N 会偏多 —— 不带上这句，就会有人拿一个虚高的占用数去做回收决策。
 * 分钟数由后端按服务器时区算好，前端只做展示，不再拿浏览器本地的钟去减数据库给的时刻。
 */
const runningFreshText = computed(() => {
  const data = totals.value
  if (!data?.totalRunningInstances) {
    return ''
  }
  if (runningStale.value) {
    return t('（计量已经 {n} 分钟没追平这批行，「在跑」这个数可能偏多）', { n: data.runningIdleMinutes })
  }
  // 刚好卡在 0 分钟时不写「0 分钟前」，那一读起来像坏掉了的样子
  return t('（计量 {n} 分钟前追平过这批行）', { n: Math.max(data.runningIdleMinutes || 0, 1) })
})

/** 空态那句也要换主语：无窗口时「这一窗口没有开过容器」是一句没有窗口可指的话 */
const totalsEmptyText = computed(() => {
  if (!windowDays.value) {
    return t('此刻没有开着的容器')
  }
  const since = totals.value?.earliestMeterDay
    ? t('（计量数据自 {day} 起）', { day: totals.value.earliestMeterDay })
    : ''
  return t('这一窗口没有开过容器') + since
})

const totalsStale = computed(() => {
  const data = totals.value
  // 日期串都是 yyyy-MM-dd，字典序就是时间序，不必为此 parse 一次
  return !!data?.earliestMeterDay && data.earliestMeterDay > data.fromDay
})

/** 未定档那一句得把「分得清的起点」带出来：不说的话这一档只会随窗口往后缩，看起来像 bug */
const unknownTip = computed(() => (
  totals.value?.scopedFromDay
    ? t('schedule_type 是后加的列，这批实例分不出班级排课还是个人排课；自 {day} 起才分得清', { day: totals.value.scopedFromDay })
    : t('schedule_type 是后加的列，库里现有的计量行都还没分档，所以这一档暂时装着全部')
))

/**
 * 取总运行容器矩阵。
 * <p>
 * 带序号守卫的理由与 loadDaily 逐字一样：换窗口、换角色、换班级都会重取，
 * 慢的那一次回来会把新的盖掉，而标题上写的还是另一个窗口的口径。
 * 不自己 catch：这块与日趋势图一样是展示型数据，故随全局错误提示走，不拦整页。
 */
async function loadTotals() {
  const seq = ++totalsSeq
  totalsLoading.value = true
  try {
    const res = await getRunningTotals({
      roleId: roleId.value === undefined ? '' : roleId.value,
      deptId: deptId.value,
      // 不带 days = 只要此刻在跑那组数，后端 days 为空就是这么约定的；页面清空统计窗口时走这条。
      // axios 会把值为 undefined 的参数整个丢掉，所以不会出现一个空着的 days=
      days: windowDays.value
    })
    if (seq !== totalsSeq) {
      return
    }
    totals.value = res.data || null
  } finally {
    if (seq === totalsSeq) {
      totalsLoading.value = false
    }
  }
}

/** 已取过的窗口档：跟 histWindow 比，一样就复用，不一样（包括上一档返回空）就重取 */
let schoolLoadedWin = ''

/** 全校总览：跟上面的曲线同窗口，不再固定只看最近一天 */
async function loadSchoolSummary() {
  const win = histWindow.value
  schoolLoadedWin = win
  try {
    const res = await fetchSchoolSummary(win)
    if (win !== histWindow.value) {
      // 快速切档时旧响应回来得晚，不能拿它覆盖新档的数
      return
    }
    schoolLabel.value = res.label
    schoolSummary.value = res.rows
    schoolSingleDay.value = res.singleDay
    schoolRangeDays.value = (res.days || []).length
  } catch (e) {
    // 与曲线同一取向：这块是展示型数据，取不到就空着，不能把整页额度拦成报错
    if (win === histWindow.value) {
      schoolSummary.value = []
      schoolLabel.value = ''
    }
  }
}

/**
 * 并发曲线的四路触发（展开、换口径、换窗口、换班级）都汇到这一个小函数上：
 * 收起状态一律不请求，展开时同一「口径 + 主体 + 窗口」的指纹只认一次。
 *
 * @param force 换筛选、手点刷新、补齐之后用，绕开指纹强制重取
 */
function syncHistory(force = false) {
  if (!histKeys.value.includes('runningHist')) {
    return
  }
  loadHistory(histClassId.value, force)
  // 窗口换了就是换了主语，上一档的行凑不到这一档里（空结果也算取过，不反复重试）；手点刷新带 force
  if (histScope.value === 'school' && (force || schoolLoadedWin !== histWindow.value)) {
    loadSchoolSummary()
  }
}

function reloadAll() {
  loadRows()
  loadDaily()
  loadTotals()
  // 展开着就一起重取；收起着 syncHistory 自己 return，不会多打一次接口
  syncHistory(true)
}

/** 补齐是写操作，一次要扫回溯区间内的计量行并逐格覆盖写，转起来就得把按钮锁住 */
const backfilling = ref(false)

/**
 * 管理员补齐日粒度历史统计。
 * <p>
 * 拿回的结果必须把「没补上的部分」一并展示：只报「补齐完成」的按钮最危险，
 * 因为证不了归属的那些行从此看起来就像已经计入统计了，而报表会一直少下去、
 * 没人知道少在哪。
 * <p>
 * 补完一定要重取一次本页：改的就是这张表正在显示的数字，不重取会继续显示补齐前的数，
 * 那是最容易让人以为「按钮没起作用」的一种假象。
 */
function onBackfill() {
  Modal.confirm({
    title: t('补齐日粒度历史统计？'),
    width: 560,
    content: h('div', [
      h('p', t('把「已经计费但没写进日表」的分钟补到它该去的日子。')),
      h('p', t('只补计量行自己能证明归属的部分（从创建到结束连续计费的那些行）；证不了的会原样列出来，不拿均摊凑数。')),
      h('p', t('写入只增不减，点几次结果都一样；执行时与每分钟那轮计量互斥，抢不到锁会提示稍后再点。'))
    ]),
    okText: t('开始补齐'),
    async onOk() {
      backfilling.value = true
      try {
        const res = await backfillUsageDaily()
        const data = res.data || {}
        if (data.lockBusy) {
          // 这不是失败，也没改任何一个数：不能弹结果框，更不能顺手重取一次本页
          message.warning(data.message || t('计量任务正在执行，请下一分钟后再点'))
          return
        }
        showBackfillResult(data)
        reloadAll()
      }
      finally {
        backfilling.value = false
      }
    }
  })
}

function showBackfillResult(data) {
  const reasons = data.skipReasons || []
  Modal.info({
    title: t('补齐结果'),
    width: 680,
    content: h('div', [
      h('p', data.message || t('补齐完成')),
      reasons.length
        ? h('div', [
            h('p', t('没补上的列了前 {n} 条（条数以计数为准，这里只是截选）：', { n: reasons.length })),
            h('ul', reasons.map((x, i) => h('li', { key: i }, x)))
          ])
        : h('p', t('没有需要跳过的行，窗口内的消耗已全部落进日表。'))
    ]),
    okText: t('知道了')
  })
}

/**
 * 换角色必须把班级筛选清掉。
 * 班级选项是从当前这批人现构的，不换的话：筛着「学生 · 大模型测试班」再切到「教师」，
 * 教师里没这个班，表直接空了，而下拉里还挂着一个选不上的值 —— 看起来像「教师没人」。
 */
function onRoleChange() {
  deptId.value = undefined
  loadRows()
  loadDaily()
  loadTotals()
}

// 换窗口：行上那一列、图、与总运行容器矩阵都要重取（三者都是后端按新窗口算的，前端算不出来）
watch(windowDays, () => {
  loadRows()
  loadDaily()
  loadTotals()
})

// 换班级：表是在已拉回的行里筛，不用重请；但图与矩阵必须跟着改范围
watch(deptId, () => {
  loadDaily()
  loadTotals()
  // 并发曲线的班级档跟着换主语；另两档与班无关，loadHistory 内部会忽略班级参数
  syncHistory(true)
})

// 换口径、换窗口：只在展开状态下立即重取，收起状态等下次展开按新口径拉
watch([histScope, histWindow], () => {
  syncHistory()
})

// 展开：这一轮指纹还没匹配上，自然会把当前口径的数拉一次
watch(histKeys, () => {
  syncHistory()
})

onMounted(async () => {
  loadOptions()
  await loadRoles()
  await loadRows()
  loadDaily()
  loadTotals()
  // 并发历史默认展开，所以它也得跟上面几个数一起在首屏就取好，不能留给用户去点
  syncHistory()
})
</script>

<style scoped>
.usage-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 条件查询整行：位置提到了页面最上面，间距与表组件内部那一行保持一致 */
.usage-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.usage-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--panel);
  font-size: 13px;
  color: var(--ink-2);
}

.usage-summary b {
  color: var(--ink);
}

/* 筛选器就在条子下面，不重复一遍主语的话，往上滚一行就忘了在看哪堆人 */
.s-scope {
  color: var(--ink);
  font-weight: 600;
}

.s-none {
  color: var(--ink-3);
}

.s-warn {
  color: var(--warn);
}

.s-bad {
  color: var(--danger);
}

.s-dim {
  color: var(--ink-3);
}

/* 图放在汇总条与明细表之间：先看趋势再看明细，与这张页「明细只是证据」的定位一致 */
.usage-trend-block {
  padding: 10px 12px 6px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--panel);
}

/* 并发历史排在明细表之前：它答的是「同一时刻开多少台」，与「每人还剩多少」是两个问题 */
.running-block {
  padding: 4px 12px 8px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--panel);
}

/* 总运行容器紧贴在消耗趋势图之后：两块同跟页顶那个统计窗口，图说分钟、这块说台数，看完图正好接着看数。
   与再下面那块并发历史不合并 —— 那一块用自己的那排小按钮，窗口来源不同，合并会让人以为拿的是同一把尺 */
.totals-block {
  padding: 10px 12px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--panel);
}

.totals-title {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
}

.totals-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--ink-2);
}

.t-big {
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
}

.t-sep {
  color: var(--ink-4);
}

.totals-empty {
  padding: 12px 0;
}

.totals-foot {
  margin-top: 6px;
}

/* 「▸ 在跑」是同一格的第二个口径，不是另一格数据：矮一档、贴在主数下面，不与主数抢 */
.cell-running {
  margin-top: 1px;
  font-size: 12px;
  white-space: nowrap;
}

/* 计量停摆时这句要跳出来，但不用红色 —— 那是「数据错了」的颜色，这里只是「可能偏多」 */
.t-stale {
  color: var(--warn);
}

/* 合计行与未定档行都是 a-table 内部渲染的 tr，scoped 样式命不中它们，必须 :deep 穿过去 */
:deep(.totals-sum) {
  font-weight: 600;
}

:deep(.totals-sum td) {
  background: var(--bg-soft);
}

/* 未定档不是「没人用机」也不是「数据坏了」，是分不出档的一批存量：灰字＋表头上的 ⓘ 说这件事 */
:deep(.totals-unknown) {
  color: var(--ink-3);
}

.hist-tools {
  margin-bottom: 6px;
}

/* 口径说明自己占一行：长句换行也不会压到图例上 */
.hist-note {
  margin-bottom: 10px;
  line-height: 1.6;
}

.hist-tip {
  margin-bottom: 8px;
}

.cell-sub {
  color: var(--ink-3);
  font-size: 12px;
}

.school-block {
  margin-top: 12px;
}

.school-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
  color: var(--ink-2);
}
</style>
