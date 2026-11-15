import request from '@/utils/request'

// 查询考试安排列表
export function listExam(query) {
  return request({
    url: '/aigc/exam/exam/list',
    method: 'get',
    params: query
  })
}

// 查询考试安排列表
export function findListExam(query) {
  return request({
    url: '/aigc/exam/exam/findList',
    method: 'get',
    params: query
  })
}

// 查询考试安排列表
export function listExamPlus(query) {
  return request({
    url: '/aigc/exam/exam/listPlus',
    method: 'get',
    params: query
  })
}

// 查询考试安排列表
export function findListExamPlus(query) {
  return request({
    url: '/aigc/exam/exam/findListPlus',
    method: 'get',
    params: query
  })
}

// 查询考试安排详细
export function getExam(examId) {
  return request({
    url: '/aigc/exam/exam/' + examId,
    method: 'get'
  })
}

// 新增考试安排
export function addExam(data) {
  return request({
    url: '/aigc/exam/exam',
    method: 'post',
    data: data
  })
}

// 修改考试安排
export function updateExam(data) {
  return request({
    url: '/aigc/exam/exam',
    method: 'put',
    data: data
  })
}

// 删除考试安排
export function delExam(examId) {
  return request({
    url: '/aigc/exam/exam/' + examId,
    method: 'delete'
  })
}


// 结束考试安排
export function endExam(examId) {
  var params = {examId: examId}
  return request({
    url: '/aigc/exam/exam/endExam',
    method: 'post',
    params
  })
}
