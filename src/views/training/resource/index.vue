<template>
  <div class="my-resource">
    <!-- 额度概览：三个池各一张卡，点卡片即按该池筛选下方记录 -->
    <a-card :bordered="false" class="section-card">
      <template #title>
        <a-space :size="8">
          <span class="card-title">{{ t('我的资源额度') }}</span>
        </a-space>
      </template>
      <template #extra>
        <!-- 定时刷新只在 tooltip 里说一句，不占卡头宽度（卡头 nowrap，多一句字就会被裁） -->
        <a-tooltip :title="autoRefreshHint()">
          <a-button type="text" size="small" @click="handleRefresh">
            <template #icon><ReloadOutlined /></template>
            {{ t('刷新') }}
          </a-button>
        </a-tooltip>
      </template>

      <a-spin :spinning="quotaLoading">
        <a-row :gutter="[12, 12]">
          <a-col :xs="24" :sm="12" :md="8" v-for="quota in allocQuotas" :key="quota.resourceType">
            <div
              class="pool-card"
              :class="{ 'pool-card-active': queryParams.resourceType === quota.resourceType }"
              role="button"
              tabindex="0"
              :aria-pressed="queryParams.resourceType === quota.resourceType"
              @click="filterByPool(quota.resourceType)"
              @keydown.enter.prevent="filterByPool(quota.resourceType)"
              @keydown.space.prevent="filterByPool(quota.resourceType)">
              <div class="pool-head">
                <a-tag :bordered="false" :color="poolColor(quota.resourceType)">{{ quota.resourceTypeName }}</a-tag>
                <a-tooltip v-if="quota.banned" :title="banTip(quota)">
                  <a-tag color="error">{{ t('已禁用') }}</a-tag>
                </a-tooltip>
                <span v-if="quota.runningInstances" class="pool-running">{{ t('在跑 {n} 个', { n: quota.runningInstances }) }}</span>
              </div>

              <div class="pool-remain">
                <a-tooltip :title="quota.quotaEnabled ? '' : t('时长额度未开放，此项仅供参考')">
                  <span class="pool-remain-value">{{ formatMinutes(quota.remainMinutes) }}</span>
                </a-tooltip>
                <span class="pool-remain-label" :class="{ 'is-warn': remainLabel(quota).warn }">{{ remainLabel(quota).text }}</span>
              </div>

              <a-progress
                :percent="usedPercent(quota.grantMinutes, quota.usedMinutes)"
                :show-info="false"
                size="small"
                :stroke-color="quota.grantMinutes > 0 && quota.remainMinutes <= 0 ? '#DC2626' : undefined" />

              <div class="pool-meta">
                <span>{{ t('额度') }} {{ formatMinutes(quota.grantMinutes) }}</span>
                <span>{{ t('额度内已用') }} {{ formatMinutes(quota.usedMinutes) }}</span>
              </div>
              <!-- 按档配对，只显【本期】的账：每行「该档已扣 + 该档剩余」，与卡片上方的
                   额度/已用/剩余同一本账，不再显计量表的全量累计（那个与本期已用不同源，
                   摆在一起永远加不回总量）。唯一不可加的是两行剩余之和与合计剩余：
                   范围=两种都用的包同时计入两组，固定小字只说这一件事 -->
              <a-tooltip :title="scopePairTip">
                <div>
                  <div class="pool-meta pool-meta-actual">
                    <span>{{ t('个人用机') }} {{ t('已用') }} {{ formatMinutes(quota.privateUsedMinutes) }} · {{ t('剩余') }} {{ formatMinutes(quota.privateRemainMinutes) }}</span>
                  </div>
                  <div class="pool-meta pool-meta-scope">
                    <span>{{ t('个人排课用机') }} {{ t('已用') }} {{ formatMinutes(quota.courseUsedMinutes) }} · {{ t('剩余') }} {{ formatMinutes(quota.courseRemainMinutes) }}</span>
                  </div>
                </div>
              </a-tooltip>
              <div class="pool-expire">
                <template v-if="quota.earliestExpireTime">{{ t('最早') }} {{ fmtTime(quota.earliestExpireTime) }} {{ t('作废') }}</template>
                <template v-else>{{ t('当前用量的包都不设到期时间') }}</template>
                <!-- 到期与重置是两条时间线：前者是包作废，后者是每人已用的账清一次零 -->
                <template v-if="quota.earliestNextResetTime"> ｜ {{ t('最早') }} {{ fmtTime(quota.earliestNextResetTime) }} {{ t('重发一次额度') }}</template>
              </div>
            </div>
          </a-col>
        </a-row>
        <!-- 一个池都没分配：不摆空卡片，只说清楚现在能不能用机 -->
        <a-alert
          v-if="!quotaLoading && allocQuotas.length === 0 && quotas.length"
          class="quota-empty"
          type="warning"
          show-icon
          :message="noAllocTip" />
        <!-- 错误态：额度这一块是整页的主语，取不到就不能只留一句「加载失败」，
             要能就地重试（四态里的「错误」） -->
        <a-empty
          v-if="!quotaLoading && !quotas.length && quotaError"
          :description="t('额度数据加载失败，请刷新重试')">
          <template #default>
            <a-button size="small" @click="loadQuota()">{{ t('重试') }}</a-button>
          </template>
        </a-empty>
        <a-empty
          v-else-if="!quotaLoading && !quotas.length"
          :description="t('额度数据加载失败，请刷新重试')" />
      </a-spin>
    </a-card>

    <!-- 统计窗口：上面的数字都是「本期」的账，这一块回答的是「最近这段时间我到底用了多少」 -->
    <a-card :bordered="false" class="section-card">
      <template #title>
        <a-space :size="8">
          <span class="card-title">{{ windowLabel || t('统计窗口') }}{{ t('消耗') }}</span>
          <span class="card-sub">{{ t('只计这个窗口内的运行时长，与上面卡片的「本期已用」不是同一个时间段') }}</span>
        </a-space>
      </template>
      <template #extra>
        <UsageWindowSelect
          v-model:value="windowDays"
          :options="windowOptions"
          :loading="optionsLoading"
          placeholder="统计窗口" />
      </template>

      <div v-if="!windowDays" class="window-none">
        {{ t('选择一个统计窗口，就能看这段时间里每天、每个额度池各用了多少。') }}
      </div>
      <template v-else>
        <!-- 「每个池各用了多少」这一行现在由趋势图自己带：三处页面问的是同一个问题，
             算法只留一份，免得这里一份、图里一份算出两个数 -->
        <UsageTrendChart
          :meta="windowMeta"
          :series="dailySeries"
          :pool-names="poolNameMap"
          :hint="windowHint"
          :loading="dailyLoading" />
      </template>
    </a-card>

    <!-- 支撑上面数字的时长包，让学生知道额度从哪来、什么时候到期 -->
    <a-card v-if="packageRows.length" :bordered="false" class="section-card" :title="t('我的时长包')">
      <a-table
        :columns="packageColumns"
        :data-source="packageRows"
        :pagination="false"
        row-key="rowKey"
        size="small"
        :scroll="{ x: 'max-content' }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'resourceTypeName'">
            <a-tag :bordered="false" :color="poolColor(record.resourceType)">{{ record.resourceTypeName }}</a-tag>
          </template>
          <template v-else-if="column.key === 'targetType'">
            <span class="pkg-target">{{ t(TARGET_LABEL[record.targetType] || record.targetType) }}</span>
            <span class="pkg-target-name">{{ record.targetName || '-' }}</span>
          </template>
          <template v-else-if="column.key === 'usageScope'">
            <a-tooltip :title="scopeTip(record.usageScope)">
              <a-tag :bordered="false" :color="scopeColor(record.usageScope)">{{ t(scopeName(record.usageScope)) }}</a-tag>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'resetPeriod'">
            <a-tooltip :title="periodTip(record)">
              <a-tag :bordered="false" :color="periodColor(record.resetPeriod)">{{ t(periodName(record.resetPeriod)) }}</a-tag>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'grantMinutes'">
            {{ formatMinutes(record.grantMinutes) }}
          </template>
          <template v-else-if="column.key === 'myUsedMinutes'">
            {{ formatMinutes(record.myUsedMinutes) }}
          </template>
          <template v-else-if="column.key === 'remain'">
            <div class="remain-cell">
              <span class="remain-text">{{ formatMinutes(record.remainMinutes) }}</span>
              <a-progress
                :percent="usedPercent(record.grantMinutes, record.myUsedMinutes)"
                size="small"
                :show-info="false"
                :stroke-color="usedPercent(record.grantMinutes, record.myUsedMinutes) >= 100 ? '#DC2626' : undefined" />
            </div>
          </template>
          <template v-else-if="column.key === 'expireTime'">
            {{ record.expireTime ? parseTime(record.expireTime) : t('不过期') }}
          </template>
          <template v-else-if="column.key === 'state'">
            <a-tag :color="stateColor(record.state)">{{ t(stateText(record.state)) }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>

    <!--
      本班排课额度：上面那份是个人的账，这一份是全班共用的一份额度，两个不是一个主体。
      只给「本期各包还剩多少」，不给按课明细——谁上了哪节课、课上跑了多少分钟是老师与
      管理员要看的东西，学生只需要知道自己上课用的机有没有额度兜底。
    -->
    <a-card v-if="classPackageRows.length" :bordered="false" class="section-card">
      <template #title>
        <a-space :size="8">
          <span class="card-title">{{ t('本班排课额度') }}</span>
          <span class="card-sub">{{ t('上课用的机扣的是这一份，与上面「我的时长包」不是一份账') }}</span>
        </a-space>
      </template>
      <template #extra>
        <a-tooltip :title="classQuota?.usageScopeHint">
          <a-tag :bordered="false" color="purple">{{ t(scopeName('class_course')) }}</a-tag>
        </a-tooltip>
      </template>

      <a-table
        :columns="classPackageColumns"
        :data-source="classPackageRows"
        :pagination="false"
        :loading="classLoading"
        row-key="rowKey"
        size="small"
        :scroll="{ x: 'max-content' }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'resourceTypeName'">
            <a-tag :bordered="false" :color="poolColor(record.resourceType)">{{ record.resourceTypeName }}</a-tag>
          </template>
          <template v-else-if="column.key === 'grantMinutes'">
            {{ formatMinutes(record.grantMinutes) }}
          </template>
          <template v-else-if="column.key === 'usedMinutes'">
            {{ formatMinutes(record.usedMinutes) }}
          </template>
          <template v-else-if="column.key === 'remain'">
            <div class="remain-cell">
              <span class="remain-text">{{ formatMinutes(record.remainMinutes) }}</span>
              <a-progress
                :percent="usedPercent(record.grantMinutes, record.usedMinutes)"
                size="small"
                :show-info="false"
                :stroke-color="usedPercent(record.grantMinutes, record.usedMinutes) >= 100 ? '#DC2626' : undefined" />
            </div>
          </template>
          <template v-else-if="column.key === 'running'">
            <!-- 与老师端班级额度页同一列同一口径：未释放的计量行，台数 + 去重人数，实时事实不是账 -->
            <a-tooltip :title="t('这是全班实时的在用机器数与开机人数，不占用你个人的额度；下课释放后归零')">
              <a-tag v-if="record.runningInstances > 0" color="success">{{ t('{n} 台 / {m} 人', { n: record.runningInstances, m: record.runningUsers }) }}</a-tag>
              <span v-else class="cell-sub">{{ t('空闲') }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'courseCount'">
            {{ record.courseCount || 0 }} {{ t('节') }}
          </template>
          <template v-else-if="column.key === 'resetPeriod'">
            <a-tooltip :title="classPeriodTip(record)">
              <a-tag :bordered="false" :color="periodColor(record.resetPeriod)">{{ record.resetPeriodName || t(periodName(record.resetPeriod)) }}</a-tag>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'expireTime'">
            {{ record.expireTime ? parseTime(record.expireTime) : t('不过期') }}
          </template>
        </template>
      </a-table>

      <!-- 两句必须当面说的：这是全班的而不是你的；花完了上课照样能开机，但得老师去补 -->
      <div class="class-quota-tip">
        {{ t('这一份额度由全班共用，按课表时间计（课一结束就扣，不看你机器实际开了多久），不占用你个人的剩余时长；') }}
        {{ t('就算显示 0 也不会影响上课开机，需要补额度请联系老师。') }}
      </div>
    </a-card>

    <!-- 使用记录：逐实例一行，含已释放的历史实例 -->
    <a-card :bordered="false" class="section-card">
      <template #title>
        <a-space :size="8">
          <span class="card-title">{{ t('使用记录') }}</span>
          <span class="card-sub">{{ t('共 {n} 个实例', { n: total }) }}</span>
        </a-space>
      </template>

      <div class="record-filter">
        <a-space wrap>
          <a-select
            v-model:value="queryParams.resourceType"
            :options="poolOptions"
            :placeholder="t('额度池')"
            allow-clear
            style="width: 140px"
            @change="handleQuery" />
          <a-select
            v-model:value="usageKind"
            :options="usageKindOptions"
            :placeholder="t('用途')"
            allow-clear
            style="width: 150px"
            @change="handleUsageKindChange" />
          <a-select
            v-model:value="queryParams.isClosed"
            :options="statusOptions"
            :placeholder="t('状态')"
            allow-clear
            style="width: 120px"
            @change="handleQuery" />
          <a-button @click="resetQuery">
            <template #icon><ClearOutlined /></template>
            {{ t('重置') }}
          </a-button>
        </a-space>
      </div>

      <a-table
        :columns="recordColumns"
        :data-source="recordList"
        :loading="recordLoading"
        :pagination="false"
        row-key="meteringId"
        size="middle"
        :scroll="{ x: 'max-content' }"
        :locale="{ emptyText: t('还没有使用记录，创建过一次用机就会出现在这里') }">
        <template #bodyCell="{ column, record }">
          <!-- 「累计使用」这一列必须说清口径：同一个实例反复开关机会沿用这一行继续累加，
               所以它可能大于「开始计量」到现在的时长，不写清楚会被读成「连续跑了这么多小时」 -->
          <template v-if="column.key === 'meteredMinutes'">
            <a-tooltip :title="t('这个实例从开始计量起累计的运行时长（关机期间不计）。同一个实例反复开关机会沿用这一行继续累加，所以它可能大于从「开始计量」到现在的时长。')">
              <div class="used-cell">
                <span class="used-text">{{ formatMinutes(record.meteredMinutes) }}</span>
                <span class="used-hours">{{ minutesToHours(record.meteredMinutes) }} {{ t('小时') }}</span>
              </div>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'instanceName'">
            <a-tooltip :title="t('实例ID：{id}', { id: record.instanceId })">
              <span class="instance-name">{{ record.instanceName || t('未命名实例') }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'resourceType'">
            <a-tag :bordered="false" :color="poolColor(record.resourceType)">{{ record.resourceTypeName }}</a-tag>
          </template>
          <template v-else-if="column.key === 'sourceScope'">
            <!-- 用途 = 来路（个人用机 / 课程用机）+ 排课归属档：课程用机再分成
                 班级用机与个人排课用机两档，否则看不出哪几节课花的是本班的额度。
                 没带档的历史行不归进任一档，只显成灰色的「课程用机」 -->
            <a-tooltip :title="usageTip(record.sourceScope, record.scheduleType)">
              <span :style="{ color: usageColor(record.sourceScope, record.scheduleType) }">
                {{ t(usageName(record.sourceScope, record.scheduleType)) }}
              </span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'isClosed'">
            <a-tag :color="record.isClosed === 0 ? 'processing' : 'default'">
              {{ record.isClosed === 0 ? t('计量中') : t('已结束') }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'lastMeterTime'">
            {{ record.lastMeterTime ? fmtTime(record.lastMeterTime) : '-' }}
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ record.createTime ? fmtTime(record.createTime) : '-' }}
          </template>
        </template>
      </a-table>

      <div class="pagination-wrapper" v-if="total > 0">
        <!-- 不直接写 @change="getList"：分页会把页码当第一个参数传进来，接住就变成 silent 了 -->
        <a-pagination
          :total="total"
          v-model:current="queryParams.pageNum"
          v-model:pageSize="queryParams.pageSize"
          show-size-changer
          show-quick-jumper
          :show-total="(n) => t('共 {n} 条', { n })"
          @change="() => getList()" />
      </div>
    </a-card>
  </div>
</template>

<script setup>
/**
 * 学生端「我的资源」：额度多少、用了多少、还剩多少、历史上都用在哪些实例上。
 * <p>
 * 数据只有两个来源，都不接受外部 userId —— myQuota 与 myUsageHistory 一律按当前登录人取行，
 * 所以这一页天生不可能看到别人的数据。额度是【每人一份】口径：卡片上的已用与剩余
 * 都是我自己的，不是时长包上的全员累计。
 * <p>
 * 「额度内已用」和「累计运行」是两个不同概念，故意分行显示：前者只包含被时长包扣掉的分钟，
 * 后者来自计量表按个人用机 / 课程用机拆分的全量运行分钟（配额开关关闭期间的运行也照样在跑表里）。
 * <p>
 * 统计窗口（近一天~近一年）与两个管理员用量页共用一套件：同一个档位清单、同一段口径算法。
 * 数据只多一个 myUsageDaily，它与 myQuota/myUsageHistory 同一口径：只认登录人，不接 userId。
 * <p>
 * 本页接了 3 分钟一轮的定时刷新（与教师「班级用量」页共用 useAutoRefresh 那一份实现）：
 * 本期已用与实例的已计费分钟都是计量任务每分钟在累的数，不能停在打开那一刻。
 * 定时那一轮走静默模式不闪遮罩，只有人亲手点刷新才亮 loading。
 */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ReloadOutlined, ClearOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { parseTime } from '@/utils/aigc'
import { getMyQuota, getMyClassQuota, getMyUsageHistory, getMyUsageDaily } from '@/api/kube/resourceAllocation'
// 换算与配色和配额管理页同源，避免两处各写一套「时长怎么显示、状态什么颜色」
import { formatMinutes, minutesToHours, poolColor, usedPercent, stateColor, stateText, scopeColor, scopeName, periodColor, periodName, isResettable, usageName, usageColor, usageTip } from '@/views/manager/kube/quota/quotaUtils'
import UsageWindowSelect from '@/views/manager/kube/quota/usageWindowSelect.vue'
import UsageTrendChart from '@/views/manager/kube/quota/usageTrendChart.vue'
import { useAutoRefresh, autoRefreshHint } from '@/views/manager/kube/quota/autoRefresh'
import { useUsageWindow } from '@/views/manager/kube/quota/usageWindow'

const TARGET_LABEL = { role: '角色包', class: '班级包', user: '个人包' }

const quotas = ref([])
const quotaLoading = ref(false)
/** 错误态标记：取不到额度时给「加载失败 + 重试」，与「确实没有包」分开 */
const quotaError = ref(false)
// 本班排课额度：与个人额度不是一份账，单独一个请求、单独一个 loading
const classQuota = ref(null)
const classLoading = ref(false)
const recordList = ref([])
const recordLoading = ref(false)
const total = ref(0)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  resourceType: undefined,
  sourceScope: undefined,
  // 排课归属档（1 个人排课 / 2 班级排课），与 sourceScope 合成「用途」那一个下拉
  scheduleType: undefined,
  isClosed: undefined
})

