import request from '@/utils/request'

// 查询服务器信息列表
export function listServerInfo(query) {
  return request({
    url: '/aigc/kube/serverInfo/list',
    method: 'get',
    params: query
  })
}

// 查询服务器信息详细
export function getServerInfo(id) {
  return request({
    url: '/aigc/kube/serverInfo/' + id,
    method: 'get'
  })
}

// 新增服务器信息
export function addServerInfo(data) {
  return request({
    url: '/aigc/kube/serverInfo',
    method: 'post',
    data: data
  })
}

// 修改服务器信息
export function updateServerInfo(data) {
  return request({
    url: '/aigc/kube/serverInfo',
    method: 'put',
    data: data
  })
}

// 删除服务器信息
export function delServerInfo(id) {
  return request({
    url: '/aigc/kube/serverInfo/' + id,
    method: 'delete'
  })
}

// 测试服务器连接
export function testServerConnection(data) {
  return request({
    url: '/terminal/api/ssh/test',
    method: 'post',
    data: data
  })
}

// 修改服务器密码
export function updateServerPassword(data) {
  return request({
    url: '/aigc/kube/serverInfo/updatePassword',
    method: 'put',
    params:data
  })
}

// Docker服务器探活（server_type=2 专用，回写 runtime_ready/last_probe_time）
export function probeDockerServer(serverInfoId) {
  return request({
    url: '/aigc/kube/serverInfo/probe/' + serverInfoId,
    method: 'post'
  })
}
