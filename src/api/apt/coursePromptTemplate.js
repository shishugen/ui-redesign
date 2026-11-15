import request from '@/utils/request'

const api_base = '/gpt-api/course-prompt-templates'

// 查询课程提示词模板列表
export function listTemplates(query) {
  // 先解构出需要的参数，避免传递多余的参数
  const { pageNum, pageSize, page, size, ...restParams } = query || {}
  
  const params = {
    ...restParams,
    page: page || pageNum || 1,
    size: size || pageSize || 10
  }

  return request({
    url: api_base + '/list',
    method: 'get',
    params: params
  })
}

// 查询课程提示词模板详细
export function getTemplate(id) {
  return request({
    url: api_base + '/' + id,
    method: 'get'
  })
}

// 根据 prompt_key 查询课程提示词模板
export function getTemplateByKey(promptKey) {
  return request({
    url: api_base + '/by-key/' + promptKey,
    method: 'get'
  })
}

// 新增课程提示词模板
export function addTemplate(data) {
  return request({
    url: api_base,
    method: 'post',
    data: data
  })
}

// 修改课程提示词模板
export function updateTemplate(data) {
  return request({
    url: api_base + '/' + data.id,
    method: 'put',
    data: data
  })
}

// 删除课程提示词模板
export function delTemplate(id) {
  return request({
    url: api_base + '/' + id,
    method: 'delete'
  })
}

// 启用课程提示词模板
export function enableTemplate(id) {
  return request({
    url: api_base + '/' + id + '/enable',
    method: 'post'
  })
}

// 禁用课程提示词模板
export function disableTemplate(id) {
  return request({
    url: api_base + '/' + id + '/disable',
    method: 'post'
  })
}

// 清空课程提示词模板缓存
export function clearTemplateCache() {
  return request({
    url: api_base + '/clear-cache',
    method: 'post'
  })
}
