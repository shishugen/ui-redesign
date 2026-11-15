import request from '@/utils/request'

const api_base = '/gpt-api/sys'

// 查询模型列表
export function listSysRole(query) {
  // 确保分页参数命名与后端一致
  const params = {
    ...query,
    page: query?.page || 1,
    size: query?.size || 10
  }

  // 如果有其他参数需要转换，可以在这里处理

  return request({
    url: api_base + '/roles',
    method: 'get',
    params: params
  })
}
