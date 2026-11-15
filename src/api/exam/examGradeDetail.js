import request from '@/utils/request'

// 查询考试成绩明细列表
export function listDetail(query) {
  return request({
    url: '/aigc/exam/gradeDetail/list',
    method: 'get',
    params: query
  })
}

// 查询考试成绩明细详细
export function getDetail(detailId) {
  return request({
    url: '/aigc/exam/gradeDetail/' + detailId,
    method: 'get'
  })
}

// 新增考试成绩明细
export function addDetail(data) {
  return request({
    url: '/aigc/exam/gradeDetail',
    method: 'post',
    data: data
  })
}

// 修改考试成绩明细
export function updateDetail(data) {
  return request({
    url: '/aigc/exam/gradeDetail',
    method: 'put',
    data: data
  })
}

// 删除考试成绩明细
export function delDetail(detailId) {
  return request({
    url: '/aigc/exam/gradeDetail/' + detailId,
    method: 'delete'
  })
}
