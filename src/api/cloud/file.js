import request from '@/utils/request'
const requestTimeout = 30000
let baseUrl = process.env.NODE_ENV === 'development' ? '/dev-api' : '/prod-api';
//上传地址(单文件)
const uploadUrl = baseUrl + '/aigc/cloud/file/upload';

//分片上传地址
const uploadChunkUrl = baseUrl + '/aigc/cloud/file/uploadChunk';

//下载地址
const downloadUrl = baseUrl + '/aigc/cloud/file/download/';
const downloadById = baseUrl + '/aigc/cloud/file/downloadById/';

//富文本上传地址
const ueditorUrl = baseUrl + '/aigc/cloud/file/ueditorConfig';

//富文本上传地址
const base64Url = baseUrl + '/aigc/cloud/file/uploadByCode';

//预览前缀
const previewUrl = '/preview/group1/';

export {uploadUrl,uploadChunkUrl,downloadUrl,downloadById,ueditorUrl,base64Url,previewUrl}

// 查询云盘附件文件列表
export function listFile(query) {
  return request({
    url: '/aigc/cloud/file/list',
    method: 'get',
    params: query
  })
}

// 查询云盘附件文件详细
export function getFile(fileId) {
  return request({
    url: '/aigc/cloud/file/' + fileId,
    method: 'get'
  })
}

// 新增云盘附件文件
export function addFile(data) {
  return request({
    url: '/aigc/cloud/file',
    method: 'post',
    data: data
  })
}

// 修改云盘附件文件
export function updateFile(data) {
  return request({
    url: '/aigc/cloud/file',
    method: 'put',
    data: data
  })
}

// 删除云盘附件文件
export function delFile(fileId) {
  return request({
    url: '/aigc/cloud/file/' + fileId,
    method: 'delete'
  })
}


// 用户头像上传
export function uploadByBase64(data) {
  return request({
    url: '/aigc/cloud/file/uploadByCode',
    method: 'post',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: data,
    timeout: requestTimeout,
  })
}


// 在线url上传
export function uploadByUrl(url) {
  var params = {
    url: url
  }
  return request({
    url: '/aigc/cloud/file/uploadByUrl',
    method: 'post',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    params
  })
}

