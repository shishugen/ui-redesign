import request from '@/utils/request'

const api_base = '/gpt-api/mode-user-usage-archive'

// 获取模型用户使用统计归档列表
export function getModeUserUsageArchives(query) {
  return request({
    url: api_base + '/',
    method: 'get',
    params: query
  })
}
