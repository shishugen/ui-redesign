import request from '@/utils/request'

// 查询实验报告列表
export function listReport(query) {
  return request({
    url: '/aigc/learning/report/list',
    method: 'get',
    params: query
  })
}
//根据条件查匈奴
export function findListReport(query) {
  return request({
    url: '/aigc/learning/report/findList',
    method: 'get',
    params: query
  })
}

// 查询当前实验报告
export function getByScheduleIdAndUserId(scheduleId,scheduleItemId, userId) {
  return request({
    url: '/aigc/learning/report/getByScheduleIdAndUserId',
    method: 'get',
    params: { scheduleId,scheduleItemId, userId }
  })
}

// 查询实验报告详细
export function getReport(reportId) {
  return request({
    url: '/aigc/learning/report/' + reportId,
    method: 'get'
  })
}

// 新增实验报告
export function addReport(data) {
  return request({
    url: '/aigc/learning/report',
    method: 'post',
    data: data,
  })
}

// 修改实验报告
export function updateReport(data) {
  return request({
    url: '/aigc/learning/report',
    method: 'put',
    data: data,
  })
}

// 删除实验报告
export function delReport(reportId) {
  return request({
    url: '/aigc/learning/report/' + reportId,
    method: 'delete'
  })
}


//退回实验报告
export function returnReport(data) {
  return request({
    url: '/aigc/learning/report/return',
    method: 'put',
    data: data
  })
}

// reviewReport
// 批阅报告

export function reviewReport(data){
  return request({
    url: '/aigc/learning/report/review',
    method: 'put',
    params: data
  })
}

//statistics
export function statistics(){
  return request({
    url: '/aigc/learning/report/statistics',
    method: 'get',
  })
}
