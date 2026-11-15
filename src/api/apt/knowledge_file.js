import request from '@/utils/request'
const api_base = '/gpt-api/knowledge/file'

// 查询知识库文件夹列表
export function listKnowledgeFile(query) {
  return request({
    url: api_base + '/list',
    method: 'get',
    params: query
  })
}

// 查询知识库文件夹详细
export function getKnowledgeFile(id) {
  return request({
    url: api_base + '/get/' + id,
    method: 'get'
  })
}

// 查询知识库文件夹列表
export function queryChunksByFilename(knowledge_base_id, file_name) {
  return request({
    url: api_base + '/chunks/query',
    method: 'get',
    params: { knowledge_base_id: knowledge_base_id, file_name: file_name }
  })
}

// 删除知识库文件夹
export function delKnowledgeFile(id) {
  return request({
    url: api_base + '/delete/' + id,
    method: 'delete'
  })
}

// 批量删除知识库文件
export function batchDeleteKnowledgeFiles(data) {
  return request({
    url: api_base + '/docs/batch-delete',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 重新索引文档
export function reindexFile(data) {
  return request({
    url: api_base + '/reindex',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  })
}

// 初始化分片上传
export function initChunkUpload(data) {
  return request({
    url: api_base + '/chunk-upload/init',
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
    url: api_base + '/chunk-upload',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 220000, // 2分钟超时，因为图像生成可能需要较长时间
    data: formData
  })
}

// 获取分片上传状态
export function getChunkUploadStatus(fileId, userId) {
  return request({
    url: api_base + '/chunk-upload/status/' + fileId,
    method: 'get',
    params: { user_id: userId }
  })
}

// 合并文件分片
export function mergeChunks(data) {
  return request({
    url: api_base + '/chunk-upload/merge',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 120000, // 2分钟超时，因为图像生成可能需要较长时间
    data: data
  })
}
