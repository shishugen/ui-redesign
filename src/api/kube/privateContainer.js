import request from '@/utils/request'
const requestTimeout = 30000
// 查询个人用机列表
export function listPrivateContainer(query) {
  return request({
    url: '/aigc/kube/privateContainer/list',
    method: 'get',
    params: query
  })
}

export function findListPrivateContainer(query) {
  return request({
    url: '/aigc/kube/privateContainer/findList',
    method: 'get',
    params: query
  })
}

// 查询个人用机列表
export function listContainer(query) {
  return request({
    url: '/aigc/kube/privateContainer/listContainer',
    method: 'get',
    params: query
  })
}

export function findListContainer(query) {
  return request({
    url: '/aigc/kube/privateContainer/findListContainer',
    method: 'get',
    params: query
  })
}



// 分页查询历史个人用机列表
export function listHistoryContainer(query) {
  return request({
    url: '/aigc/kube/privateContainer/historyList',
    method: 'get',
    params: query
  })
}
//查询历史个人用机列表
export function findHistoryContainer(query) {
  return request({
    url: '/aigc/kube/privateContainer/findHistoryList',
    method: 'get',
    params: query
  })
}

// 查询个人用机详细
export function getPrivateContainer(id) {
  return request({
    url: '/aigc/kube/privateContainer/' + id,
    method: 'get'
  })
}

// 新增个人用机
export function addPrivateContainer(data) {
  return request({
    url: '/aigc/kube/privateContainer',
    method: 'post',
    data: data
  })
}

// 修改个人用机
export function updatePrivateContainer(data) {
  return request({
    url: '/aigc/kube/privateContainer',
    method: 'put',
    data: data
  })
}

// 删除个人用机
export function delPrivateContainer(id) {
  return request({
    url: '/aigc/kube/privateContainer/' + id,
    method: 'delete'
  })
}

// 创建资源
export function createContainer(id) {
  var params={id:id}
  return request({
    url: '/aigc/kube/privateContainer/createContainer',
    method: 'post',
    params: params,
    timeout: requestTimeout,
  })
}
// 同步资源
export function syncContainer(id) {
  var params={id:id}
  return request({
    url: '/aigc/kube/privateContainer/syncContainer',
    method: 'post',
    params: params,
    timeout: requestTimeout,
  })
}
// 释放资源
export function releaseContainer(id) {
  var params={id:id}
  return request({
    url: '/aigc/kube/privateContainer/releaseContainer',
    method: 'post',
    params: params,
    timeout: requestTimeout,
  })
}

// 延长本地容器使用时长
export function extendContainer(data) {
  return request({
    url: '/aigc/kube/privateContainer/extendContainer',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}
