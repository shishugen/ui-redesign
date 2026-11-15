import request from '@/utils/request'

const api_base = '/gpt-api/class-quota'

// 获取班级配额列表
export function listClassQuotas(query) {
  return request({
    url: api_base + '/',
    method: 'get',
    params: query
  })
}

// 获取班级配额详细信息
export function getClassQuota(id) {
  return request({
    url: api_base + '/' + id,
    method: 'get'
  })
}

// 新增班级配额
export function addClassQuota(data) {
  return request({
    url: api_base,
    method: 'post',
    data: data
  })
}

// 修改班级配额
export function updateClassQuota(data) {
  return request({
    url: api_base + '/' + data.id,
    method: 'put',
    data: data
  })
}

// 删除班级配额
export function delClassQuota(id) {
  return request({
    url: api_base + '/' + id,
    method: 'delete'
  })
}

// 批量删除班级配额
export function delClassQuotas(ids) {
  return request({
    url: api_base + '/batch',
    method: 'delete',
    data: ids
  })
}

// 更新班级配额状态
export function updateClassQuotaStatus(id, data) {
  return request({
    url: api_base + '/' + id + '/status',
    method: 'put',
    data: data
  })
}

// 获取班级已分配的配额列表
export function getClassQuotasByClassId(classId) {
  return request({
    url: api_base + '/class/' + classId,
    method: 'get'
  })
}
