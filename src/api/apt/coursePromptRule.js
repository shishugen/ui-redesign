import request from '@/utils/request'

const api_base = '/gpt-api/course-prompt-rules'

//超时时间
const timeout = 60000 // 60秒超时

// 查询课程提示词规则列表
export function listRules(query) {
  // 先解构出需要的参数，避免传递多余的参数
  const { pageNum, pageSize, page, size, ...restParams } = query || {}
  
  const params = {
    ...restParams,
    page: page || pageNum || 1,
    size: size || pageSize || 10
  }

  // 如果 is_public 为 undefined 或 null，设置默认值为 1（公开）
  if (params.is_public === undefined || params.is_public === null) {
    params.is_public = 1
  }

  return request({
    url: api_base + '/list',
    method: 'get',
    params: params,
    timeout: timeout
  })
}

// 根据用户ID查询课程提示词规则列表
export function listRulesByUserId(userId, query) {
  const params = {
    ...query,
    page: query?.page || 1,
    size: query?.size || 10
  }

  return request({
    url: api_base + '/list-by-user/' + userId,
    method: 'get',
    params: params,
    timeout: timeout
  })
}

// 查询课程提示词规则详细
export function getRule(id) {
  return request({
    url: api_base + '/' + id,
    method: 'get',
    timeout: timeout
  })
}

// 新增课程提示词规则
export function addRule(data) {
  return request({
    url: api_base,
    method: 'post',
    data: data,
    timeout: timeout  
  })
}

// 修改课程提示词规则
export function updateRule(id, data) {
  return request({
    url: api_base + '/' + id,
    method: 'put',
    data: data,
    timeout: timeout  
  })
}

// 删除课程提示词规则
export function delRule(id, userId) {
  return request({
    url: api_base + '/' + id,
    method: 'delete',
    params: { user_id: userId },
    timeout: timeout
  })
}

// 设置用户默认规则
export function setDefaultRule(data) {
  return request({
    url: api_base + '/default',
    method: 'post',
    data: data,
    timeout: timeout
  })
}

// 获取用户默认规则
export function getDefaultRule(userId) {
  return request({
    url: api_base + '/default/' + userId,
    method: 'get',
    timeout: timeout
  })
}

// 更新用户默认规则
export function updateDefaultRule(userId, ruleId) {
  return request({
    url: api_base + '/default/' + userId,
    method: 'put',
    data: ruleId,
    timeout: timeout
  })
}
