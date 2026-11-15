<template>
  <div class="quota-user-table">
    <!-- 整行筛选条默认由组件自己摆在表头上方。页面把它提到更上面时用 external-filter 关掉这里：两处只有一条生效路径 -->
    <div v-if="!externalFilter" class="usage-filter">
      <a-space wrap>
        <!-- 各页自己那个「按什么筛人」的控件：班级页放班级下拉，角色页放角色下拉 -->
        <slot name="selector"></slot>
        <a-input
          v-model:value="localKeyword"
          :placeholder="t('搜昵称或账号')"
          allow-clear
          style="width: 180px" />
        <a-checkbox v-model:checked="localOnlyProblem">{{ t('只看缺额度的') }}</a-checkbox>
      </a-space>
    </div>

    <a-alert
      v-if="!quotaEnabled && rows.length"
      class="rule-tip"
      type="warning"
      show-icon
      :message="t('时长配额开关未开启：下面的额度数字只是按现有时长包算出来的账，实际用机并不按它拦截，当前只有「禁用」真正生效。')" />

    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="displayRows"
        :pagination="pagination"
        row-key="userId"
        size="middle"
        :scroll="{ x: 'max-content' }"
        :locale="{ emptyText }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'student'">
            <div class="stu-cell">
              <span class="stu-name">{{ record.nickName || '-' }}</span>
              <span class="stu-account">{{ record.userName }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'dept'">
            <span v-if="record.deptState === 'ok'">{{ record.deptName || '-' }}</span>
            <a-tooltip v-else :title="deptTip(record)">
              <span class="dept-abnormal">{{ deptText(record) }}</span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'roles'">
            <a-tag v-for="name in record.roleNames || []" :key="name">{{ name }}</a-tag>
            <span v-if="!(record.roleNames || []).length" class="muted">{{ t('无角色') }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tooltip :title="statusTip(record)">
              <a-tag :color="statusColor(record.statusCode)">{{ t(statusText(record.statusCode)) }}</a-tag>
            </a-tooltip>
            <a-tooltip v-if="record.banned" :title="banTip(record)">
              <a-tag color="error">{{ t('已禁用') }}</a-tag>
            </a-tooltip>
          </template>
          <template v-else-if="poolKeys.includes(column.key)">
            <!-- 这批人里有这个池、但这个人没有时占格显「未分配」：
                 不能留成「剩 0 分」，那是「用光了」的脸，会骗人去看一眼包然后重复发额度 -->
            <span v-if="!poolOf(record, column.key)" class="muted">{{ t('未分配') }}</span>
            <a-tooltip v-else :title="poolTip(record, column.key)">
              <div class="pool-cell">
                <span :class="poolRemain(record, column.key) > 0 ? 'pool-ok' : 'pool-zero'">
                  {{ t('剩') }} {{ formatMinutes(poolField(record, column.key, 'remainMinutes')) }}
                </span>
                <span class="pool-meta">
                  {{ t('发') }} {{ formatMinutes(poolField(record, column.key, 'grantMinutes')) }} ·
                  {{ t('用') }} {{ formatMinutes(poolField(record, column.key, 'usedMinutes')) }}
                </span>
                <!-- 真正跑过多少分钟、分开个人用机与课程用机两个来源。全为 0 时不出这一行：
                     那一行对「从没用过机」的人不是信息，只把每张表多撑高一档 -->
                <span v-if="poolRunMinutes(record, column.key) > 0" class="pool-meta">
                  {{ t('运行') }} {{ t('个人') }} {{ formatMinutes(poolField(record, column.key, 'privateConsumedMinutes')) }} ·
                  {{ t('课程') }} {{ formatMinutes(poolField(record, column.key, 'courseConsumedMinutes')) }}
                </span>
              </div>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'total'">
            <div class="pool-cell">
              <span class="stu-name">{{ formatMinutes(record.remainMinutes) }}</span>
              <span class="pool-meta">
                {{ t('发') }} {{ formatMinutes(record.grantMinutes) }} ·
                {{ t('用') }} {{ formatMinutes(record.usedMinutes) }}
              </span>
              <!-- 合计也要有「真跑了多久」：只分池看，老师得自己把三列加起来才知道这个人一共用了多少。
                   用后端给的行级合计而不是前端累加可见池格：没分到包的那个池不会下发格子，
                   但他在那个池上真跑过的分钟照样在合计里 —— 只累可见格会把他抹少 -->
              <a-tooltip v-if="rowRunMinutes(record) > 0" :title="TOTAL_RUN_TIP">
                <span class="pool-meta">
                  {{ t('运行') }} {{ t('个人') }} {{ formatMinutes(record.privateConsumedMinutes) }} ·
                  {{ t('课程') }} {{ formatMinutes(record.courseConsumedMinutes) }}
                </span>
              </a-tooltip>
            </div>
          </template>
          <template v-else-if="column.key === 'classUsage'">
            <a-tooltip :title="CLASS_USAGE_TIP">
              <span :class="record.classConsumedMinutes > 0 ? '' : 'muted'">
                {{ formatMinutes(record.classConsumedMinutes) }}
              </span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'personalArrangeUsage'">
            <a-tooltip :title="PERSONAL_ARRANGE_TIP">
              <span :class="record.personalArrangeConsumedMinutes > 0 ? '' : 'muted'">
                {{ formatMinutes(record.personalArrangeConsumedMinutes) }}
              </span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'window'">
            <!-- 后端没要窗口数据时 windowMinutes 是 null，显「—」而不是 0：
                 「没用过」与「这一列没开」必须分得开，前者是业务事实，后者是功能没开 -->
            <a-tooltip :title="windowTip">
              <span :class="record.windowMinutes > 0 ? '' : 'muted'">
                {{ record.windowMinutes === null || record.windowMinutes === undefined ? '—' : formatMinutes(record.windowMinutes) }}
              </span>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'runningInstances'">
            <span v-if="record.runningInstances" class="running-on">{{ t('{n} 个', { n: record.runningInstances }) }}</span>
            <span v-else class="muted">-</span>
          </template>
          <template v-else-if="column.key === 'lastUsedTime'">
            <span :class="record.lastUsedTime ? '' : 'muted'">{{ record.lastUsedTime ? fmtTime(record.lastUsedTime) : t('没用过') }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="emit('detail', record)">{{ t('明细') }}</a-button>
          </template>
        </template>
      </a-table>
    </a-spin>
  </div>
</template>

<script setup>
/**
 * 额度用量表的共用 body：一行一人，列 = 身份 + 状态 + 各池 + 合计 + 在跑 + 上次使用 + 明细。
 * <p>
 * 抽出来的唯一理由是「判据同源」：班级用量页（老师）和角色用量页（管理员）必须是同一套
 * 状态定义、同一个排序、同一个池口径。复制两份的话，同一个人迟早会在两个页面上显示成
 * 两种颜色、排到两个位置，而这类差别只能靠人对账发现 —— 后端那段算数已经是同一个方法了，
 * 前端这里也不该是两套。
 * <p>
 * 各页只留下自己那部分：筛人的控件走 selector 插槽，取数与下钻抽屉留在各页里，
 * 因为两张表的取数接口权限不同（教师接口带班级归属校验，管理员接口没有）。
 * <p>
 * 排序是「谁先没额度」优先：后端一次返回全量，前端按 状态 → 剩余升序 排，
 * 所以第一屏看到的就是要处理的人。分页只是给长表一个滚动条，不影响排序全集。
 */
import { ref, computed } from 'vue'
import { t } from '@/i18n'
import { parseTime } from '@/utils/aigc'
import { formatMinutes } from './quotaUtils'

const props = defineProps({
  /** 后端算好的行，字段见 UserQuotaRowVo */
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  /** 空表文案由调用方给：只有它知道自己那张表为什么是空的 */
  emptyText: { type: String, default: '' },
  /** 班级列：角色页必开（挂在已删除班里的人正是那页要抓的死角），班级页可关 */
  showDept: { type: Boolean, default: false },
  /** 角色列：角色页用它说明这个人为什么出现在这里 */
  showRole: { type: Boolean, default: false },
  studentLabel: { type: String, default: '' },
  /**
   * 窗口列的标题（如「近一周已用」）。**空 = 不摆这一列**：
   * 页面没选统计窗口时，后端也不会多查一次日表，两边同一件事。
   * 有意与「本期已用」并列而不是替掉它：两个数口径不同，只看一个会读错。
   */
  windowTitle: { type: String, default: '' },
  /** 窗口列的口径说明，由调用方从 useUsageWindow().windowHint 给 */
  windowTip: { type: String, default: '' },
  /**
   * 是否摆「排课按档」那两列（班级排课用量 / 个人排课用量）。**默认不摆**：这两列回答的是
   * 「他上课占掉本班多少机时、自己又排了多少」，在按人列的配额表上不是人人都关心；
   * 班级用量页开，角色用量页不开。
   * 后端两边都算了（档在实例创建那一刻就定了），开不开只取决于要不要占这两格宽。
   */
  showClassUsage: { type: Boolean, default: false },
  /**
   * 禁用 tooltip 的后缀。老师页要带「解除禁用请联系管理员」，
   * 而管理员页用同一句就成了让管理员联系管理员 —— 所以这句由调用方给。
   */
  banSuffix: { type: String, default: '' },
  /**
   * 页面把整行筛选条提到页面顶部时置 true：组件不再渲染表头上方那一行，改读下面的
   * keyword / onlyProblem。默认 false = 用自己的那一行和内部状态，
   * 班级用量页就是这么用的，行为与以前逐字一致。
   */
  externalFilter: { type: Boolean, default: false },
  /** 外部筛选态：只在 externalFilter 为真时读，不会与内部那两个 ref 同时生效 */
  keyword: { type: String, default: '' },
  onlyProblem: { type: Boolean, default: false }
})

const emit = defineEmits(['detail'])

/** 状态优先级：越小越靠前，让「已经用光的」永远在表头 */
const STATUS_RANK = {
  used_up: 0,
  warning: 1,
  no_package: 2,
  ok: 3
}

const STATUS_META = {
  used_up: { text: '已用完', color: 'error' },
  warning: { text: '即将耗尽', color: 'warning' },
  no_package: { text: '无额度包', color: 'default' },
  ok: { text: '正常', color: 'success' }
}

/**
 * 班级异常态的措辞。四种都写成人能看懂的一句话，而不是甩一个状态码：
 * 看到「已删除：大数据一班」的人需要立刻知道后果是「班级页选不到他，可他的包还在扣」，
 * 否则他会以为这只是个数据脏了而已。
 */
const DEPT_META = {
  deleted: {
    text: (name) => t('已删除：{name}', { name }),
    tip: () => t('他挂的这个班已经被删除，所以班级维度的用量表根本选不到他；但这个班的时长包还在给他扣额度 —— 要收口就去用户分配里给他单独处理')
  },
  stopped: {
    text: (name) => t('已停用：{name}', { name }),
    tip: () => t('他挂的这个班已停用，班级维度的用量表选不到他；这个班的时长包仍在生效')
  },
  not_class: {
    text: (name) => t('{name}（非班级部门）', { name }),
    tip: () => t('他挂在不是班级的部门下（公司、院系这类），班级维度的表都照不到他；他的额度只由角色包和个人包决定')
  },
  none: {
    text: () => t('未分班'),
    tip: () => t('他没有分班，只能在这张按人列的表里看到他；他的额度只由角色包和个人包决定')
  }
}

const localKeyword = ref('')
const localOnlyProblem = ref(false)

/**
 * 生效的那一份筛条件：整行筛选条在组件里时用自己的 ref，页面把它提到顶上时读 props。
 * 写成两个 computed 而不是让内部 ref 去同步 props，是为了让「谁在生效」只由 externalFilter 一处决定
 * —— 两份状态互相回写，迟早会出现页面清了输入框而表里还留着旧关键词。
 */
const activeKeyword = computed(() => (props.externalFilter ? props.keyword : localKeyword.value))
const activeOnlyProblem = computed(() => (props.externalFilter ? props.onlyProblem : localOnlyProblem.value))

/**
 * 配额开关取「任意一行为真即为开」：它本来就是全局配置，逐行只是顺带带下来。
 * 用 some 而不是 rows[0].quotaEnabled，是为了空表和后端字段缺失时都落到 false，
 * 宁可多提示一次「当前只判禁用」，也不要在开关其实没开的时候让人以为额度真的拦住了。
 */
const quotaEnabled = computed(() => props.rows.some((r) => r.quotaEnabled))

/** 池清单：按首次出现顺序排，保证列顺序与后端 resource_type 顺序一致 */
const poolKeys = computed(() => {
  const keys = []
  for (const row of props.rows) {
    for (const pool of row.pools || []) {
      if (pool.resourceType && !keys.includes(pool.resourceType)) {
        keys.push(pool.resourceType)
      }
    }
  }
  return keys
})

const columns = computed(() => {
  const poolCols = poolKeys.value.map((key) => ({
    title: poolName(key),
    key,
    dataIndex: key,
    align: 'center'
  }))
  return [
    { title: props.studentLabel || t('学生'), key: 'student', dataIndex: 'nickName', fixed: 'left', width: 150 },
    ...(props.showDept ? [{ title: t('班级'), key: 'dept', dataIndex: 'deptName', align: 'center', width: 160 }] : []),
    ...(props.showRole ? [{ title: t('角色'), key: 'roles', dataIndex: 'roleNames', align: 'center', width: 140 }] : []),
    { title: t('状态'), key: 'status', dataIndex: 'statusCode', align: 'center' },
    ...poolCols,
    { title: t('合计'), key: 'total', dataIndex: 'remainMinutes', align: 'center' },
    // 排课两档用量紧跟合计：三个都是跨池加总的数，而且这两列合起来是「运行」那一行里课程部分的子集，对着看才知道差在哪
    ...(props.showClassUsage
      ? [{
          title: t('班级排课用量'),
          key: 'classUsage',
          dataIndex: 'classConsumedMinutes',
          align: 'center',
          sorter: (a, b) => (a.classConsumedMinutes || 0) - (b.classConsumedMinutes || 0)
        }, {
          title: t('个人排课用量'),
          key: 'personalArrangeUsage',
          dataIndex: 'personalArrangeConsumedMinutes',
          align: 'center',
          sorter: (a, b) => (a.personalArrangeConsumedMinutes || 0) - (b.personalArrangeConsumedMinutes || 0)
        }]
      : []),
    // 窗口列紧跟合计：两个都是「跨池跨来源加在一起」的数，隔得远就不好对着看
    ...(props.windowTitle
      ? [{ title: props.windowTitle, key: 'window', dataIndex: 'windowMinutes', align: 'center' }]
      : []),
    { title: t('在跑实例'), key: 'runningInstances', dataIndex: 'runningInstances', align: 'center' },
    { title: t('上次使用'), key: 'lastUsedTime', dataIndex: 'lastUsedTime', align: 'center' },
    { title: t('操作'), key: 'action', align: 'center', fixed: 'right', width: 80 }
  ]
})

const displayRows = computed(() => {
  const kw = activeKeyword.value.trim().toLowerCase()
  let list = props.rows.filter((row) => {
    if (kw && !`${row.nickName || ''} ${row.userName || ''}`.toLowerCase().includes(kw)) {
      return false
    }
    // 「缺额度」把无包/用光/临近耗尽和被禁用都算进来：要处理的场景是同一个
    if (activeOnlyProblem.value) {
      return row.banned || ['used_up', 'warning', 'no_package'].includes(row.statusCode)
    }
    return true
  })
  list = [...list].sort((a, b) => {
    const rank = (STATUS_RANK[a.statusCode] ?? 9) - (STATUS_RANK[b.statusCode] ?? 9)
    if (rank !== 0) {
      return rank
    }
    return (a.remainMinutes || 0) - (b.remainMinutes || 0)
  })
  return list
})

const pagination = computed(() => ({
  pageSize: 20,
  hideOnSinglePage: true,
  showTotal: (total) => t('共 {n} 人', { n: total })
}))

function poolOf(record, resourceType) {
  return (record.pools || []).find((p) => p.resourceType === resourceType)
}

function poolField(record, resourceType, field) {
  return Number(poolOf(record, resourceType)?.[field] || 0)
}

function poolRemain(record, resourceType) {
  return poolField(record, resourceType, 'remainMinutes')
}

/** 这一格累计真跑过多少分钟（个人 + 课程），只用来判该不该多出「运行」那一行 */
function poolRunMinutes(record, resourceType) {
  return poolField(record, resourceType, 'privateConsumedMinutes') + poolField(record, resourceType, 'courseConsumedMinutes')
}

/**
 * 合计列的累计运行：直接用后端给的行级字段。
 * <p>
 * 不前端累加 pools：那个集合故意不含没分到包的池（格子不占位），
 * 而他在那些池上可能真跑过机（班级包不按人扣），累加可见格会得到一个偏小的数。
 */
function rowRunMinutes(record) {
  return Number(record.privateConsumedMinutes || 0) + Number(record.courseConsumedMinutes || 0)
}

/**
 * 合计那一行「运行」的口径：它是全量三池，而上面的格子只占住了分到包的那几个池。
 * 不说这一句，两行数字对不上时看表的人只会以为算错了。
 */
const TOTAL_RUN_TIP = computed(() =>
  t('三池合计的实际运行分钟，含没分到包、因此上面没有格子的那个池；所以它可能大于上面几格「运行」之和。'))

/**
 * 「班级排课用量」列的口径。四句话各挡一种误读：
 * 这一列按什么认档、与「运行·课程」是什么关系、与班级包被扣的墙钟为何对不上、是不是周期数。
 */
const CLASS_USAGE_TIP = computed(() =>
  t('按实例上的排课归属档算，只认记为「班级排课」的那些：这一档是下发时定的，培训计划与教学排课都走它。个人排课那一档不算，个人用机新建的实例更不算。')
  + ' ' + t('它与「个人排课用量」那列加起来，是合计里「运行 · 课程」那一项的一个子集，可能小于它：差额是归档上线前没带档的历史计量行，那些行两个桶都不进，不是 0。')
  + ' ' + t('与下方班级排课额度里包被扣的分钟不可对账：一节 45 分钟的课全班只扣一份墙钟，这里只记他自己开了多久 —— 排了课没人上机时那里在涨而这里是 0。')
  + ' ' + t('累计口径：不按额度周期归零，也不随统计窗口变。'))

/**
 * 「个人排课用量」列的口径。这一列最容易被读成「个人用机」，所以第一句先把两者分开。
 */
const PERSONAL_ARRANGE_TIP = computed(() =>
  t('按实例上的排课归属档算，只认记为「个人排课」的那些 —— 即他自己排的一节课，扣的是他头上的排课额度，不进班级账。')
  + ' ' + t('它不是个人用机：个人用机新建的实例走的是另一本账，在合计那行的「运行 · 个人」里，不在这两列任何一列。')
  + ' ' + t('累计口径：不按额度周期归零，也不随统计窗口变。'))

/** 池名：数据行自带 resourceTypeName，不用再请求下拉接口（那个接口在管理员权限键下） */
function poolName(resourceType) {
  for (const row of props.rows) {
    const hit = poolOf(row, resourceType)
    if (hit?.resourceTypeName) {
      return hit.resourceTypeName
    }
  }
  return resourceType
}

function statusText(statusCode) {
  return (STATUS_META[statusCode] || STATUS_META.ok).text
}

function statusColor(statusCode) {
  return (STATUS_META[statusCode] || STATUS_META.ok).color
}

/**
 * 状态 tooltip：把「为什么」和「什么时候自己会好」说清楚。
 * 用完了但不重置的包等不来重发，这句必须直说，否则看的人会以为等几天就有额度了。
 */
function statusTip(record) {
  if (record.statusCode === 'used_up') {
    return record.earliestNextResetTime
      ? t('本期额度已用完，最快 {time} 自动重发一次额度；没用完的也不结转', { time: fmtTime(record.earliestNextResetTime) })
      : t('本期额度已用完，且所配的包都不重置 —— 等不来自动恢复，只能再发一个包')
  }
  if (record.statusCode === 'warning') {
    return t('剩余 {remain}，不足总额度的一成', { remain: formatMinutes(record.remainMinutes) })
  }
  if (record.statusCode === 'no_package') {
    return t('还没有任何时长包落到他头上')
  }
  return t('剩余 {remain} / 额度 {grant}', {
    remain: formatMinutes(record.remainMinutes),
    grant: formatMinutes(record.grantMinutes)
  })
}

/** 禁用只说是哪几个池被禁：禁用原因是管理员之间的备注，教师接口不会下发 */
function banTip(record) {
  return record.banPools
    ? t('已禁用：{pools}{suffix}', { pools: record.banPools, suffix: props.banSuffix })
    : t('已被禁用{suffix}', { suffix: props.banSuffix })
}

/** 池列 tooltip：最早作废与最早重发决定的是「这格数字还能活多久」 */
function poolTip(record, resourceType) {
  const pool = poolOf(record, resourceType)
  if (!pool) {
    return t('这个池没有为他分配时长包')
  }
  const parts = [t('额度 {grant}，本期已用 {used}', {
    grant: formatMinutes(pool.grantMinutes),
    used: formatMinutes(pool.usedMinutes)
  })]
  // 「用」与「运行」是两个口径，不分开说就会被读成同一个数的两种写法：
  // 前者是从时长包扣掉的本期分钟，后者是计量表里的累计事实（不分周期、也不结转到下一期）。
  // 班级排课额度承担的那部分就从这里露脸：它不进任何人的「用」，但它是「这个学生上课真用了多少」
  parts.push(t('累计实际运行：个人 {p} / 课程 {c}。', {
    p: formatMinutes(pool.privateConsumedMinutes),
    c: formatMinutes(pool.courseConsumedMinutes)
  }) + t('课程那部分里，由本班「班级排课额度」承担的不会从他的时长包扣，所以不会出现在上面的「用」里'))
  if (pool.banned) {
    parts.push(t('这个池已被禁用'))
  }
  parts.push(pool.earliestExpireTime
    ? t('最早 {time} 有包作废（到期未用完的直接作废）', { time: fmtTime(pool.earliestExpireTime) })
    : t('当前有量的包都不设到期时间'))
  parts.push(pool.earliestNextResetTime
    ? t('最早 {time} 重发一次额度', { time: fmtTime(pool.earliestNextResetTime) })
    : t('所配的包都不重置，用完就没有'))
  return parts.join('；')
}

function deptText(record) {
  const meta = DEPT_META[record.deptState]
  return meta ? meta.text(record.deptName || '') : (record.deptName || '-')
}

function deptTip(record) {
  const meta = DEPT_META[record.deptState]
  return meta ? meta.tip() : ''
}

function fmtTime(time) {
  return time ? parseTime(time, '{y}-{m}-{d} {h}:{i}') : '-'
}
</script>

<style scoped>
.usage-filter {
  margin-bottom: 12px;
}

.rule-tip {
  margin-bottom: 12px;
}

.stu-cell {
  display: flex;
  flex-direction: column;
}

.stu-account {
  color: var(--ink-3);
  font-size: 12px;
}

.pool-cell {
  display: flex;
  flex-direction: column;
  line-height: 1.4;
}

.pool-meta {
  color: var(--ink-3);
  font-size: 12px;
}

.pool-ok {
  color: var(--ink);
}

.pool-zero {
  color: var(--danger);
}

.running-on {
  color: var(--pri);
}

.dept-abnormal {
  color: var(--warn);
}

.muted {
  color: var(--ink-4);
}
</style>
