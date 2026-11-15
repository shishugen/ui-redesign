import request from '@/utils/request'
const requestTimeout = 30000

export function listScnetPrivateContainer(query) {
  return request({
    url: '/aigc/kube/scnetPrivateContainer/list',
    method: 'get',
    params: query
  })
}

export function findListScnetPrivateContainer(query) {
  return request({
    url: '/aigc/kube/scnetPrivateContainer/findList',
    method: 'get',
    params: query
  })
}

export function listScnetPrivateContainerHistory(query) {
  return request({
    url: '/aigc/kube/scnetPrivateContainer/historyList',
    method: 'get',
    params: query
  })
}

export function getScnetPrivateContainer(id) {
  return request({
    url: '/aigc/kube/scnetPrivateContainer/' + id,
    method: 'get'
  })
}

export function addScnetPrivateContainer(data) {
  return request({
    url: '/aigc/kube/scnetPrivateContainer',
    method: 'post',
    data: data
  })
}

export function updateScnetPrivateContainer(data) {
  return request({
    url: '/aigc/kube/scnetPrivateContainer',
    method: 'put',
    data: data
  })
}

export function delScnetPrivateContainer(ids) {
  return request({
    url: '/aigc/kube/scnetPrivateContainer/' + ids,
    method: 'delete'
  })
}

export function createScnetContainer(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateContainer/createContainer',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

export function syncScnetContainer(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateContainer/syncContainer',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

export function releaseScnetContainer(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateContainer/releaseContainer',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

export function stopScnetContainer(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateContainer/stopContainer',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

export function restartScnetContainer(id) {
  var params = { id: id }
  return request({
    url: '/aigc/kube/scnetPrivateContainer/restartContainer',
    method: 'post',
    params: params,
    timeout: requestTimeout
  })
}

export function getScnetContainerUrl(clusterId, containerId) {
  return request({
    url: '/aigc/kube/scnetPrivateContainer/getScnetContainerUrl',
    method: 'get',
    params: { clusterId: clusterId, containerId: containerId },
    timeout: requestTimeout
  })
}

export function getAreaList() {
  return request({
    url: '/aigc/kube/scnetPrivateContainer/getAreaList',
    method: 'get',
    timeout: requestTimeout
  })
}
