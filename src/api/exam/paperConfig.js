import request from '@/utils/request'

// 查询试卷配置列表
export function listConfig(query) {
  return request({
    url: '/aigc/exam/paperConfig/list',
    method: 'get',
    params: query
  })
}

// 查询试卷配置详细
export function getConfig(configId) {
  return request({
    url: '/aigc/exam/paperConfig/' + configId,
    method: 'get'
  })
}

// 新增试卷配置
export function addConfig(data) {
  return request({
    url: '/aigc/exam/paperConfig',
    method: 'post',
    data: data
  })
}

// 修改试卷配置
export function updateConfig(data) {
  return request({
    url: '/aigc/exam/paperConfig',
    method: 'put',
    data: data
  })
}

// 删除试卷配置
export function delConfig(configId) {
  return request({
    url: '/aigc/exam/paperConfig/' + configId,
    method: 'delete'
  })
}

// 查询试卷配置明细
export function getPaperConfigList(paperId,gradeId,hasAnswer) {
  var params = {
    paperId: paperId,
    gradeId: gradeId,
    hasAnswer: hasAnswer
  }
  return request({
    url: '/aigc/exam/paperConfig/getPaperConfigList',
    method: 'get',
    params: params
  })
}
