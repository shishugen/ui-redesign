import request from '@/utils/request'

// 查询资源加密列表
export function listLock(query) {
  return request({
    url: '/aigc/cloud/lock/list',
    method: 'get',
    params: query
  })
}

// 查询资源加密详细
export function getLock(lockId) {
  return request({
    url: '/aigc/cloud/lock/' + lockId,
    method: 'get'
  })
}

// 新增资源加密
export function addLock(data) {
  return request({
    url: '/aigc/cloud/lock',
    method: 'post',
    data: data
  })
}

// 修改资源加密
export function updateLock(data) {
  return request({
    url: '/aigc/cloud/lock',
    method: 'put',
    data: data
  })
}

// 删除资源加密
export function delLock(lockId) {
  return request({
    url: '/aigc/cloud/lock/' + lockId,
    method: 'delete'
  })
}

//获取用户锁
export function getUserLock() {
  return request({
    url: '/aigc/cloud/lock/getUserLock',
    method: 'get'
  })
}
//验证密码
export function verificationPasswd(lockPasswd) {
  const params = {
    lockPasswd: lockPasswd,
  }
  return request({
    url: '/aigc/cloud/lock/verificationPasswd',
    params,
    method: 'post',
  })
}

// 重置密码
export function resetPwd(data) {
  return request({
    url: '/aigc/cloud/lock/resetPwd',
    method: 'put',
    data: data
  })
}
