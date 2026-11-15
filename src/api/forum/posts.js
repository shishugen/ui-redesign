import request from '@/utils/request'

// 查询帖子列表
export function listPosts(query) {
  return request({
    url: '/aigc/forum/posts/list',
    method: 'get',
    params: query
  })
}

// 条件查询帖子列表
export function findPosts(query) {
  return request({
    url: '/aigc/forum/posts/findList',
    method: 'get',
    params: query
  })
}

// 查询帖子详细
export function getPosts(postId) {
  return request({
    url: '/aigc/forum/posts/' + postId,
    method: 'get'
  })
}

// 新增帖子
export function addPosts(data) {
  return request({
    url: '/aigc/forum/posts',
    method: 'post',
    data: data
  })
}

// 修改帖子
export function updatePosts(data) {
  return request({
    url: '/aigc/forum/posts',
    method: 'put',
    data: data
  })
}

// 删除帖子
export function delPosts(postIds) {
  return request({
    url: '/aigc/forum/posts/' + postIds,
    method: 'delete'
  })
}

// 点赞
export function likePosts(postId) {
  return request({
    url: '/aigc/forum/posts/' + postId + '/like',
    method: 'post'
  })
}

// 踩
export function dislikePosts(postId) {
  return request({
    url: '/aigc/forum/posts/' + postId + '/dislike',
    method: 'post'
  })
}

// 取消点赞
export function unlikePosts(postId) {
  return request({
    url: '/aigc/forum/posts/' + postId + '/unlike',
    method: 'post'
  })
}

// 取消踩
export function undislikePosts(postId) {
  return request({
    url: '/aigc/forum/posts/' + postId + '/undislike',
    method: 'post'
  })
}

// 增加阅读数
export function viewPosts(postId) {
  return request({
    url: '/aigc/forum/posts/' + postId + '/view',
    method: 'post'
  })
}

// 获取热门帖子（一个月内阅读数最多的5个）
export function getHotPosts() {
  return request({
    url: '/aigc/forum/posts/hot',
    method: 'get'
  })
}

// 审核帖子
export function reviewPost(postId, status) {
  return request({
    url: '/aigc/forum/posts/' + postId + '/review',
    method: 'put',
    params: { status: status }
  })
}

// 批量审核帖子
export function batchReviewPost(postIds, status) {
  return request({
    url: '/aigc/forum/posts/batchReview',
    method: 'put',
    data: postIds,
    params: { status: status }
  })
}