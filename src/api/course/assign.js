import request from '@/utils/request'

// 查询课程分配列表
export function listAssign(query) {
  return request({
    url: '/aigc/course/assign/list',
    method: 'get',
    params: query
  })
}

export function findListAssign(query) {
  return request({
    url: '/aigc/course/assign/findList',
    method: 'get',
    params: query
  })
}

// 查询课程分配列表(联合查询)
export function listAssignPlus(query) {
  return request({
    url: '/aigc/course/assign/listPlus',
    method: 'get',
    params: query
  })
}

export function findListAssignPlus(query) {
  return request({
    url: '/aigc/course/assign/findListPlus',
    method: 'get',
    params: query
  })
}

// 查询课程分配详细
export function getAssign(assignId) {
  return request({
    url: '/aigc/course/assign/' + assignId,
    method: 'get'
  })
}

// 新增课程分配
export function addAssign(data) {
  return request({
    url: '/aigc/course/assign',
    method: 'post',
    data: data
  })
}

// 修改课程分配
export function updateAssign(data) {
  return request({
    url: '/aigc/course/assign',
    method: 'put',
    data: data
  })
}

// 删除课程分配
export function delAssign(assignId) {
  return request({
    url: '/aigc/course/assign/' + assignId,
    method: 'delete'
  })
}

// 新增课程分配对象
export function addAssignData(data) {
  return request({
    url: '/aigc/course/assign/addAssignData',
    method: 'put',
    data: data
  })
}

//检查状态
export function checkStatus(courseId) {
  var params = {
    courseId:courseId
  }
  return request({
    url: '/aigc/course/assign/checkStatus',
    method: 'get',
    params
  })
}


// 分页联合查询分配班级列表
export function assignClassesList(query) {
  return request({
    url: '/aigc/course/assign/assignClassesList',
    method: 'get',
    params: query
  })
}

//条件联合查询分配班级列表
export function findAssignClassesList(query) {
  return request({
    url: '/aigc/course/assign/findAssignClassesList',
    method: 'get',
    params: query
  })
}