const {
  days: windowDays,
  meta: windowMeta,
  optionsLoading,
  windowOptions,
  windowLabel,
  windowHint,
  loadOptions,
  setMeta
} = useUsageWindow()

const dailySeries = ref([])
const dailyLoading = ref(false)
let dailySeq = 0

/** 池 code → 中文名，沿用额度里那几个名字，不给图多一个请求 */
const poolNameMap = computed(() => {
  const map = {}
  for (const quota of quotas.value) {
    if (quota.resourceType) {
      map[quota.resourceType] = quota.resourceTypeName || quota.resourceType
    }
  }
  return map
})

const quotaEnabled = computed(() => quotas.value.some((q) => q.quotaEnabled))

/**
 * 只保留真的分到（或配过）额度的池：没分配的池直接不出现在页面上。
 * <p>
 * 判据是 packages 非空：后端 candidatePackages 已经把过期、未生效、停用的包滤掉了，
 * 所以这里的「有包」等于「此刻有个能用的包」。被禁用的池例外保留 ——
 * 禁用与有没有包无关，藏掉卡片就等于藏掉了「你为什么被拦」的唯一说明。
 */
const allocQuotas = computed(() =>
  quotas.value.filter((q) => (q.packages || []).length > 0 || q.banned)
)

/** 无包时可用的解释：开关开和关是两种结论，不能写成一回事 */
const noAllocTip = computed(() => {
  if (!quotaEnabled.value) {
    return t('当前没有为你分配时长包，且时长额度尚未开放 —— 用机不受时长限制，下方使用记录照常统计。')
  }
  return t('当前没有可用的时长包（尚未分配，或已到期/已停用），新建用机会被拦截，请联系老师或管理员分配。')
})

