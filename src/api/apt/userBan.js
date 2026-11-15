import request from '@/utils/request'

const api_base = '/gpt-api/user-ban'

// 用户禁用管理相关接口
// 获取用户禁用列表
export function listUserBans(query) {
  return request({
    url: api_base + '/list',
    method: 'get',
    params: query
  })
}

// 获取用户禁用详情
export function getUserBan(id) {
  return request({
    url: api_base + '/' + id,
    method: 'get'
  })
}

// 创建用户禁用记录
export function createUserBan(data) {
  return request({
    url: api_base + '/',
    method: 'post',
    data: data
  })
}

// 批量创建用户禁用记录
export function batchCreateUserBans(data) {
  return request({
    url: api_base + '/batch',
    method: 'post',
    data: data
  })
}

// 更新用户禁用记录
export function updateUserBan(data) {
  return request({
    url: api_base + '/update/'+data.id,
    method: 'put',
    data: data
  })
}

// 删除用户禁用记录
export function deleteUserBan(id) {
  return request({
    url: api_base + '/delete/' + id,
    method: 'delete'
  })
}
