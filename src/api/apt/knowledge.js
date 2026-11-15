import request from '@/utils/request'
const api_base = '/gpt-api/knowledge/base'

// 查询知识库列表
export function listKnowledge(query) {
  return request({
    url: api_base + '/list',
    method: 'get',
    params: query
  })
}
///public/list
// 查询公开知识库列表
export function listPublicKnowledge(query) {
  return request({
    url: api_base + '/public/list',
    method: 'get',
    params: query
  })
}
// 查询知识库详细
export function getKnowledge(id) {
  return request({
    url: api_base + '/get/' + id,
    method: 'get'
  })
}

// 新增知识库
export function addKnowledge(data) {
  return request({
    url: api_base + '/create',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 修改知识库
export function updateKnowledge(data) {
  return request({
    url: api_base + '/update/' + data.id,
    method: 'put',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 删除知识库
export function delKnowledge(kb_id, userId) {
  return request({
    url: api_base + '/delete',
    method: 'delete',
    headers: {
      'Content-Type': 'application/json'
    },
    params: { kb_id: kb_id, user_id: userId }
  })
}

// 搜索文档
export function searchDocuments(params) {
  return request({
    url: api_base + '/search',
    method: 'get',
    headers: {
      'Content-Type': 'application/json'
    },
    params: params
  })
}

// 清空知识库缓存
export function clearKnowledgeCache() {
  return request({
    url: api_base + '/clear-cache',
    method: 'post'
  })
}

// 重新索引选中知识库的所有文件
export function vectorizeKnowledgeBases(data) {
  return request({
    url: api_base + '/vectorize',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 查询知识库文件重新索引进度
export function getVectorizeProgress(kbIds, userId) {
  return request({
    url: api_base + '/vectorize/progress',
    method: 'get',
    params: { kb_ids: (kbIds || []).join(','), user_id: userId }
  })
}
