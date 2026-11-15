import request from '@/utils/request'

const api_base = '/gpt-api/user-quota'

// 获取用户配额列表
export function listUserQuotas(query) {
  return request({
    url: api_base + '/',
    method: 'get',
    params: query
  })
}

// 获取单个用户配额记录
export function getUserQuota(id) {
  return request({
    url: api_base + '/' + id,
    method: 'get'
  })
}

// 创建用户配额
export function addUserQuota(data) {
  return request({
    url: api_base,
    method: 'post',
    data: data
  })
}

// 批量创建用户配额
export function batchAddUserQuotas(data) {
  return request({
    url: api_base + '/batch',
    method: 'post',
    data: data
  })
}

// 更新用户配额
export function updateUserQuota(data) {
  return request({
    url: api_base + '/' + data.id,
    method: 'put',
    data: data
  })
}

// 删除用户配额
export function delUserQuota(id) {
  return request({
    url: api_base + '/' + id,
    method: 'delete'
  })
}

// 更新用户配额状态
export function updateUserQuotaStatus(id, data) {
  return request({
    url: api_base + '/' + id + '/status',
    method: 'put',
    data: data
  })
}
