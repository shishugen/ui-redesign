import request from '@/utils/request'

// 更新资源平台配置
export function updateResourcesPlatform(data) {
  return request({
    url: '/aigc/kube/resource/updateResourcesPlatform',
    method: 'put',
    data
  })
}

// 获取资源平台配置
export function getResourcesPlatform() {
  return request({
    url: '/aigc/kube/resource/getResourcesPlatform',
    method: 'get'
  })
}


