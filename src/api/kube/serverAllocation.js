import request from '@/utils/request'

// 查询服务器资源分配列表
export function listServerAllocation(query) {
  return request({
    url: '/aigc/kube/serverAllocation/list',
    method: 'get',
    params: query
  })
}

// 查询服务器资源分配详细
export function getServerAllocation(allocationId) {
  return request({
    url: '/aigc/kube/serverAllocation/' + allocationId,
    method: 'get'
  })
}

// 新增服务器资源分配
export function addServerAllocation(data) {
  return request({
    url: '/aigc/kube/serverAllocation',
    method: 'post',
    data: data
  })
}

// 修改服务器资源分配
export function updateServerAllocation(data) {
  return request({
    url: '/aigc/kube/serverAllocation',
    method: 'put',
    data: data
  })
}

// 删除服务器资源分配
export function delServerAllocation(allocationId) {
  return request({
    url: '/aigc/kube/serverAllocation/' + allocationId,
    method: 'delete'
  })
}
