import request from '@/utils/request'
const api_base = '/gpt-api/prompts'

// 查询分类标签列表
export function listCategories(query) {
  return request({
    url: api_base + '/categories/list',
    method: 'get',
    params: query
  })
}

// 查询分类标签详细
export function getCategories(id) {
  return request({
    url: api_base + '/categories/' + id,
    method: 'get'
  })
}

// 新增分类标签
export function addCategories(data) {
  return request({
    url: api_base+'/categories',
    method: 'post',
    data: data
  })
}

// 修改分类标签
export function updateCategories(data) {
  return request({
    url: api_base+'/categories'+'/' + data.id,
    method: 'put',
    data: data
  })
}

// 删除分类标签
export function delCategories(id) {
  return request({
    url: api_base + '/categories/' + id,
    method: 'delete'
  })
}
