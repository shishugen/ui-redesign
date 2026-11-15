import request from '@/utils/request'

// 查询章节内容列表
export function listContent(query) {
  return request({
    url: '/aigc/course/chapter/content/list',
    method: 'get',
    params: query
  })
}
// 查询章节内容列表
export function findListContent(query) {
  return request({
    url: '/aigc/course/chapter/content/findList',
    method: 'get',
    params: query
  })
}
// 查询章节内容详细
export function getContent(contentId) {
  return request({
    url: '/aigc/course/chapter/content/' + contentId,
    method: 'get'
  })
}

// 新增章节内容
export function addContent(data) {
  return request({
    url: '/aigc/course/chapter/content',
    method: 'post',
    data: data
  })
}

// 修改章节内容
export function updateContent(data) {
  return request({
    url: '/aigc/course/chapter/content',
    method: 'put',
    data: data
  })
}

// 删除章节内容
export function delContent(contentId) {
  return request({
    url: '/aigc/course/chapter/content/' + contentId,
    method: 'delete'
  })
}
