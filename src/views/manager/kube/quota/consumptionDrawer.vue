<template>
  <a-drawer
    :open="open"
    :title="t('资源消耗明细')"
    placement="right"
    width="95%"
    :destroy-on-close="true"
    @update:open="(v) => emit('update:open', v)"
  >
    <a-spin :spinning="loading">
      <div v-if="detail">
        <a-descriptions :column="4" size="small" bordered class="head-desc">
          <a-descriptions-item :label="t('用户')">
            {{ detail.nickName || '-' }}（{{ detail.userName || '-' }}）
          </a-descriptions-item>
          <a-descriptions-item :label="t('班级')">{{ detail.className || t('未分班') }}</a-descriptions-item>
          <a-descriptions-item :label="t('用户ID')">{{ detail.userId }}</a-descriptions-item>
          <a-descriptions-item :label="t('配额开关')">
            <a-tag :color="quotaEnabled ? 'success' : 'warning'">
              {{ quotaEnabled ? t('时长配额已生效') : t('时长配额未生效（当前只判禁用）') }}
            </a-tag>
          </a-descriptions-item>
          <!-- 累计实际运行的总计：下面每张池卡各自有一对分来源数字，
               但老师点开抽屉问的第一句是「这个人一共用了多久」，那得是一个数 -->
          <a-descriptions-item :label="t('累计实际运行')">
            <a-tooltip :title="consumedTip">
              <span>{{ t('共') }} {{ formatMinutes(consumedTotal.private + consumedTotal.course) }}</span>
              <span class="consumed-sub">（{{ t('个人') }} {{ formatMinutes(consumedTotal.private) }} · {{ t('课程') }} {{ formatMinutes(consumedTotal.course) }}）</span>
            </a-tooltip>
          </a-descriptions-item>
          <!-- 课程消耗里只有一部分走的是本班这套账，老师真正要的那个数单独摆一项，
               不挤在上面那项的括号里：那个括号已经三个数了 -->
          <a-descriptions-item :label="t('其中班级排课')">
            <a-tooltip :title="classConsumedTip">
              {{ formatMinutes(consumedTotal.class) }}
            </a-tooltip>
          </a-descriptions-item>
          <!-- 两档分开放而不是只放班级那一档：只摆一个数，看的人就会把「没进班级账」
               当成「没怎么用」，而那部分其实全在他自己的排课额度上 -->
          <a-descriptions-item :label="t('其中个人排课')">
            <a-tooltip :title="personalArrangeTip">
              {{ formatMinutes(consumedTotal.personalArrange) }}
            </a-tooltip>
          </a-descriptions-item>
        </a-descriptions>

        <a-alert
          v-if="quotaEnabled && shownQuotas.length"
          type="info"
          show-icon
          class="merge-tip"
          :message="t('同一个池里的包按「适用范围」分档：仅个人用机 / 个人排课，另有可能碰到存量的「两种都用」（已停用，两类实例都能扣，所以它会把可用量同时计到下面两行里，两行之和因此大于合计——不是重复计费）。个人消耗与课程消耗则是按计量行真劈开的账。发给班级的「班级排课额度」不在这个池里：它记在班级头上、按排课墙钟扣，看它要去班级用量页。')"
        />

        <!-- 只展开分到包的池，被禁用的池例外保留（判据与学生页 allocQuotas 同一条）；
             禁用与剩余额度都是按池分别生效的 -->
        <a-card
          v-for="quota in shownQuotas"
          :key="quota.resourceType"
          size="small"
          class="pool-card"
          :title="quota.resourceTypeName"
        >
          <template #extra>
            <a-tag v-if="quota.banned" color="error">
              {{ t('已禁用') }}{{ quota.banReason ? '：' + quota.banReason : '' }}
            </a-tag>
            <a-tag v-else color="success">{{ t('未禁用') }}</a-tag>
          </template>

          <a-descriptions :column="3" size="small" bordered>
            <a-descriptions-item :label="t('我可用总额')">{{ formatMinutes(quota.grantMinutes) }}</a-descriptions-item>
            <a-descriptions-item :label="t('我已用')">{{ formatMinutes(quota.usedMinutes) }}</a-descriptions-item>
            <a-descriptions-item :label="t('我剩余')">
              <span :class="quota.remainMinutes > 0 ? 'remain-ok' : 'remain-zero'">
                {{ formatMinutes(quota.remainMinutes) }}
              </span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('个人用机消耗')">
              <a-tooltip :title="consumedTip">{{ formatMinutes(quota.privateConsumedMinutes) }}</a-tooltip>
            </a-descriptions-item>
            <a-descriptions-item :label="t('课程用机消耗')">
              <a-tooltip :title="consumedTip">{{ formatMinutes(quota.courseConsumedMinutes) }}</a-tooltip>
            </a-descriptions-item>
            <a-descriptions-item :label="t('班级排课用量')">
              <a-tooltip :title="classConsumedTip">{{ formatMinutes(quota.classConsumedMinutes) }}</a-tooltip>
            </a-descriptions-item>
            <a-descriptions-item :label="t('个人排课用量')">
              <a-tooltip :title="personalArrangeTip">{{ formatMinutes(quota.personalArrangeConsumedMinutes) }}</a-tooltip>
            </a-descriptions-item>
            <a-descriptions-item :label="t('正在计量实例')">{{ t('{n} 个', { n: quota.runningInstances }) }}</a-descriptions-item>
            <a-descriptions-item :label="t('个人用机可扣')">
              {{ formatMinutes(quota.privateGrantMinutes) }}，{{ t('已用') }} {{ formatMinutes(quota.privateUsedMinutes) }}，
              {{ t('剩') }} <span :class="quota.privateRemainMinutes > 0 ? 'remain-ok' : 'remain-zero'">{{ formatMinutes(quota.privateRemainMinutes) }}</span>
            </a-descriptions-item>
            <a-descriptions-item :label="t('个人排课可扣')">
              {{ formatMinutes(quota.courseGrantMinutes) }}，{{ t('已用') }} {{ formatMinutes(quota.courseUsedMinutes) }}，
              {{ t('剩') }} <span :class="quota.courseRemainMinutes > 0 ? 'remain-ok' : 'remain-zero'">{{ formatMinutes(quota.courseRemainMinutes) }}</span>
            </a-descriptions-item>
          </a-descriptions>

          <div class="block-title">{{ t('支撑该用户剩余额度的时长包（额度每人一份，下面的已用/剩余都是这个人的【本期】账，不是包的全员累计；扣减顺序先到期先扣。配了重置周期的包，已用一到下一个周期就归零重发）') }}</div>
          <a-table
            :columns="packageColumns"
            :data-source="quota.packages"
            :pagination="false"
            row-key="allocationId"
            size="small"
            :scroll="{ x: 'max-content' }"
            :empty-text="t('当前没有可用时长包')"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'target'">
                <a-tag :color="poolColor(record.resourceType)">{{ record.targetTypeName }}</a-tag>
                {{ record.targetName || record.targetId }}
              </template>
              <template v-else-if="column.key === 'usageScope'">
                <a-tag :color="scopeColor(record.usageScope)">{{ t(scopeName(record.usageScope)) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'resetPeriod'">
                <a-tooltip :title="periodTip(record)">
                  <a-tag :color="periodColor(record.resetPeriod)">{{ t(periodName(record.resetPeriod)) }}</a-tag>
                </a-tooltip>
              </template>
              <template v-else-if="column.key === 'grantHours'">{{ minutesToHours(record.grantMinutes) }}</template>
              <template v-else-if="column.key === 'usedHours'">{{ minutesToHours(record.myUsedMinutes) }}</template>
              <template v-else-if="column.key === 'remain'">
                {{ formatMinutes(record.remainMinutes) }}
              </template>
              <template v-else-if="column.key === 'expireTime'">
                <!-- 时长包的到期时间为空只意味着「不过期」，额度用不完也不会自己重发，
                     会不会重发看前面的「额度重置」列 -->
                <span>{{ record.expireTime ? parseTime(record.expireTime) : t('不过期') }}</span>
              </template>
              <template v-else-if="column.key === 'state'">
                <a-tag :color="stateColor(record.state)">{{ t(stateText(record.state)) }}</a-tag>
              </template>
            </template>
          </a-table>

          <div class="block-title">{{ t('正在计量的实例') }}</div>
          <a-table
            :columns="instanceColumns"
            :data-source="quota.instances"
            :pagination="false"
            row-key="meteringId"
            size="small"
            :scroll="{ x: 'max-content' }"
            :empty-text="t('没有正在计量的实例')"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'sourceScope'">
                <!-- 与「我的资源」页那一列同一口径：课程用机再按排课归属档分成两档 -->
                <a-tooltip :title="usageTip(record.sourceScope, record.scheduleType)">
                  <a-tag :color="usageTag(record.sourceScope, record.scheduleType)">
                    {{ t(usageName(record.sourceScope, record.scheduleType)) }}
                  </a-tag>
                </a-tooltip>
              </template>
              <template v-else-if="column.key === 'meteredMinutes'">
                {{ formatMinutes(record.meteredMinutes) }}
              </template>
              <template v-else-if="column.key === 'createTime'">
                {{ record.createTime ? parseTime(record.createTime) : '-' }}
              </template>
              <template v-else-if="column.key === 'lastMeterTime'">
                {{ parseTime(record.lastMeterTime) }}
              </template>
            </template>
          </a-table>
        </a-card>

        <!-- 一个池都没分到：不能说“加载失败”，也不能默默空着——
             下面的逐实例计量表和禁用记录照常有用，得解释为何没有额度卡片 -->
        <a-alert
          v-if="detail && shownQuotas.length === 0"
          type="warning"
          show-icon
          class="pool-card"
          :message="quotaEnabled
            ? t('当前没有可用的时长包（尚未分配，或已到期/已停用），新建用机会被拦截；历史消耗见下方实例记录')
            : t('当前没有为他分配时长包；配额开关未开启，用机暂不受时长限制，下方实例记录照常统计')" />

        <a-card size="small" class="pool-card" :title="t('禁用记录（含已解除，供追溯）')">
          <a-table
            :columns="banColumns"
            :data-source="detail.bans"
            :pagination="false"
            row-key="banId"
            size="small"
            :empty-text="t('无禁用记录')"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'resourceType'">
                <a-tag :color="poolColor(record.resourceType)">{{ record.resourceTypeName }}</a-tag>
              </template>
              <template v-else-if="column.key === 'expireTime'">
                {{ record.expireTime ? parseTime(record.expireTime) : t('永久') }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.status === '1' ? 'error' : 'default'">
                  {{ record.status === '1' ? t('生效中') : t('已解除') }}
                </a-tag>
              </template>
            </template>
          </a-table>
        </a-card>
      </div>
      <a-empty v-else-if="!loading" :description="t('暂无数据')" />
    </a-spin>
  </a-drawer>
</template>

<script setup>
/**
 * 消耗明细抽屉：按用户展开各额度池的剩余、各包到期时间、
 * 个人用机与课程用机各耗了多少、以及此刻正在计量的实例。
 * <p>
 * 只展开分到包的池（无包且未被禁用的池不出卡片），与学生自查页同一口径：
 * 报表里多摆一个空池，那格就是 0，看着像「用光了」而其实从没发过。
 * 下方的禁用记录表不过滤，它本身就是含已解除的全量追溯。
 * <p>
 * 合并池语义下课程时长会真实吃掉个人额度，这是已接受的口径 ——
 * 但老师必须看得见，所以这里坚持按 source_scope 分列，不做汇总掩盖。
 * <p>
 * 取数接口由调用方给（fetchDetail）：管理员走自己的 consumptionDetail，
 * 老师走 classUsage/studentDetail —— 后者多了一层「这个人是不是我班的」归属校验、
 * 并把禁用原因抹掉。抽出来而不是复制一份抽屉，是因为这两份数据是同一个结构，
 * 复制一次就得同时维护两张包表与两份周期 tooltip（已经飘过一次了）。
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'
import { parseTime } from '@/utils/aigc'
import { getConsumptionDetail } from '@/api/kube/resourceAllocation'
import { formatMinutes, minutesToHours, stateColor, stateText, poolColor, scopeColor, scopeName, periodColor, periodName, isResettable, usageName, usageTag, usageTip } from './quotaUtils'

const props = defineProps({
  open: { type: Boolean, default: false },
  userId: { type: String, default: '' },
  /** 明细取数函数，签名 (userId) => Promise；不传则用管理员接口 */
  fetchDetail: { type: Function, default: null }
})

const emit = defineEmits(['update:open'])

const detail = ref(null)
const loading = ref(false)

const quotaEnabled = computed(() => (detail.value?.quotas || []).some((q) => q.quotaEnabled))

/**
 * 只展示真的分到时长包的池，判据与学生「我的资源」页的 allocQuotas 逐字一致：
 * 后端 candidatePackages 已滤掉过期/未生效/停用的包，所以「有包」=此刻有个能用的包；
 * 被禁用的池即使无包也保留 —— 藏掉就等于藏掉「为什么被拦」的唯一说明。
 * 在筛选之后才判空：一个池都没分时，空状态说的是「没分到包」而不是「加载失败」。
 */
const shownQuotas = computed(() =>
  (detail.value?.quotas || []).filter((q) => (q.packages || []).length > 0 || q.banned)
)

/**
 * 各池累计实际运行之和。
 * <p>
 * 累加的是全量 quotas 而不是上面筛选后的 shownQuotas：消耗来自计量行，按人×池×来源聚合，
 * 与分没分到包无关——配额开关未开那段也真跑过机，只算有包的池会把那段时间抹掉。
 */
const consumedTotal = computed(() => {
  const acc = { private: 0, course: 0, class: 0, personalArrange: 0 }
  for (const quota of detail.value?.quotas || []) {
    acc.private += Number(quota.privateConsumedMinutes || 0)
    acc.course += Number(quota.courseConsumedMinutes || 0)
    acc.class += Number(quota.classConsumedMinutes || 0)
    acc.personalArrange += Number(quota.personalArrangeConsumedMinutes || 0)
  }
  return acc
})

/**
 * 「班级排课」是课程消耗的一个子集，不是第四份账：按实例上的排课归属档认，
 * 只留档为「班级排课」的那部分。个人排课那一档不算，个人用机新建的实例更不算。
 */
const classConsumedTip = computed(() =>
  t('按实例上的排课归属档算，只认记为「班级排课」的那些（培训计划与教学排课都走这一档），个人排课那一档与个人用机都不算。')
  + t('与班级包被扣的分钟不可对账：包按课扣全班一份墙钟，这一列只记他一个人开了多久。')
  + t('两档加起来可能小于「课程用机消耗」：差额是归档上线前没带档的历史计量行。')
)

/**
 * 「个人排课」最容易被读成「个人用机」，所以第一句先把两者分开：
 * 这一档仍是排课用机，只是记在他自己头上；个人用机是另一本账，在「个人用机消耗」里。
 */
const personalArrangeTip = computed(() =>
  t('按实例上的排课归属档算，只认记为「个人排课」的那些 —— 他自己排的一节课，扣他头上的排课额度，不进班级账。')
  + t('它不是个人用机：个人用机新建的实例在「个人用机消耗」那一项里。')
)

/**
 * 累计运行与「我已用」是两个口径，不说清就会被当成同一个数的两种写法：
 * 前者是计量表里的历史累计事实（不按周期归零），后者是本期从时长包扣掉的分钟。
 * 两个数不相等是正常的：开关未开期间的运行、以及由班级排课额度承担的那部分，
 * 都只进「累计运行」，不进任何人的「已用」。
 */
const consumedTip = computed(() =>
  t('累计实际运行：来自计量行的历史累计，不按额度周期归零；与「我已用」（本期从时长包扣掉的分钟）不是一个口径。')
  + t('课程那部分含由本班「班级排课额度」承担、不从个人包扣的分钟')
)

const packageColumns = computed(() => [
  { title: t('主体'), key: 'target', width: 200 },
  { title: t('适用范围'), key: 'usageScope', width: 120 },
  { title: t('额度重置'), key: 'resetPeriod', width: 110 },
  { title: t('每人授予(小时)'), key: 'grantHours', width: 120 },
  { title: t('我的已用(小时)'), key: 'usedHours', width: 130 },
  { title: t('我的剩余'), key: 'remain', width: 130 },
  { title: t('开始时间'), dataIndex: 'beginTime', width: 170, customRender: ({ text }) => text || t('立即') },
  { title: t('到期时间'), key: 'expireTime', width: 170 },
  { title: t('状态'), key: 'state', width: 100 }
])

/**
 * 周期标签的 tooltip。这里不拉 /resetPeriods（抽屉只为一个用户开一次，
 * 多一个接口不值得）：周期键与后端 KubeResetPeriodEnum 逐字一致，
 * 展示名则复用 quotaUtils 的 PERIOD_META，真加周期时改这一处即可。
 */
const PERIOD_NEXT_TEXT = {
  day: '明天 0 点',
  week: '下周一 0 点',
  month: '下月 1 号 0 点',
  half_year: '下一个上半年/下半年 1 号 0 点',
  year: '明年 1 月 1 日 0 点'
}

function periodTip(record) {
  if (!isResettable(record.resetPeriod)) {
    return t('不重置：这个人在该包上用完就不会再恢复，除非再发一个包')
  }
  const when = record.nextResetTime ? parseTime(record.nextResetTime) : t(PERIOD_NEXT_TEXT[String(record.resetPeriod)] || '')
  return t('每人已用的账{period}重发一次', { period: t(periodName(record.resetPeriod)) }) + (when ? t('，下一次：{time}', { time: when }) : '')
}

const instanceColumns = computed(() => [
  { title: t('实例名称'), dataIndex: 'instanceName', ellipsis: true },
  // 列名从「来源」改成「用途」：这一列现在不只分个人/课程两个来路，还按排课归属档分了两档
  { title: t('用途'), key: 'sourceScope', width: 140 },
  { title: t('来源表'), dataIndex: 'sourceTable', width: 260, ellipsis: true },
  { title: t('累计使用时长'), key: 'meteredMinutes', width: 140 },
  { title: t('开始计量'), key: 'createTime', width: 180 },
  { title: t('已计费到'), key: 'lastMeterTime', width: 180 }
])

const banColumns = computed(() => [
  { title: t('资源池'), key: 'resourceType', width: 160 },
  // 教师侧接口不返回原因（那是管理员之间的备注），空值要有个交代而不是留白
  { title: t('原因'), dataIndex: 'reason', ellipsis: true, customRender: ({ text }) => text || '-' },
  { title: t('开始时间'), dataIndex: 'beginTime', width: 180, customRender: ({ text }) => text || t('立即') },
  { title: t('到期时间'), key: 'expireTime', width: 180 },
  { title: t('状态'), key: 'status', width: 100 },
  { title: t('操作人'), dataIndex: 'createBy', width: 120 },
  { title: t('创建时间'), dataIndex: 'createTime', width: 180 }
])

async function load() {
  if (!props.userId) {
    detail.value = null
    return
  }
  loading.value = true
  try {
    const fetchDetail = props.fetchDetail || getConsumptionDetail
    const res = await fetchDetail(props.userId)
    detail.value = res.data
  } catch (err) {
    console.error('获取消耗明细失败:', err)
    message.error(t('获取消耗明细失败：{msg}', { msg: err.message || err }))
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.open, props.userId],
  ([isOpen]) => {
    if (isOpen) {
      load()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.head-desc {
  margin-bottom: 16px;
}

.merge-tip {
  margin-bottom: 16px;
}

.pool-card {
  margin-bottom: 16px;
}

.block-title {
  margin: 16px 0 8px;
  font-weight: 600;
  color: var(--ink-2);
}

.remain-ok {
  color: var(--ok);
  font-weight: 600;
}

.remain-zero {
  color: var(--danger);
  font-weight: 600;
}

/* 总计后面括号里的个人/课程拆分：主数字是「一共多久」，拆分是次要信息 */
.consumed-sub {
  margin-left: 4px;
  color: var(--ink-3);
  font-size: 12px;
}
</style>
