import request from '@/utils/request'

// 查询实验报告附件列表
export function listFile(query) {
  return request({
    url: '/aigc/learning/file/list',
    method: 'get',
    params: query
  })
}

// 查询实验报告附件详细
export function getFile(id) {
  return request({
    url: '/aigc/learning/file/' + id,
    method: 'get'
  })
}

// 新增实验报告附件
export function addFile(data) {
  return request({
    url: '/aigc/learning/file',
    method: 'post',
    data: data
  })
}

// 修改实验报告附件
export function updateFile(data) {
  return request({
    url: '/aigc/learning/file',
    method: 'put',
    data: data
  })
}

// 删除实验报告附件
export function delFile(id) {
  return request({
    url: '/aigc/learning/file/' + id,
    method: 'delete'
  })
}
