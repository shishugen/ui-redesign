import request from '@/utils/request'

// 查询系统门户列表
export function listPortal(query) {
  return request({
    url: '/system/portal/list',
    method: 'get',
    params: query
  })
}

// 查询系统门户详细
export function getPortal(id) {
  return request({
    url: '/system/portal/' + id,
    method: 'get'
  })
}

// 新增系统门户
export function addPortal(data) {
  return request({
    url: '/system/portal',
    method: 'post',
    data: data
  })
}

// 修改系统门户
export function updatePortal(data) {
  return request({
    url: '/system/portal',
    method: 'put',
    data: data
  })
}

// 删除系统门户
export function delPortal(id) {
  return request({
    url: '/system/portal/' + id,
    method: 'delete'
  })
}

// 获取最新一个
export function getLast() {
  return request({
    url: '/system/portal/getLast',
    method: 'get'
  })
}


// 启用门户
export function enablePortal(id) {
  var params = { id:id }
  return request({
    url: '/system/portal/enable',
    method: 'post',
    params,
  })
}
