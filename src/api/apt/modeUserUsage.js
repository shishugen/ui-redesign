import request from '@/utils/request'
const api_base = '/gpt-api/mode-user-usage'

// 获取模型用户使用统计列表
export function getModeUserUsages(query) {
  return request({
    url: api_base + '/',
    method: 'get',
    params: query
  })
}
