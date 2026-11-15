import request from '@/utils/request'

const api_base = '/gpt-api/mode-user-token-log'

// 查询用户Token消耗记录列表
export function getTokenLogList(query) {
  return request({
    url: api_base + '/',
    method: 'get',
    params: query
  })
}


// 按月统计token消耗数据
export function getMonthlyTokenStatistics(query) {
  return request({
    url: api_base + '/monthly-statistics',
    method: 'get',
    params: query
  })
}

// 按天统计token消耗数据
export function getDailyTokenStatistics(query) {
  return request({
    url: api_base + '/daily-statistics',
    method: 'get',
    params: query
  })
}

// 按年统计token消耗数据
export function getYearlyTokenStatistics(query) {
  return request({
    url: api_base + '/yearly-statistics',
    method: 'get',
    params: query
  })
}