// 额度池下拉直接由配额数据生成，前端不再硬编码池清单。
// 这里有意用全量 quotas 而不是 allocQuotas：筛的是使用记录，
// 没分包但历史上真的跑过实例的池也要能筛出来，否则那段记录就查不到了。
const poolOptions = computed(() =>
  quotas.value.map((q) => ({ label: q.resourceTypeName, value: q.resourceType }))
)

/**
 * 用途筛选：课程用机按【排课归属档】再分成班级用机 / 个人排课用机两档。
 * 四个名字全部取自 usageName()，与表格里那一列同一个出处，不会筛选项叫一套、列里叫另一套。
 * <p>
 * 「课程用机（全部）」这一项有意保留且不筛档：档上线前跑的那些行 schedule_type 为空，
 * 筛任一档都不命中它们，去掉这一项就等于把那批历史记录查不出来了。
 */
const usageKindOptions = computed(() => [
  { label: t(usageName('private')), value: 'private', sourceScope: 'private', scheduleType: undefined },
  { label: `${t(usageName('course'))}${t('（全部）')}`, value: 'course', sourceScope: 'course', scheduleType: undefined },
  { label: t(usageName('course', '2')), value: 'class', sourceScope: 'course', scheduleType: '2' },
  { label: t(usageName('course', '1')), value: 'personal', sourceScope: 'course', scheduleType: '1' }
])

