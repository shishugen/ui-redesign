import request from '@/utils/request'

// 查询试卷试题列表
export function listQuestion(query) {
  return request({
    url: '/aigc/exam/paperQuestion/list',
    method: 'get',
    params: query
  })
}

// 查询试卷试题详细
export function getQuestion(id) {
  return request({
    url: '/aigc/exam/paperQuestion/' + id,
    method: 'get'
  })
}

// 新增试卷试题
export function addQuestion(data) {
  return request({
    url: '/aigc/exam/paperQuestion',
    method: 'post',
    data: data
  })
}

// 修改试卷试题
export function updateQuestion(data) {
  return request({
    url: '/aigc/exam/paperQuestion',
    method: 'put',
    data: data
  })
}

// 删除试卷试题
export function delQuestion(id) {
  return request({
    url: '/aigc/exam/paperQuestion/' + id,
    method: 'delete'
  })
}
