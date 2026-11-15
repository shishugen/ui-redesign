import request from '@/utils/request'

// 查询liblib模型列表
export function listModel(query) {
  return request({
    url: '/aigc/liblib/model/list',
    method: 'get',
    params: query
  })
}


// 查询所有模型列表
export function listModelAll() {
  return request({
    url: '/aigc/liblib/model/list-all',
    method: 'get',
  })
}


// 查询liblib模型详细
export function getModel(liblibModelId) {
  return request({
    url: '/aigc/liblib/model/' + liblibModelId,
    method: 'get'
  })
}

// 新增liblib模型
export function addModel(data) {
  return request({
    url: '/aigc/liblib/model',
    method: 'post',
    data: data
  })
}

// 修改liblib模型
export function updateModel(data) {
  return request({
    url: '/aigc/liblib/model',
    method: 'put',
    data: data
  })
}

// 删除liblib模型
export function delModel(liblibModelId) {
  return request({
    url: '/aigc/liblib/model/' + liblibModelId,
    method: 'delete'
  })
}