const usageKind = ref(undefined)

/** 一个下拉同时定两个参数：清掉（allow-clear）时两个一起回到不筛 */
function handleUsageKindChange(value) {
  const kind = usageKindOptions.value.find((o) => o.value === value)
  queryParams.sourceScope = kind ? kind.sourceScope : undefined
  queryParams.scheduleType = kind ? kind.scheduleType : undefined
  handleQuery()
}

const statusOptions = computed(() => [
  { label: t('计量中'), value: 0 },
  { label: t('已结束'), value: 1 }
])

const packageColumns = computed(() => [
  { title: t('额度池'), key: 'resourceTypeName', dataIndex: 'resourceTypeName' },
  { title: t('发放给'), key: 'targetType', dataIndex: 'targetType' },
  { title: t('适用范围'), key: 'usageScope', dataIndex: 'usageScope' },
  { title: t('额度重置'), key: 'resetPeriod', dataIndex: 'resetPeriod' },
  { title: t('每人授予'), key: 'grantMinutes', dataIndex: 'grantMinutes' },
  { title: t('我已用'), key: 'myUsedMinutes', dataIndex: 'myUsedMinutes' },
  { title: t('我的剩余'), key: 'remain', dataIndex: 'remainMinutes' },
  { title: t('有效期至'), key: 'expireTime', dataIndex: 'expireTime' },
  { title: t('状态'), key: 'state', dataIndex: 'state' }
])

