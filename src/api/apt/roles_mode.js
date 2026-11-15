import request from '@/utils/request'

const api_base = '/gpt-api/roles-mode'

// 模型角色分配相关接口
// 获取模型角色分配列表
export function listModeRoles(query) {
  return request({
    url: api_base + '/roles',
    method: 'get',
    params: query
  })
}

// 根据角色ID获取所有启用的模型列表
export function getActiveModelsByRoleId(roleId) {
  return request({
    url: api_base + '/roles/' + roleId + '/active-models',
    method: 'get'
  })
}

// 获取单个模型角色分配记录
export function getModeRole(id) {
  return request({
    url: api_base + '/roles/' + id,
    method: 'get'
  })
}

// 创建模型角色分配
export function addModeRole(data) {
  return request({
    url: api_base + '/roles',
    method: 'post',
    data: data
  })
}

// 批量创建模型角色分配
export function batchAddModeRoles(data) {
  return request({
    url: api_base + '/roles/batch',
    method: 'post',
    data: data,
    timeout: 120000 // 2分钟超时，因为图像生成可能需要较长时间
  })
}

// 更新模型角色分配
export function updateModeRole(data) {
  return request({
    url: api_base + '/roles/' + data.id,
    method: 'put',
    data: data
  })
}

// 删除模型角色分配
export function delModeRole(id) {
  return request({
    url: api_base + '/roles/' + id,
    method: 'delete'
  })
}

// 更新模型角色分配状态
export function updateModeRoleStatus(id, data) {
  return request({
    url: api_base + '/roles/' + id + '/status',
    method: 'put',
    data: data
  })
}
