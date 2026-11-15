import request from '@/utils/request'

// 查询课程资源列表
export function listCourse(query) {
  return request({
    url: '/aigc/course/course/list',
    method: 'get',
    params: query
  })
}

// 查询课程资源列表
export function findListCourse(query) {
  return request({
    url: '/aigc/course/course/findList',
    method: 'get',
    params: query
  })
}


// 查询课程资源列表(分页)
export function listCoursePlus(query) {
  return request({
    url: '/aigc/course/course/listPlus',
    method: 'get',
    params: query
  })
}
// 查询课程资源列表
export function findListCoursePlus(query) {
  return request({
    url: '/aigc/course/course/findListPlus',
    method: 'get',
    params: query
  })
}


// 查询课程资源详细
export function getCourse(courseId) {
  return request({
    url: '/aigc/course/course/' + courseId,
    method: 'get'
  })
}

// 新增课程资源
export function addCourse(data) {
  return request({
    url: '/aigc/course/course',
    method: 'post',
    data: data
  })
}

// 修改课程资源
export function updateCourse(data) {
  return request({
    url: '/aigc/course/course',
    method: 'put',
    data: data
  })
}

// 删除课程资源
export function delCourse(courseId) {
  return request({
    url: '/aigc/course/course/' + courseId,
    method: 'delete'
  })
}