/**
 * 本班排课包表头。
 * <p>
 * 与上面「我的时长包」差三列：班级包没有「发放给」（清一色是本班）、没有「适用范围」
 * （全是班级排课用机，卡片头那个标签已经说了）、也不能给「我已用」—— 这一份账是按课墙钟
 * 扣全班的，落到个人头上没有归属，硬拆只会让人以为自己能花这份额度。
 */
const classPackageColumns = computed(() => [
  { title: t('额度池'), key: 'resourceTypeName', dataIndex: 'resourceTypeName' },
  { title: t('本期授予'), key: 'grantMinutes', dataIndex: 'grantMinutes' },
  { title: t('本期已占'), key: 'usedMinutes', dataIndex: 'usedMinutes' },
  { title: t('本期剩余'), key: 'remain', dataIndex: 'remainMinutes' },
  { title: t('正在使用'), key: 'running', dataIndex: 'runningInstances' },
  { title: t('本期课次'), key: 'courseCount', dataIndex: 'courseCount' },
  { title: t('额度重置'), key: 'resetPeriod', dataIndex: 'resetPeriod' },
  { title: t('有效期至'), key: 'expireTime', dataIndex: 'expireTime' }
])

const recordColumns = computed(() => [
  { title: t('实例'), key: 'instanceName', dataIndex: 'instanceName' },
  { title: t('额度池'), key: 'resourceType', dataIndex: 'resourceType' },
  { title: t('用途'), key: 'sourceScope', dataIndex: 'sourceScope' },
  { title: t('累计使用'), key: 'meteredMinutes', dataIndex: 'meteredMinutes' },
  { title: t('状态'), key: 'isClosed', dataIndex: 'isClosed' },
  { title: t('最近计费'), key: 'lastMeterTime', dataIndex: 'lastMeterTime' },
  { title: t('开始计量'), key: 'createTime', dataIndex: 'createTime' }
])

