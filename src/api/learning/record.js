import request from '@/utils/request'

// 分页查询课程学习记录列表
export function listRecord(query) {
  return request({
    url: '/aigc/learning/record/list',
    method: 'get',
    params: query
  })
}

// 条件查询课程学习记录列表
export function findListRecord(query) {
  return request({
    url: '/aigc/learning/record/findList',
    method: 'get',
    params: query
  })
}

// 查询课程学习记录详细
export function getRecord(recordId) {
  return request({
    url: '/aigc/learning/record/' + recordId,
    method: 'get'
  })
}

// 新增课程学习记录
export function addRecord(data) {
  return request({
    url: '/aigc/learning/record',
    method: 'post',
    data: data
  })
}

// 修改课程学习记录
export function updateRecord(data) {
  return request({
    url: '/aigc/learning/record',
    method: 'put',
    data: data
  })
}

// 删除课程学习记录
export function delRecord(recordId) {
  return request({
    url: '/aigc/learning/record/' + recordId,
    method: 'delete'
  })
}

/**
 * 根据章节id获取记录
 * @param chapterId
 * @param userId
 * @returns {*}
 */
export function initRecord(query) {
  return request({
    url: '/aigc/learning/record/initRecord',
    method: 'post',
    data: query
  })
}

/**
 * 获取最新的记录
 * @param courseId
 * @param userId
 * @param type
 * @returns {*}
 */
export function getLastRecord(courseId,chapterId,userId,type) {
  var params={
    courseId: courseId,
    chapterId: chapterId,
    userId: userId,
    type: type
  }
  return request({
    url: '/aigc/learning/record/getLastRecord',
    method: 'get',
    params: params
  })
}

/**
 * 获取用户学习课程统计
 * @param courseId
 * @param userId
 * @returns {*}
 */
export function getCourseStatistics(courseId,userId) {
  var params={
    courseId: courseId,
    userId: userId,
  }
  return request({
    url: '/aigc/learning/record/getCourseStatistics',
    method: 'get',
    params: params
  })
}
