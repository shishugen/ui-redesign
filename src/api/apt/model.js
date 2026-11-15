import request from '@/utils/request'

const api_base = '/gpt-api/models'

// 查询模型列表
export function listModel(query) {
  // 确保分页参数命名与后端一致
  const params = {
    ...query,
    page: query?.page || 1,
    size: query?.size || 10
  }

  // 如果有其他参数需要转换，可以在这里处理

  return request({
    url: api_base + '/list',
    method: 'get',
    params: params
  })
}

// 根据用户ID获取可用模型列表
export function getAvailableModelsByUserId(userId) {
  return request({
    url: api_base + '/user/' + userId + '/available-models',
    method: 'get'
  })
}

export function getAvailableModelsWithStatusByUserId(userId) {
  if (!userId) {
    return Promise.reject('用户ID不能为空')
  }
  userId = String(userId)
  return request({
    url: api_base + '/user/' + userId + '/available-models-with-status',
    method: 'get',
    timeout: 20000
  })
}

// 清空模型相关缓存
export function clearModelCache() {
  return request({
    url: api_base + '/clear-cache',
    method: 'post'
  })
}

// 查询模型详细
export function getModel(modelId) {
  return request({
    url: api_base + '/' + modelId,
    method: 'get'
  })
}

// 新增模型
export function addModel(data) {
  return request({
    url: api_base,
    method: 'post',
    data: data
  })
}

// 修改模型
export function updateModel(data) {
  return request({
    url: api_base + '/' + data.model_id,
    method: 'put',
    data: data
  })
}

// 删除模型
export function delModel(modelId) {
  return request({
    url: api_base + '/' + modelId,
    method: 'delete'
  })
}
