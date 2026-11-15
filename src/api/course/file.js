import request from '@/utils/request'

// 查询课程附件列表
export function listFile(query) {
  return request({
    url: '/aigc/course/file/list',
    method: 'get',
    params: query
  })
}
export function findListFile(query) {
  return request({
    url: '/aigc/course/file/findList',
    method: 'get',
    params: query
  })
}
// 查询课程附件详细
export function getFile(fileId) {
  return request({
    url: '/aigc/course/file/' + fileId,
    method: 'get'
  })
}

// 新增课程附件
export function addFile(data) {
  return request({
    url: '/aigc/course/file',
    method: 'post',
    data: data
  })
}

// 修改课程附件
export function updateFile(data) {
  return request({
    url: '/aigc/course/file',
    method: 'put',
    data: data
  })
}

// 删除课程附件
export function delFile(fileId) {
  return request({
    url: '/aigc/course/file/' + fileId,
    method: 'delete'
  })
}
