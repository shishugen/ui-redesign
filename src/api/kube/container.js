import request from '@/utils/request'
const requestTimeout = 30000
let baseUrl = process.env.NODE_ENV === 'development' ? '/dev-api' : '/prod-api';

 const downloadUrl = baseUrl + '/aigc/kube/container/file/downloadFile' // 接口名字
 const uploadChunkUrl = baseUrl + '/aigc/kube/container/uploadChunk';


export {downloadUrl,uploadChunkUrl}
// 查询容器列表
export function listContainer(query) {
  return request({
    url: '/aigc/kube/container/list',
    method: 'get',
    params: query
  })
}


export function findListContainer(query) {
  return request({
    url: '/aigc/kube/container/findList',
    method: 'get',
    params: query
  })
}


// 查询容器详细
export function getContainer(containerId) {
  return request({
    url: '/aigc/kube/container/' + containerId,
    method: 'get'
  })
}



export function findContainerFile(params) {
  return request({
    url: '/aigc/kube/container/findContainerFile',
    method: 'get',
    params: params
  })
}

// 新增镜像
export function addContainer(data) {
  return request({
    url: '/aigc/kube/container',
    method: 'post',
    data: data
  })
}

// 创建容器
export function createContainer(data) {
  return request({
    url: '/aigc/kube/container/createContainer',
    method: 'post',
    data: data
  })
}
// 修改镜像
export function updateContainer(data) {
  return request({
    url: '/aigc/kube/container/updateContainer',
    method: 'put',
    data: data
  })
}

// 删除容器
export function delContainer(containerId) {
  return request({
    url: '/aigc/kube/container/' + containerId,
    method: 'delete'
  })
}


// 重启容器
export function restartContainer(ids) {
  return request({
    url: '/aigc/kube/container/restartContainer',
    method: 'post',
    params: {ids: ids}
  })
}

// 同步容器
export function syncContainer(ids) {
  return request({
    url: '/aigc/kube/container/syncContainer',
    method: 'post',
    params: {ids: ids}
  })
}
//同步
export function syncContainerById(id) {
  return request({
    url: '/aigc/kube/container/syncContainerById',
    method: 'post',
    params: {id: id}
  })
}


// 文件下载
export function downloadFile(params) {
  return request({
    url: '/aigc/kube/container/file/downloadFile',
    method: 'get',
    params: params,
    responseType: 'blob',
    headers: {
      'Accept': '*/*'
    }
  })
}


// 监听文件上传状态
export function listenerFileUploadState(params) {
  return request({
    url: '/aigc/kube/container/file/listenerFileUploadState',
    method: 'get',
    params: params
  })
}


