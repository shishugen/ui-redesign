import request from '@/utils/request'

// 查询考试成绩列表
export function listGrade(query) {
  return request({
    url: '/aigc/exam/grade/list',
    method: 'get',
    params: query
  })
}
// 查询考试成绩列表
export function findListGrade(query) {
  return request({
    url: '/aigc/exam/grade/fingList',
    method: 'get',
    params: query
  })
}

// 查询考试成绩列表
export function listGradePlus(query) {
  return request({
    url: '/aigc/exam/grade/listPlus',
    method: 'get',
    params: query
  })
}
// 查询考试成绩列表
export function findListGradePlus(query) {
  return request({
    url: '/aigc/exam/grade/fingListPlus',
    method: 'get',
    params: query
  })
}

// 查询考试成绩详细
export function getExamGrade(examId,userId) {
  var params = {
    examId: examId,
    userId: userId
  }
  return request({
    url: '/aigc/exam/grade/getExamGrade',
    method: 'get',
    params: params
  })
}


// 查询考试成绩详细
export function getGrade(gradeId) {
  return request({
    url: '/aigc/exam/grade/' + gradeId,
    method: 'get'
  })
}

// 新增考试成绩
export function addGrade(data) {
  return request({
    url: '/aigc/exam/grade',
    method: 'post',
    data: data
  })
}

// 修改考试成绩
export function updateGrade(data) {
  return request({
    url: '/aigc/exam/grade',
    method: 'put',
    data: data
  })
}

// 删除考试成绩
export function delGrade(gradeId) {
  return request({
    url: '/aigc/exam/grade/' + gradeId,
    method: 'delete'
  })
}

// 初始化成绩对象
export function initExamGrade(examId,paperId,userId,timing) {
  var params={
    examId: examId,
    paperId: paperId,
    userId: userId,
    timing: timing,
  }
  return request({
    url: '/aigc/exam/grade/initExamGrade',
    method: 'post',
    params,
  })
}
// 提交考试成绩
export function submitExamGrade(gradeId) {
  var params={gradeId: gradeId}
  return request({
    url: '/aigc/exam/grade/submitExamGrade',
    method: 'post',
    params,
  })
}

