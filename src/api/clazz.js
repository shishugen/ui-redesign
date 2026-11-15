import request from '@/utils/request'

/* 班级管理相关接口，URL 与主项目 src/api/system/clazz/teacherStudent.js、src/api/system/dept.js 一致 */

// 班级列表（后端分页：pageNum / pageSize / deptName）
export function listClasses(query, silent = false) {
  return request({
    url: '/system/clazz/teacherStudent/listClasses',
    method: 'get', params: query, silent
  })
}

// 班级下的学生列表
export function listUsersByClass(classId, params, silent = true) {
  return request({
    url: '/system/clazz/teacherStudent/listUsersByClass/' + classId,
    method: 'get', params, silent
  })
}

// 删除班级（支持逗号分隔的多个 deptId）
export function deleteClass(ids, silent = false) {
  return request({
    url: '/system/clazz/teacherStudent/deleteClass/' + ids,
    method: 'delete', silent
  })
}

// 新增 / 编辑班级（复用了部门表）
export function addDept(data) {
  return request({ url: '/system/dept', method: 'post', data })
}
export function updateDept(data) {
  return request({ url: '/system/dept', method: 'put', data })
}

// 班级学生人数
export function getStudentCount(classesId, silent = true) {
  return request({
    url: '/system/clazz/teacherStudent/getStudentCount',
    method: 'get', params: { classesId }, silent
  })
}
