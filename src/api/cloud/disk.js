import request from '@/utils/request'
let baseUrl = process.env.NODE_ENV === 'development' ? '/dev-api' : '/prod-api';
//上传地址(单文件)
const uploadUrl = baseUrl + '/aigc/cloud/disk/upload';

//分片上传地址
const uploadChunkUrl = baseUrl + '/aigc/cloud/disk/uploadChunk';

//下载地址
const downloadUrl = baseUrl + '/aigc/cloud/disk/download/';

//打包下载
const downloadZipUrl = baseUrl + '/aigc/cloud/disk/downloadZip/';

//预览前缀
const previewUrl = '/preview/group1/';

export {uploadUrl,uploadChunkUrl,downloadUrl,downloadZipUrl,previewUrl}
// 查询云盘资源列表
export function listDisk(query) {
  return request({
    url: '/aigc/cloud/disk/list',
    method: 'get',
    params: query
  })
}

// 查询云盘资源详细
export function getDisk(diskId) {
  return request({
    url: '/aigc/cloud/disk/' + diskId,
    method: 'get'
  })
}

// 新增云盘资源
export function addDisk(data) {
  return request({
    url: '/aigc/cloud/disk',
    method: 'post',
    data: data
  })
}

// 修改云盘资源
export function updateDisk(data) {
  return request({
    url: '/aigc/cloud/disk',
    method: 'put',
    data: data
  })
}

// 删除云盘资源
export function delDisk(diskId) {
  return request({
    url: '/aigc/cloud/disk/' + diskId,
    method: 'delete'
  })
}
// 刷新云盘资源
export function refreshCapacity() {
  return request({
    url: '/aigc/cloud/disk/refreshCapacity',
    method: 'post',
  })
}

// 获取云盘资源
export function getPrivateCapacity() {
  return request({
    url: '/aigc/cloud/disk/getPrivateCapacity',
    method: 'get',
  })
}

// 回收资源
export function recycleDisks(ids) {
  var params={
    ids:ids
  }
  return request({
    url: '/aigc/cloud/disk/recycle',
    method: 'post',
    params,
  })
}

// 还原资源
export function restoreDisks(ids) {
  var params={
    ids:ids
  }
  return request({
    url: '/aigc/cloud/disk/restore',
    method: 'post',
    params,
  })
}

// 清空回收站
export function emptyRecycle() {
  return request({
    url: '/aigc/cloud/disk/emptyRecycle',
    method: 'post',
  })
}

// 移动云盘资源
export function moveDisk(data) {
  return request({
    url: '/aigc/cloud/disk/move',
    method: 'put',
    data: data
  })
}

//获取回收限期
export function getRecycleCacheTime() {
  return request({
    url: '/aigc/cloud/disk/getRecycleCacheTime',
    method: 'get',
  })
}


// 联合查询分享资源
export function shareList(query) {
  return request({
    url: '/aigc/cloud/disk/shareList',
    method: 'get',
    params: query,
    headers: {
      isToken: false
    },
  })
}
// 联合查询分享资源(受分享者查询)
export function findUserShareList(query) {
  return request({
    url: '/aigc/cloud/disk/findUserShareList',
    method: 'get',
    params: query,
  })
}

/**
 * 批量下载文件
 * */
export function batchDownload(ids){
  const params = {ids: ids.join(',')}
  return request({
    url: `/aigc/cloud/disk/batchZipDownload`,
    params,
    method: 'post'
  })
}

/***
 * 检查下载压缩情况
 * @param packageId
 * @returns {*}
 */
export function checkDownloadZipState (packageId){
  const params = {packageId: packageId}
  return request({
    url: `/aigc/cloud/disk/checkDownloadZipState`,
    params,
    method: 'get'
  })
}