/** 时长包摊平成一页表格，池名与配色沿用卡片那套；只取有包的池，与卡片同一口径 */
const packageRows = computed(() => {
  const rows = []
  for (const quota of allocQuotas.value) {
    for (const pkg of quota.packages || []) {
      rows.push({
        ...pkg,
        resourceTypeName: quota.resourceTypeName,
        rowKey: pkg.allocationId
      })
    }
  }
  return rows
})

/**
 * 本班排课包。池名直接用后端随包给的 resourceTypeName：
 * 学生手上没有池清单接口（那个在管理员权限键下），少一个请求就少一处可能算歪的地方。
 */
const classPackageRows = computed(() =>
  (classQuota.value?.packages || []).map((pkg) => ({
    ...pkg,
    rowKey: `${pkg.allocationId}-${pkg.periodKey}`
  }))
)

function fmtTime(time) {
  // 统一交给 parseTime：后端有的字段是 @JsonFormat 字符串、有的是 createTime 那种时间戳，
  // 自己 slice 只会在这两种格式之间飘
  return time ? parseTime(time, '{y}-{m}-{d} {h}:{i}') : '-'
}

/** 剩余那个大数字下面的说明：没配包和真用完了是两回事，不能都说成「已用完」 */
function remainLabel(quota) {
  if (quota.banned) {
    return { text: t('已被禁用'), warn: true }
  }
  if (!quota.grantMinutes) {
    return { text: t('暂无时长包'), warn: false }
  }
  // 包还在但都不适用于个人新建：这不是「用完」，等额度重置也等不来，要说清差别
  if (quota.quotaEnabled && quota.remainMinutes > 0 && !(quota.privateRemainMinutes > 0)) {
    return { text: t('现有时长包不适用于个人新建'), warn: true }
  }
  if (quota.quotaEnabled && quota.remainMinutes <= 0) {
    return { text: t('额度已用完'), warn: true }
  }
  return { text: t('剩余可用'), warn: false }
}

/** 时长包列表里「适用范围」的一句话解释 */
function scopeTip(scope) {
  if (scope === 'private') return t('只供你自己新建的实例扣用，排课下发扣不到它')
  if (scope === 'course') return t('只供上课排课下发的实例扣用，你自己新建用不了')
  return t('个人新建与排课下发都能扣这个包')
}

