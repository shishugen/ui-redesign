import request from '@/utils/request'

// 查询试卷列表
export function listPaper(query) {
  return request({
    url: '/aigc/exam/paper/list',
    method: 'get',
    params: query
  })
}

export function findListPaper(query) {
  return request({
    url: '/aigc/exam/paper/findList',
    method: 'get',
    params: query
  })
}

// 查询试卷详细
export function getPaper(paperId) {
  return request({
    url: '/aigc/exam/paper/' + paperId,
    method: 'get'
  })
}

// 新增试卷
export function addPaper(data) {
  return request({
    url: '/aigc/exam/paper',
    method: 'post',
    data: data
  })
}

// 修改试卷
export function updatePaper(data) {
  return request({
    url: '/aigc/exam/paper',
    method: 'put',
    data: data
  })
}

// 删除试卷
export function delPaper(paperId) {
  return request({
    url: '/aigc/exam/paper/' + paperId,
    method: 'delete'
  })
}

// 保存试卷
export function savePaper(data) {
  return request({
    url: '/aigc/exam/paper/savePaper',
    method: 'post',
    data: data
  })
}

// id查询试卷
export function getPaperById(paperId) {
  var params={paperId: paperId}
  return request({
    url: '/aigc/exam/paper/getPaperById',
    method: 'get',
    params: params
  })
}

// 停用试卷
export function disablePaper(paperId) {
  var params = {paperId: paperId}
  return request({
    url: '/aigc/exam/paper/disablePaper',
    method: 'post',
    params,
  })
}
