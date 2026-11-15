import request from '@/utils/request'

// 查询系统标签列表
export function listLabel(query) {
  return request({
    url: '/system/label/list',
    method: 'get',
    params: query
  })
}

export function findListLabel(query) {
  return request({
    url: '/system/label/findList',
    method: 'get',
    params: query
  })
}

// 查询系统标签详细
export function getLabel(labelId) {
  return request({
    url: '/system/label/' + labelId,
    method: 'get'
  })
}

// 新增系统标签
export function addLabel(data) {
  return request({
    url: '/system/label',
    method: 'post',
    data: data
  })
}

// 修改系统标签
export function updateLabel(data) {
  return request({
    url: '/system/label',
    method: 'put',
    data: data
  })
}

// 删除系统标签
export function delLabel(labelId) {
  return request({
    url: '/system/label/' + labelId,
    method: 'delete'
  })
}