/**
 * 配对行的 tooltip：一行说清两个数的口径，再只留那一个真正不可加的点和一个读法提示。
 * 与卡片上方同一本账：已用是从该档能扣的包里扣掉的本期分钟，剩余是那些包还能扣的；
 * 由班级排课额度承担的上课运行不进这两行（它不扣自己包，在本页下方的班级额度卡片里）。
 */
const scopePairTip = computed(() =>
  t('两行都是【本期】的账，与上方「额度内已用 / 剩余可用」同一本账：已用是从该档能扣的时长包里扣掉的本期分钟，剩余是那些包还能扣的。')
  + t('读法：每档已用 + 该档剩余 = 该档能扣的额度，所以某档显 0 而合计有数，多半是没有适用那一档的包。'))

/**
 * 班级包「额度重置」的解释。
 * <p>
 * 不复用上面的 periodTip：班级包这里没有 nextResetTime（那个字段属于个人包的周期推算），
 * 说错一次「下一次什么时候恢复」比不说更糟。
 */
function classPeriodTip(pkg) {
  if (!isResettable(pkg.resetPeriod)) {
    return t('这个包不重置：本期用完就不再恢复，要补额度得联系老师重新发包')
  }
  // 班级包按周期重发的是【全班共用的一份】，不是每人一份，这句话必须说
  return t('{period}重发一次，重发的是全班共用的这一份', { period: pkg.resetPeriodName || t(periodName(pkg.resetPeriod)) })
}

/**
 * 「额度重置」列的一句话解释。
 * <p>
 * 下次重置时刻直接用后端随包给的 nextResetTime，不在前端再算一遍周期：
 * 周首日、闰月、时区这些坑已经在枚举里踩过一次，两处各算必飘。
 */
function periodTip(pkg) {
  if (!isResettable(pkg.resetPeriod)) {
    return t('这个包的额度不重置：你剩余的用完就不会再恢复，得等老师再发包')
  }
  const name = t(periodName(pkg.resetPeriod))
  return pkg.nextResetTime
    ? t('{name}重发一次，下一次：{time}', { name, time: parseTime(pkg.nextResetTime) })
    : t('{name}重发一次，本期没用完的不结转', { name })
}

function banTip(quota) {
  const until = quota.banExpireTime ? fmtTime(quota.banExpireTime) : t('永久')
  return t('{reason}（解除时间：{until}）', { reason: quota.banReason || t('已被管理员禁用'), until })
}

/** 点卡片筛该池的记录，再点一次取消筛选 */
function filterByPool(resourceType) {
  queryParams.resourceType = queryParams.resourceType === resourceType ? undefined : resourceType
  handleQuery()
}

/**
 * @param silent 定时刷新走 true：不亮这一块的遮罩。每 3 分钟闪一次比数字自己变了更让人不安；
 *               静默那一轮也不要去把 loading 置回 false，那会把手点那一轮的遮罩提前关掉。
 */
function loadQuota(silent = false) {
  if (!silent) {
    quotaLoading.value = true
  }
  return getMyQuota()
    .then((res) => {
      quotas.value = res.data || []
      quotaError.value = false
    })
    .catch((err) => {
      console.error('获取我的额度失败:', err)
      quotas.value = []
      quotaError.value = true
    })
    .finally(() => {
      if (!silent) {
        quotaLoading.value = false
      }
    })
}

/**
 * 本班排课额度。
 * <p>
 * 失败静默成 null 而不是报错弹窗：学生可能根本不在任何班里，那是正常状态，
 * 不是出错了；卡片按「有没有包」显示，没读到一个字都不会出现。
 */
function loadClassQuota(silent = false) {
  if (!silent) {
    classLoading.value = true
  }
  return getMyClassQuota()
    .then((res) => {
      classQuota.value = res.data || null
    })
    .catch((err) => {
      console.error('获取本班排课额度失败:', err)
      classQuota.value = null
    })
    .finally(() => {
      if (!silent) {
        classLoading.value = false
      }
    })
}

function getList(silent = false) {
  if (!silent) {
    recordLoading.value = true
  }
  return getMyUsageHistory(queryParams)
    .then((response) => {
      recordList.value = response.rows || []
      total.value = response.total || 0
    })
    .catch((err) => {
      console.error('获取使用记录失败:', err)
      recordList.value = []
    })
    .finally(() => {
      if (!silent) {
        recordLoading.value = false
      }
    })
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  queryParams.resourceType = undefined
  queryParams.sourceScope = undefined
  queryParams.scheduleType = undefined
  queryParams.isClosed = undefined
  usageKind.value = undefined
  handleQuery()
}

