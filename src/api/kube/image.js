import request from '@/utils/request'

// 分页查询镜像列表
export function listImage(query) {
  return request({
    url: '/aigc/kube/image/list',
    method: 'get',
    params: query
  })
}

// 查询镜像列表
export function findListImage(query) {
  return request({
    url: '/aigc/kube/image/findList',
    method: 'get',
    params: query
  })
}

// 查询镜像详细
export function getImage(imageId) {
  return request({
    url: '/aigc/kube/image/' + imageId,
    method: 'get'
  })
}

// 新增镜像
export function addImage(data) {
  return request({
    url: '/aigc/kube/image',
    method: 'post',
    data: data
  })
}

// 修改镜像
export function updateImage(data) {
  return request({
    url: '/aigc/kube/image',
    method: 'put',
    data: data
  })
}

// 删除镜像
export function delImage(imageId) {
  return request({
    url: '/aigc/kube/image/' + imageId,
    method: 'delete'
  })
}

// 真删 Harbor 制品（管理员动作，与逻辑删注册行是两个接口）
export function delHarborArtifacts(imageId) {
  return request({
    url: '/aigc/kube/image/harbor/' + imageId,
    method: 'delete'
  })
}

// 同步镜像
export function syncImage() {
  return request({
    url: '/aigc/kube/image/sync',
    method: 'post'
  })
}

//监听同步状态
export function listenSyncStatus(identifier) {
  return request({
    url: '/aigc/kube/image/listenSyncStatus',
    method: 'get',
    params: {
      identifier: identifier
    }
  })
}

