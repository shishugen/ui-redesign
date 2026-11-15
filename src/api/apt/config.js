import request from '@/utils/request'

const api_base = '/gpt-api/config/'

// 根据配置键获取配置（Python 端路由是 /config/get/{key}，api_base 末尾已带斜杠，不能再拼）
export function getConfigByKey(config_key) {
  return request({
    url: api_base + 'get/' + config_key,
    method: 'get'
  })
}

// 出题文档截断上限：读动态配置键 QUESTION_MAX_DOC_CHARS。该键以「万字」为单位（后台填 10 即 10 万字），
// 这里乘 10000 换算成字符数返回，与后端 _get_max_doc_chars 同一口径；未配置、值非法或请求失败时返回 null 由调用方兜底
export async function getQuestionDocLimit() {
  try {
    const res = await getConfigByKey('QUESTION_MAX_DOC_CHARS')
    const wans = Number(res && res.data && res.data.config_value)
    return wans > 0 ? wans * 10000 : null
  } catch (e) {
    // 该接口带 ai:config:access 权限校验，没这个权限键的账号会 403，静默降级不能打断页面
    console.warn('读取 QUESTION_MAX_DOC_CHARS 配置失败，改用前端默认上限', e)
    return null
  }
}

// 获取配置列表，支持按分类或键过滤
export function listConfig(query) {
  return request({
    url: api_base,
    method: 'get',
    params: query
  })
}
// 获取配置列表，支持按分类或键过滤
export function categoryList(query) {
  return request({
    url: api_base + 'roots',
    method: 'get',
    params: query
  })
}

// 创建配置
export function addConfig(data) {
  return request({
    url: api_base + 'create',
    method: 'post',
    data: data
  })
}
// 创建配置
export function addDirectory(data) {
  return request({
    url: api_base + 'directory/create',
    method: 'post',
    data: data
  })
}

// 更新配置
export function updateConfig(config_key, data) {
  return request({
    url: api_base + 'update/' + config_key,
    method: 'put',
    data: data
  })
}
// 更新配置
export function updateDirectory(config_key, data) {
  return request({
    url: api_base + 'directory/' + config_key,
    method: 'put',
    data: data
  })
}


// 根据ID删除配置
export function delConfigById(config_id) {
  return request({
    url: api_base + 'delete-by-id/' + config_id,
    method: 'delete'
  })
}

// 清除配置缓存
export function clearConfigCache() {
  return request({
    url: api_base + 'clear-cache',
    method: 'post'
  })
}

export function getConfigsByParentId(parentId) {
  return request({
    url: api_base + 'parent/' + parentId,
    method: 'get'
  })
}
