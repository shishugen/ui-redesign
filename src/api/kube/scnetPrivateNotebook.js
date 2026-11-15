import request from '@/utils/request'
const requestTimeout = 30000

export function listScnetPrivateNotebook(query) {
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/list',
    method: 'get',
    params: query
  })
}

export function findListScnetPrivateNotebook(query) {
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/findList',
    method: 'get',
    params: query
  })
}

export function listScnetPrivateNotebookHistory(query) {
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/historyList',
    method: 'get',
    params: query
  })
}

export function getScnetPrivateNotebook(scnetNotebookId) {
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/' + scnetNotebookId,
    method: 'get'
  })
}

export function addScnetPrivateNotebook(data) {
  return request({
    url: '/aigc/kube/scnetPrivateNotebook',
    method: 'post',
    data: data
  })
}

export function updateScnetPrivateNotebook(data) {
  return request({
    url: '/aigc/kube/scnetPrivateNotebook',
    method: 'put',
    data: data
  })
}

// 删除超算notebook个人用机
// forceLocalDelete=true 时跳过远程关机/释放流程：远程实例已不存在时直接删除本地记录
export function delScnetPrivateNotebook(scnetNotebookIds, forceLocalDelete = false) {
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/' + scnetNotebookIds,
    method: 'delete',
    params: forceLocalDelete ? { forceLocalDelete: true } : {}
  })
}

export function createScnetNotebook(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/createNotebook',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

export function stopScnetNotebook(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/stopNotebook',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

export function startScnetNotebook(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/startNotebook',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

export function releaseScnetNotebook(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/releaseNotebook',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

export function syncScnetNotebook(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/syncNotebook',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

// 延长超算notebook使用时长
export function extendNotebook(data) {
  return request({
    url: '/aigc/kube/scnetPrivateNotebook/extendNotebook',
    method: 'post',
    data: data,
    timeout: requestTimeout
  })
}
