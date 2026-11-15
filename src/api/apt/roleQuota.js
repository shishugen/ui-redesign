import request from '@/utils/request'

const api_base = '/gpt-api/role-quota'

// 获取角色配额列表
export function listRoleQuotas(query) {
  return request({
    url: api_base + '/',
    method: 'get',
    params: query
  })
}

// 获取单个角色配额记录
export function getRoleQuota(id) {
  return request({
    url: api_base + '/' + id,
    method: 'get'
  })
}

// 创建角色配额
export function addRoleQuota(data) {
  return request({
    url: api_base+'/batch',
    method: 'post',
    data: data
  })
}

// 批量创建角色配额
export function batchAddRoleQuotas(data) {
  return request({
    url: api_base + '/batch',
    method: 'post',
    data: data
  })
}

// 更新角色配额
export function updateRoleQuota(data) {
  return request({
    url: api_base + '/' + data.id,
    method: 'put',
    data: data
  })
}

// 删除角色配额
export function delRoleQuota(id) {
  return request({
    url: api_base + '/' + id,
    method: 'delete'
  })
}

// 更新角色配额状态
export function updateRoleQuotaStatus(id, data) {
  return request({
    url: api_base + '/' + id + '/status',
    method: 'put',
    data: data
  })
}

// 获取角色配额列表
export function getRoleQuotasByRoleId(role_id) {
  return request({
    url: api_base+'/role/'+role_id,
    method: 'get',
  })
}