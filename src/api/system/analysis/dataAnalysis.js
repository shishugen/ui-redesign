import request from '@/utils/request'

// 平台指标统计
export function dataCount() {
  return request({
    url: '/system/analysis/dataCount',
    method: 'get',
  })
}
// 实训统计
export function trainingCount() {
  return request({
    url: '/system/analysis/trainingCount',
    method: 'get',
  })
}
