import request from '@/utils/request'

// 查询评论列表
export function listComments(query) {
  return request({
    url: '/aigc/forum/comments/list',
    method: 'get',
    params: query
  })
}

// 条件查询评论列表
export function findComments(query) {
  return request({
    url: '/aigc/forum/comments/findList',
    method: 'get',
    params: query
  })
}

// 查询帖子的根评论（一级评论）
export function getRootComments(postId) {
  return request({
    url: '/aigc/forum/comments/root/' + postId,
    method: 'get'
  })
}

// 查询子评论
export function getChildComments(parentCommentId) {
  return request({
    url: '/aigc/forum/comments/child/' + parentCommentId,
    method: 'get'
  })
}

// 查询评论详细
export function getComments(commentId) {
  return request({
    url: '/aigc/forum/comments/' + commentId,
    method: 'get'
  })
}

// 新增评论
export function addComments(data) {
  return request({
    url: '/aigc/forum/comments',
    method: 'post',
    data: data
  })
}

// 修改评论
export function updateComments(data) {
  return request({
    url: '/aigc/forum/comments',
    method: 'put',
    data: data
  })
}

// 删除评论
export function delComments(commentIds) {
  return request({
    url: '/aigc/forum/comments/' + commentIds,
    method: 'delete'
  })
}

// 审核评论
export function reviewComment(commentId, status) {
  return request({
    url: '/aigc/forum/comments/' + commentId + '/review',
    method: 'put',
    params: { status: status }
  })
}

// 批量审核评论
export function batchReviewComment(commentIds, status) {
  return request({
    url: '/aigc/forum/comments/batchReview',
    method: 'put',
    data: commentIds,
    params: { status: status }
  })
}