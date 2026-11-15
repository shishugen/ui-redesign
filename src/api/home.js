import request from '@/utils/request'

/* URL 均来自主项目 src/api/，全部请求真实后端；silent 用于首页并发探测时抑制错误弹窗 */

export function listCourse(query, silent = false) {
  return request({ url: '/aigc/course/course/list', method: 'get', params: query, silent })
}
export function findListCoursePlus(query, silent = false) {
  return request({ url: '/aigc/course/course/findListPlus', method: 'get', params: query, silent })
}

export function listAllClasses(silent = false) {
  return request({ url: '/system/clazz/teacherStudent/listAllClasses', method: 'get', silent })
}
export function listAllTeachers(silent = false) {
  return request({ url: '/system/clazz/teacherStudent/listAllTeachers', method: 'get', silent })
}
export function listStudents(params, silent = false) {
  return request({ url: '/system/clazz/teacherStudent/listStudents', method: 'get', params, silent })
}

// AI 服务：/gpt-api -> PROXY_HOST:5001（主机见 .env.local）
export function getAvailableModelsWithStatusByUserId(userId, silent = false) {
  return request({
    url: '/gpt-api/models/user/' + String(userId) + '/available-models-with-status',
    method: 'get', timeout: 8000, silent
  })
}
export function listModel(query, silent = false) {
  return request({ url: '/gpt-api/models/list', method: 'get', params: query, timeout: 8000, silent })
}

export function getCurrSchedule(query, silent = false) {
  return request({ url: '/aigc/learning/schedule/getScheduleByDay', method: 'get', params: query, silent })
}
export function getCourseStatistics(courseId, userId, silent = false) {
  return request({
    url: '/aigc/learning/record/getCourseStatistics', method: 'get',
    params: { courseId, userId }, silent
  })
}
export function listReport(query, silent = false) {
  return request({ url: '/aigc/learning/report/list', method: 'get', params: query, silent })
}
