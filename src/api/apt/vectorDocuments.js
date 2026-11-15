import request from '@/utils/request'

const api_base = '/gpt-api/vector/documents'

// 查询向量文档列表
export function listVectorDocuments(query) {
  return request({
    url: api_base,
    method: 'get',
    params: query
  })
}

// 根据知识配置ID查询向量文档列表
export function listVectorDocumentsByKnowledgeId(knowledgeId, query) {
  return request({
    url: `/gpt-api/vector/knowledge/${knowledgeId}/documents`,
    method: 'get',
    params: query
  })
}

// 查询向量文档详细
export function getVectorDocument(id) {
  return request({
    url: api_base + '/' + id,
    method: 'get'
  })
}

// 新增向量文档
export function addVectorDocument(data) {
  return request({
    url: api_base,
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 修改向量文档
export function updateVectorDocument(data) {
  return request({
    url: api_base + '/' + data.id,
    method: 'put',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 删除向量文档
export function delVectorDocument(id) {
  return request({
    url: api_base + '/' + id,
    method: 'delete'
  })
}

// 上传向量文档文件
export function uploadVectorDocumentFile(formData) {
  return request({
    url: '/gpt-api/vector/documents/upload',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    data: formData
  })
}

// 通过ID索引文档
export function indexDocumentsById(data) {
  return request({
    url: '/gpt-api/vector/documents/index-by-id',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 获取文档向量数据
export function getDocumentVectorData(params) {
  return request({
    url: '/gpt-api/vector/documents/vector-data',
    method: 'get',
    params: params
  })
}

// 重新索引文档
export function reindexDocuments(data) {
  return request({
    url: '/gpt-api/vector/documents/reindex',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 搜索文档
export function searchDocuments(params) {
  return request({
    url: '/gpt-api/vector/documents/search',
    method: 'get',
    params: params
  })
}

// 获取知识库配置列表
export function listKnowledgeConfigs() {
  return request({
    url: '/gpt-api/vector/knowledge',
    method: 'get'
  })
}

// 初始化分片上传
export function initChunkUpload(data) {
  return request({
    url: '/gpt-api/vector/documents/chunk-upload/init',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 上传文件分片
export function uploadChunk(formData) {
  return request({
    url: '/gpt-api/vector/documents/chunk-upload',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 220000 ,// 2分钟超时，因为图像生成可能需要较长时间
    data: formData
  })
}

// 合并文件分片
export function mergeChunks(data) {
  return request({
    url: '/gpt-api/vector/documents/chunk-upload/merge',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
     timeout: 120000 ,// 2分钟超时，因为图像生成可能需要较长时间
    data: data
  })
}

// 获取分片上传状态
export function getChunkUploadStatus(fileId, userId) {
  return request({
    url: `/gpt-api/vector/documents/chunk-upload/status/${fileId}`,
    method: 'get',
    params: { user_id: userId }
  })
}

// 获取索引进度
export function getIndexProgress(knowledgeId, documentId, userId) {
  return request({
    url: '/gpt-api/vector/documents/index-progress',
    method: 'get',
    timeout: 120000 ,// 2分钟超时，因为图像生成可能需要较长时间
    params: { knowledge_id: knowledgeId, document_id: documentId, user_id: userId }
  })
}