/**
 * 四块一起重取。定时那一轮传 silent=true。
 * 返回四个 Promise 是为了给 useAutoRefresh 做「上一轮没落地就不叠下一轮」的判据。
 * 分页与筛选参数都在 queryParams 上，定时刷新不会把人翻到的那一页拍回第一页。
 */
function loadAll(silent = false) {
  return Promise.all([loadQuota(silent), loadClassQuota(silent), getList(silent), loadDaily(silent)])
}

/**
 * 取自己窗口内的日粒度消耗。
 * <p>
 * 不接外部 userId：后端只认登录人，所以这一页天生不会看到别人的数。
 * 序号守卫：换窗口与点刷新都会重取，慢的那一次不该盖住新的一次。
 */
function loadDaily(silent = false) {
  const seq = ++dailySeq
  if (!windowDays.value) {
    dailySeries.value = []
    setMeta(null)
    return
  }
  if (!silent) {
    dailyLoading.value = true
  }
  // 要 return：不返回的话 loadAll 的 Promise.all 等不到这一轮，定时刷新就会叠着打
  return getMyUsageDaily(windowDays.value)
    .then((res) => {
      if (seq !== dailySeq) {
        return
      }
      setMeta(res.data || null)
      dailySeries.value = res.data?.series || []
    })
    .catch((err) => {
      if (seq !== dailySeq) {
        return
      }
      console.error('获取我的日粒度消耗失败:', err)
      dailySeries.value = []
    })
    .finally(() => {
      if (seq === dailySeq && !silent) {
        dailyLoading.value = false
      }
    })
}

// 换窗口只需重取这一块，上面的额度与实例记录与窗口无关
// 必须包一层箭头：直接写 loadDaily 会把新的天数传成第一个参数，接住就变成 silent 了
watch(windowDays, () => loadDaily())

// 定时那一轮静默重取四块；上一轮没落地时 hook 自己会跳过，不叠请求
const { restart: restartAutoRefresh } = useAutoRefresh(() => loadAll(true))

/**
 * 手点刷新：亮遮罩，并把定时器归零重计。
 * 不归零就会出现「刚手点完一秒又被定时刷一轮」，两轮同时改同一批数据。
 */
function handleRefresh() {
  loadAll()
  restartAutoRefresh()
}

onMounted(() => {
  loadOptions()
  loadAll()
})
</script>

<style scoped>
.my-resource {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-card {
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}

.section-card :deep(.ant-card-head) {
  min-height: 44px;
  border-bottom: 1px solid var(--line-3);
}

.card-title {
  font-weight: 600;
  color: var(--ink);
}

.card-sub {
  font-size: 12px;
  color: var(--ink-3);
}

/* 统计窗口那一块：没选窗口时只说一句提示，不画一个贴零的假图 */
.window-none {
  padding: 8px 0;
  font-size: 13px;
  color: var(--ink-3);
}

.pool-card {
  height: 100%;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  cursor: pointer;
  transition: border-color .18s, box-shadow .18s;
}

/* 只改边框与阴影，不改位移：hover 抬升会造成 CLS */
.pool-card:hover {
  border-color: var(--pri-200);
  box-shadow: var(--sh-2);
}

.pool-card:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}

.pool-card-active {
  border-color: var(--pri);
  background: var(--pri-50);
}

.pool-head {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pool-running {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-3);
}

.pool-remain {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 10px 0 2px;
}

.pool-remain-value {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--ink);
}

.pool-remain-label {
  font-size: 12px;
  color: var(--ink-3);
}

.pool-remain-label.is-warn {
  color: var(--danger);
}

.pool-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ink-2);
}

.pool-meta.pool-meta-actual {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--line-3);
  color: var(--ink-3);
}

.pool-meta.pool-meta-scope {
  margin-top: 6px;
  color: var(--ink-3);
}

.pool-expire {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ink-3);
}

.quota-empty {
  margin-bottom: 4px;
}

.record-filter {
  margin-bottom: 12px;
}

.instance-name {
  word-break: break-all;
}

.used-cell {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.used-text {
  font-weight: 500;
}

.used-hours {
  font-size: 12px;
  color: var(--ink-3);
}

.pkg-target {
  color: var(--ink-3);
  margin-right: 6px;
}

.pkg-target-name {
  word-break: break-all;
}

.remain-cell {
  min-width: 120px;
}

.remain-text {
  font-weight: 500;
}

/* 「空闲」的次要文字，与老师端班级额度页同款 */
.cell-sub {
  color: var(--ink-3);
  font-size: 12px;
}

/* 本班额度卡底下那两句口径说明：字号比表格小一档，但不能淡到没人看 */
.class-quota-tip {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--ink-3);
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
