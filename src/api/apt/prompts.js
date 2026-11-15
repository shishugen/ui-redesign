import request from '@/utils/request'

const api_base = '/gpt-api/prompts'

// 查询提示词主列表
export function listPrompts(query) {
  return request({
    url: api_base + '/list',
    method: 'get',
    params: query
  })
}

// 查询我的提示词
export function myPrompts(query) {
  // 确保参数格式正确
  const params = {
    ...query,
    page: query?.page || 1,
    size: query?.size || 10
  }

  // 如果有分类ID数组，转换为逗号分隔的字符串
  if (params.category_id && Array.isArray(params.category_id)) {
    params.category_id = params.category_id.join(',')
  }

  return request({
    url: api_base + '/my-prompts',
    method: 'get',
    params
  })
}

// 新增提示词主
export function addPrompts(data) {
  return request({
    url: api_base ,
    method: 'post',
    data: data
  })
}

export function getPrompts(id) {
  return request({
    url: api_base + '/' + id,
    method: 'get'
  })
}

// 添加收藏
export function addFavorites(data) {
  return request({
    url: api_base + '/favorites',
    method: 'post',
    data: data
  })
}

// 删除收藏
export function deleteFavorites(data) {
  return request({
    url: api_base + '/favorites',
    method: 'delete',
    data: data
  })
}
// 查询收藏
export function getFavoritesByUser(query) {
  return request({
    url: api_base + '/favorites/users/' + query.user_id,
    method: 'get',
    params: query
  })
}

// 修改提示词主
export function updatePrompts(data) {
  return request({
    url: api_base + '/' + data.id,
    method: 'put',
    data: data
  })
}

// 删除提示词主
export function delPrompts(id) {
  return request({
    url: api_base + '/' + id,
    method: 'delete'
  })
}

// 清空提示词缓存
export function clearPromptCache() {
  return request({
    url: api_base + '/clear-cache',
    method: 'post'
  })
}
