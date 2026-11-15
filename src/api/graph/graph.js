import request from '@/utils/request'
const baseUrl = '/graph'; 

// 连接数据库
export function connectNeo4j(data) {
  return request({
    url: `${baseUrl}/connect`,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: data
  })
}

// 获取数据源列表
export function sourcesList(data) {
  return request({
    url: `${baseUrl}/sources_list`,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: data
  })
}

// 抽取数据
export function generateGraph(data) {
  console.log('data',data)
  return request({
    url: `${baseUrl}/extract`,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: data
  })
}

// 获取文件抽取状态（SSE）
export function getExtractStatus(fileName, params = {}) {
  return request({
    url: `${baseUrl}/update_extract_status/${fileName}`,
    method: 'get',
    params
  })
}

// 删除文档和实体
export function deleteDocumentAndEntities(data) {
  return request({
    url: `${baseUrl}/delete_document_and_entities`,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: data
  })
}

// 获取chunktext
export function fetchChunktext(data){
  return request({
    url: `${baseUrl}/fetch_chunktext`,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: data
  })
}

// 图谱查询
export function graphQuery(data){
  return request({
    url: `${baseUrl}/graph_query`,
    method: 'post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: data
  })
}
