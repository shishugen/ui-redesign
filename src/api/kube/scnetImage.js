import request from '@/utils/request'
const requestTimeout = 30000

// 查询超算镜像列表
export function listImage(query) {
  return request({
    url: '/aigc/kube/scnetImage/list',
    method: 'get',
    params: query
  })
}

// 查询超算镜像详细
export function getImage(imageId) {
  return request({
    url: '/aigc/kube/scnetImage/' + imageId,
    method: 'get'
  })
}

// 新增超算镜像
export function addImage(data) {
  return request({
    url: '/aigc/kube/scnetImage',
    method: 'post',
    data: data
  })
}

// 修改超算镜像
export function updateImage(data) {
  return request({
    url: '/aigc/kube/scnetImage',
    method: 'put',
    data: data
  })
}

// 删除超算镜像
export function delImage(imageId) {
  return request({
    url: '/aigc/kube/scnetImage/' + imageId,
    method: 'delete'
  })
}


//同步镜像
export function syncScnetImage() {
  return request({
    url: '/aigc/kube/scnetImage/syncImage',
    method: 'post',
    timeout: requestTimeout
  })
}

//查询已启用的镜像列表
export function listEnabled() {
  return request({
    url: '/aigc/kube/scnetImage/listEnabled',
    method: 'get',
  })
}