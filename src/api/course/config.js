import request from '@/utils/request'

// 查询课程配置列表
export function listConfig(query) {
  return request({
    url: '/aigc/course/config/list',
    method: 'get',
    params: query
  })
}

export function findListConfig(query) {
  return request({
    url: '/aigc/course/config/findList',
    method: 'get',
    params: query
  })
}
export function findConfigImageList(query) {
  return request({
    url: '/aigc/course/config/findConfigImageList',
    method: 'get',
    params: query
  })
}

// 查询课程配置详细
export function getConfig(configId) {
  return request({
    url: '/aigc/course/config/' + configId,
    method: 'get'
  })
}

// 新增课程配置
export function addConfig(data) {
  return request({
    url: '/aigc/course/config',
    method: 'post',
    data: data
  })
}

// 修改课程配置
export function updateConfig(data) {
  return request({
    url: '/aigc/course/config',
    method: 'put',
    data: data
  })
}

// 删除课程配置
export function delConfig(configId) {
  return request({
    url: '/aigc/course/config/' + configId,
    method: 'delete'
  })
}

