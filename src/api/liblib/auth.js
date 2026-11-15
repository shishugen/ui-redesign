import request from '@/utils/request'

// 查询liblib认证列表
export function listAuth(query) {
  return request({
    url: '/aigc/liblib/auth/list',
    method: 'get',
    params: query
  })
}

// 查询liblib认证详细
export function getAuth(liblibAuthId) {
  return request({
    url: '/aigc/liblib/auth/' + liblibAuthId,
    method: 'get'
  })
}

// 新增liblib认证
export function addAuth(data) {
  return request({
    url: '/aigc/liblib/auth',
    method: 'post',
    data: data
  })
}

// 修改liblib认证
export function updateAuth(data) {
  return request({
    url: '/aigc/liblib/auth',
    method: 'put',
    data: data
  })
}

// 删除liblib认证
export function delAuth(liblibAuthId) {
  return request({
    url: '/aigc/liblib/auth/' + liblibAuthId,
    method: 'delete'
  })
}
