import request from '@/utils/request'
const api_base = '/gpt-api/mode-class'

// 查询班级模型分配列表
export function listModeClasses(query) {
  return request({
    url: api_base + '/',
    method: 'get',
    params: query
  })
}

// 查询班级模型分配详细
export function getModeClass(id) {
  return request({
    url: api_base + '/' + id,
    method: 'get'
  })
}

// 新增班级模型分配
export function addModeClass(data) {
  return request({
    url: api_base,
    method: 'post',
    data: data
  })
}

// 修改班级模型分配
export function updateModeClass(data) {
  return request({
    url: api_base + '/',
    method: 'put',
    data: data
  })
}

// 删除班级模型分配
export function delModeClass(id) {
  return request({
    url: api_base + '/class/' + id,
    method: 'delete'
  })
}

// 更新班级模型分配状态
export function updateModeClassStatus(id, data) {
  return request({
    url: api_base + '/status/' + id,
    method: 'put',
    data: data
  })
}

// 查询班级已分配模型列表
export function listClassModes(classId) {
  return request({
    url: api_base + '/class/'+classId,
    method: 'get',
  })
}

// 批量添加班级模型分配
export function batchAddClassModes(data) {
  return request({
    url: api_base + '/batch',
    method: 'post',
    data: data
  })
}

// 删除班级模型关联
export function delClassMode(id) {
  return request({
    url: api_base + '/' + id,
    method: 'delete'
  })
}

// 更新班级模型关联状态
export function updateClassModeStatus(id, data) {
  return request({
    url: api_base + '/status/' + id,
    method: 'put',
    data: data
  })
}


// 根据班级ID获取所有已分配的模型
export function getActiveModelsByClassId(classId) {
  return request({
    url: api_base + '/class/' + classId + '/active-models',
    method: 'get'
  })
}
