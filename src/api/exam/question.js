import request from '@/utils/request'
let baseUrl = process.env.NODE_ENV === 'development' ? '/dev-api' : '/prod-api';
//导入上传链接
const importUploadUrl = baseUrl + '/aigc/exam/question/import';
export {importUploadUrl}

// 查询题目列表
export function listQuestion(query) {
  return request({
    url: '/aigc/exam/question/list',
    method: 'get',
    params: query
  })
}
// 查询题目列表
export function findListQuestion(query) {
  return request({
    url: '/aigc/exam/question/findList',
    method: 'get',
    params: query
  })
}

// 查询题目详细
export function getQuestion(questionId) {
  return request({
    url: '/aigc/exam/question/' + questionId,
    method: 'get'
  })
}

// 新增题目
export function addQuestion(data) {
  return request({
    url: '/aigc/exam/question',
    method: 'post',
    data: data
  })
}

// 修改题目
export function updateQuestion(data) {
  return request({
    url: '/aigc/exam/question',
    method: 'put',
    data: data
  })
}

// 删除题目
export function delQuestion(questionId) {
  return request({
    url: '/aigc/exam/question/' + questionId,
    method: 'delete'
  })
}


// 保存题目
export function saveQuestion(data) {
  return request({
    url: '/aigc/exam/question/saveQuestion',
    method: 'post',
    data: data
  })
}

/**
 * 下载模板新版
 * @param fileId 模板ID
 */
export const downloadTemplate = (filename,type) => {
  const data = {
    filename: filename,
    type: type,
  }
  return request({
    url: '/aigc/exam/question/template', // 接口名字
    method: 'post',
    params: data,
    responseType: 'blob'
  })
}


// 导出选中的数据
export function exportQuestion(ids) {
  return request({
    url: '/aigc/exam/question/exportQuestion',
    method: 'post',
    data: ids,
    responseType: 'blob'
  })
}


// 检查导入状态
export function checkImport(importFlag) {
  var params={
    importFlag: importFlag
  }
  return request({
    url: '/aigc/exam/question/checkImport',
    method: 'get',
    params
  })
}
