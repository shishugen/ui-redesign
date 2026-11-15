import request from '@/utils/request'
const requestTimeout = 30000
// 查询实训计划明细列表
export function listScheduleItem(query) {
  return request({
    url: '/aigc/learning/scheduleItem/list',
    method: 'get',
    params: query
  })
}

// 查询实训计划明细列表
export function findListScheduleItem(query) {
  return request({
    url: '/aigc/learning/scheduleItem/findList',
    method: 'get',
    params: query
  })
}

// 查询实训计划明细详细
export function getScheduleItem(itemId) {
  return request({
    url: '/aigc/learning/scheduleItem/' + itemId,
    method: 'get'
  })
}

// 新增实训计划明细
export function addScheduleItem(data) {
  return request({
    url: '/aigc/learning/scheduleItem',
    method: 'post',
    data: data
  })
}

// 修改实训计划明细
export function updateScheduleItem(data) {
  return request({
    url: '/aigc/learning/scheduleItem',
    method: 'put',
    data: data
  })
}

// 删除实训计划明细
export function delScheduleItem(itemId) {
  return request({
    url: '/aigc/learning/scheduleItem/' + itemId,
    method: 'delete'
  })
}


// 结束计划
export function endScheduleItem(itemId) {
  const params = {
    itemId: itemId,
  }
  return request({
    url: '/aigc/learning/scheduleItem/endItem',
    method: 'post',
    params,
    timeout: requestTimeout,
  })
}

//延时
export function delayScheduleItem(itemId,delayMinutes) {
  const params = {
    itemId: itemId,
    delayMinutes: delayMinutes,
  }
  return request({
    url: '/aigc/learning/scheduleItem/delayItem',
    method: 'post',
    params,
    timeout: requestTimeout,
  })
}
