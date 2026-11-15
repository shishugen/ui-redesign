import request from '@/utils/request'

// 查询liblib_vae列表
export function listVae(query) {
  return request({
    url: '/aigc/liblib/vae/list',
    method: 'get',
    params: query
  })
}


// 查询所有模型列表
export function listVaeAll() {
  return request({
    url: '/aigc/liblib/vae/list-all',
    method: 'get',
  })
}


// 查询liblib_vae详细
export function getVae(liblibVaeId) {
  return request({
    url: '/aigc/liblib/vae/' + liblibVaeId,
    method: 'get'
  })
}

// 新增liblib_vae
export function addVae(data) {
  return request({
    url: '/aigc/liblib/vae',
    method: 'post',
    data: data
  })
}

// 修改liblib_vae
export function updateVae(data) {
  return request({
    url: '/aigc/liblib/vae',
    method: 'put',
    data: data
  })
}

// 删除liblib_vae
export function delVae(liblibVaeId) {
  return request({
    url: '/aigc/liblib/vae/' + liblibVaeId,
    method: 'delete'
  })
}
