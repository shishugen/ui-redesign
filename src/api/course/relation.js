import request from '@/utils/request'

// 查询课程实训关联列表
export function listRelation(query) {
  return request({
    url: '/aigc/course/relation/list',
    method: 'get',
    params: query
  })
}

export function findListRelation(query) {
  return request({
    url: '/aigc/course/relation/findList',
    method: 'get',
    params: query
  })
}

// 查询课程实训关联详细
export function getRelation(relationId) {
  return request({
    url: '/aigc/course/relation/' + relationId,
    method: 'get'
  })
}

// 新增课程实训关联
export function addRelation(data) {
  return request({
    url: '/aigc/course/relation',
    method: 'post',
    data: data
  })
}

// 修改课程实训关联
export function updateRelation(data) {
  return request({
    url: '/aigc/course/relation',
    method: 'put',
    data: data
  })
}

// 删除课程实训关联
export function delRelation(relationId) {
  return request({
    url: '/aigc/course/relation/' + relationId,
    method: 'delete'
  })
}
