import request from '@/utils/request'

// 查询资源共享列表
export function listShareUser(query) {
  return request({
    url: '/aigc/cloud/user/list',
    method: 'get',
    params: query
  })
}

// 查询资源共享详细
export function getShareUser(shareId) {
  return request({
    url: '/aigc/cloud/user' + shareId,
    method: 'get'
  })
}

// 新增资源共享
export function addShareUser(data) {
  return request({
    url: '/aigc/cloud/user',
    method: 'post',
    data: data
  })
}

// 修改资源共享
export function updateShareUser(data) {
  return request({
    url: '/aigc/cloud/user',
    method: 'put',
    data: data
  })
}

// 删除资源共享
export function delShareUser(id) {
  return request({
    url: '/aigc/cloud/user/' + id,
    method: 'delete'
  })
}
