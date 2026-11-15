import request from '@/utils/request'

// 查询资源共享列表
export function listShare(query) {
  return request({
    url: '/aigc/cloud/share/list',
    method: 'get',
    params: query
  })
}

// 查询资源共享列表(云盘用户分享)
export function listShareByUser(query) {
  return request({
    url: '/aigc/cloud/share/userShareList',
    method: 'get',
    params: query
  })
}

// 查询资源共享详细
export function getShare(shareId) {
  return request({
    url: '/aigc/cloud/share/' + shareId,
    method: 'get'
  })
}

// 新增资源共享
export function addShare(data) {
  return request({
    url: '/aigc/cloud/share',
    method: 'post',
    data: data
  })
}

// 修改资源共享
export function updateShare(data) {
  return request({
    url: '/aigc/cloud/share',
    method: 'put',
    data: data
  })
}

// 删除资源共享
export function delShare(shareId) {
  return request({
    url: '/aigc/cloud/share/' + shareId,
    method: 'delete'
  })
}

// 根据链接后缀获取分享信息
export function getShareByLinkSuffix(linkSuffix) {
  var params={
    linkSuffix:linkSuffix
  }
  return request({
    url: '/aigc/cloud/share/getShareByLinkSuffix',
    method: 'get',
    params:params,
    headers: {
      isToken: false
    },
  })
}

// 验证提取码
export function verifyExtractCode(extractCode) {
  var params={
    extractCode:extractCode,
  }
  return request({
    url: '/aigc/cloud/share/verifyExtractCode',
    method: 'post',
    params,
    headers: {
      isToken: false
    },
  })
}
