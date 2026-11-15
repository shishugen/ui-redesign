import request from '@/utils/request'

// 查询认证表列表
export function listAuth(query) {
  return request({
    url: '/aigc/kube/auth/list',
    method: 'get',
    params: query
  })
}

// 查询认证表详细
export function getAuth(authId) {
  return request({
    url: '/aigc/kube/auth/' + authId,
    method: 'get'
  })
}

// 新增认证表
export function addAuth(data) {
  return request({
    url: '/aigc/kube/auth',
    method: 'post',
    data: data
  })
}

// 修改认证表
export function updateAuth(data) {
  return request({
    url: '/aigc/kube/auth',
    method: 'put',
    data: data
  })
}

// 删除认证表
export function delAuth(authId) {
  return request({
    url: '/aigc/kube/auth/' + authId,
    method: 'delete'
  })
}

// syncToken
export function syncToken() {
  return request({
    url: '/aigc/kube/auth/syncToken',
    method: 'post'
  })
}

