import request from '@/utils/request'

// 额度池下拉项（后端枚举，前端不再硬编码池清单）
export function listResourceTypes() {
  return request({
    url: '/aigc/kube/resourceAllocation/resourceTypes',
    method: 'get'
  })
}

// 适用范围下拉项（同样只放后端一份：all / private / course / class_course）。
// 除 name/code 外还带 subject（记账主体）/clock（计量口径）/hint（一句话口径），
// 表单按 subject 约束可选范围，按 hint 直接当提示文本用，前端不再自记一份「哪个范围算班级专属」。
export function listUsageScopes() {
  return request({
    url: '/aigc/kube/resourceAllocation/usageScopes',
    method: 'get'
  })
}

// 额度重置周期下拉项（后端一份清单：none / day / week / month / half_year / year）
export function listResetPeriods() {
  return request({
    url: '/aigc/kube/resourceAllocation/resetPeriods',
    method: 'get'
  })
}

// 统计窗口下拉项（近一天 / 近一周 / … / 近一年），天数清单只放后端一份。
// 这份清单同时是白名单：不在档位里的 days 后端直接报错，所以前端不能自己拼一份，
// 否则加一档就会一边有一边没有。不加权限要求，学生页也要用。
export function listUsageWindows() {
  return request({
    url: '/aigc/kube/resourceAllocation/usageWindows',
    method: 'get'
  })
}

// 分页查询时长包列表，targetType 决定是哪个 tab
export function listAllocation(query) {
  return request({
    url: '/aigc/kube/resourceAllocation/list',
    method: 'get',
    params: query
  })
}

// 角色维度的用量列表（管理员）：一行一人，roleId 为空就是全校全部正常用户。
// 有意不复用教师那几个 classUsage 接口：那三个都按登录人收敛范围，
// 而这一页要的恰恰是“不收敛”；权限键则沿用本页所在的 resourceAllocation:list，不新增。
// days 可选：传了才多一列「窗口内已用」，不传就是上线前的行为（后端不多查一次日表）。
export function getRoleUsage(roleId, days) {
  return request({
    url: '/aigc/kube/resourceAllocation/roleUsage',
    method: 'get',
    params: { roleId, days }
  })
}

// 角色（或全校）维度的日粒度趋势。deptId 与页面上的班级筛选同口径：
// 不传则图覆盖整个角色，传了（包括未分班的哨兵值）就只画那一批人，
// 否则筛到一个班后表是 40 行、图还画着 47 人的合计。
export function getRoleUsageDaily(query) {
  return request({
    url: '/aigc/kube/resourceAllocation/roleUsageDaily',
    method: 'get',
    params: query
  })
}

// 总运行容器：与 getRoleUsageDaily 同一批人、同一个窗口，答的是「这些人窗口内开过几台机器」。
// 为什么单独一个接口而不是搭在日趋势里回：分钟只能从日表来，台数只能从计量行现算，
// 两者数据源不同、口径不同，合并会让一份返回里混着两套元数据。
export function getRunningTotals(query) {
  return request({
    url: '/aigc/kube/resourceAllocation/runningTotals',
    method: 'get',
    params: query
  })
}

// 管理员补齐日粒度历史统计。无参数：回溯范围与容差都是后端口径的一部分，不是给页面调的旋钮。
// 它与每分钟那轮计量互斥，抢不到锁时返回 code 200 + lockBusy=true，调用方得当普通提示处理而不是当错误。
export function backfillUsageDaily() {
  return request({
    url: '/aigc/kube/resourceAllocation/backfillDaily',
    method: 'post'
  })
}

// 查询时长包详细
export function getAllocation(allocationId) {
  return request({
    url: '/aigc/kube/resourceAllocation/' + allocationId,
    method: 'get'
  })
}

// 新增单个时长包
export function addAllocation(data) {
  return request({
    url: '/aigc/kube/resourceAllocation',
    method: 'post',
    data: data
  })
}

// 一个主体一次配齐多个额度池的包
export function batchAddAllocation(data) {
  return request({
    url: '/aigc/kube/resourceAllocation/batchAdd',
    method: 'post',
    data: data
  })
}

// 修改时长包（只放开额度与时间窗口）
export function updateAllocation(data) {
  return request({
    url: '/aigc/kube/resourceAllocation',
    method: 'put',
    data: data
  })
}

// 删除时长包
export function delAllocation(allocationIds) {
  return request({
    url: '/aigc/kube/resourceAllocation/' + allocationIds,
    method: 'delete'
  })
}

// 当前登录用户在三个额度池上的剩余额度（个人用机侧回显）
export function getMyQuota() {
  return request({
    url: '/aigc/kube/resourceAllocation/myQuota',
    method: 'get'
  })
}

// 我所在班的班级排课额度（只取资源：本期各包还剩多少，不查按课明细）。
// 与 getMyQuota 同一口径：只认当前登录人、不接 userId。这一份不在 getMyQuota 的
// 池卡片里（班级包不进个人候选集），返回体形同 ClassScheduleQuotaVo：
// packages 为空 = 这个班没走这套账，页面整块不显示。
export function getMyClassQuota() {
  return request({
    url: '/aigc/kube/resourceAllocation/myClassQuota',
    method: 'get'
  })
}

// 当前登录用户的使用记录（含已释放的历史实例），后端只认登录人，不接 userId
export function getMyUsageHistory(query) {
  return request({
    url: '/aigc/kube/resourceAllocation/myUsageHistory',
    method: 'get',
    params: query
  })
}

// 当前登录用户的日粒度消耗（含按池按天的序列），后端只认登录人、不接 userId
export function getMyUsageDaily(days) {
  return request({
    url: '/aigc/kube/resourceAllocation/myUsageDaily',
    method: 'get',
    params: { days }
  })
}

// 用户消耗明细
export function getConsumptionDetail(userId) {
  return request({
    url: '/aigc/kube/resourceAllocation/consumptionDetail',
    method: 'get',
    params: { userId: userId }
  })
}
