import request from '@/utils/request'

/**
 * 班级额度用量（教师只读）。
 * <p>
 * 这几个接口都在 /aigc/course/classUsage 下、共用一个权限键 kube:quotaClassUsage:list，
 * 后端按当前登录人收敛可见班级，前端不传 teacherId 这类身份参数。
 * 窗口档位清单则例外：它走 /aigc/kube/resourceAllocation/usageWindows（无权限要求），
 * 与额度池/适用范围/重置周期三张下拉同一做法 —— 清单只放后端一份，三处页面共用。
 * 有意不复用 resourceAllocation 那套接口：它们的权限键属于管理员，
 * 且 consumptionDetail 不判归属。班级排课额度也挂在这里同一个理由：
 * 同一份班级数据只允许有一个入口、一道归属闸门。
 */

// 我可见的班级（老师=被分配到的班，管理员=全校有学员的班）
export function listVisibleClasses() {
  return request({
    url: '/aigc/course/classUsage/classes',
    method: 'get'
  })
}

// 班内学员的本期用量，一行一人，后端不分页（状态要算完三池才知道）。
// days 可选：传了才多一列「窗口内已用」（与角色页同一个后端方法填的，两个维度不会各说各话）
export function listClassStudents(classId, days) {
  return request({
    url: '/aigc/course/classUsage/students',
    method: 'get',
    params: { classId: classId, days: days }
  })
}

// 本班在指定窗口内的日粒度消耗（趋势图）。
// days 必传：没有窗口就没有图，给默认值只会多一个「谁都不知道图在说哪几天」的机会；
// 班级归属校验在后端走与列表同一道闸门，这里不传任何身份参数。
export function getClassUsageDaily(classId, days) {
  return request({
    url: '/aigc/course/classUsage/daily',
    method: 'get',
    params: { classId: classId, days: days }
  })
}

// 单个学员的消耗明细，多了一层「是不是我班的」校验，且不透出禁用原因
export function getStudentDetail(userId) {
  return request({
    url: '/aigc/course/classUsage/studentDetail',
    method: 'get',
    params: { userId: userId }
  })
}

// 本班级的班级排课额度：按班、按排课墙钟扣的那套共享账（本期各包剩余 + 近 N 天按课明细）。
// 口径与归属校验都在后端：service 里走与 daily 同一道 requireVisible，这里不传任何身份参数。
// days 只管「按课明细往回看几天」（包那半边始终是当前周期的账，与 days 无关），
// 传了才筛那一层，没选窗口就不传、让后端拿它的默认档，页面按返回体里的 days 说话：
// 前端再记一份默认天数，迟早与后端那个 30 天各自长成两个不同的窗口。
export function getClassScheduleQuota(classId, days) {
  return request({
    url: '/aigc/course/classUsage/scheduleQuota',
    method: 'get',
    params: { classId: classId, days: days }
  })
}

// 只通过班级ID查本班全部资源池的班级排课包（授予/已占/剩余），：
export function getClassScheduleResources(classId) {
  return request({
    url: '/aigc/course/classUsage/scheduleResources',
    method: 'get',
    params: { classId: classId }
  })
}

// 在用并发历史曲线：5 分钟采样明细，后端只留一个学期，窗口传日期（右端含当天）。
// 更早的历史不在这里拿——那是 runningSummary 的日汇总层，永不删除。
// params = { scope, classId, resourceType, begin, end }
//   scope：class 班级排课 / personal 个人用机 / school 全校合计，不传后端按 class（只传班级的老调用语义不变）；
//         classId 只在 class 档必传，其余两档传了后端也不看；
//   resourceType：不传 = 各池线 + 跨池总并发线都要。总并发不能在前端把三条池线相加 ——
//         各池的峰值时刻不同，相加得到的是一个凭空多出来的数，后端那行空串才是替你算好的合并口径。
export function getClassRunningHistory(params) {
  return request({
    url: '/aigc/course/classUsage/runningHistory',
    method: 'get',
    params: params
  })
}

// 并发日汇总（永不删除的总统计层）：params 同上，另外多一档 scope = user（按人一行，
// 必须带 userId —— 后端只放行「这个人是你任课班里的学生」）。
export function getClassRunningSummary(params) {
  return request({
    url: '/aigc/course/classUsage/runningSummary',
    method: 'get',
    params: params
  })
}
