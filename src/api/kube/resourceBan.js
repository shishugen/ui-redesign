import request from '@/utils/request'

// 分页查询禁用记录
export function listBan(query) {
  return request({
    url: '/aigc/kube/resourceBan/list',
    method: 'get',
    params: query
  })
}

// 禁用用户：一次勾选的多个额度池由后端拆成多行
export function banUser(data) {
  return request({
    url: '/aigc/kube/resourceBan/ban',
    method: 'post',
    data: data
  })
}

// 解除禁用（保留记录供追溯）
export function unbanUser(banIds) {
  return request({
    url: '/aigc/kube/resourceBan/unban',
    method: 'post',
    data: banIds
  })
}

// 删除禁用记录
export function delBan(banIds) {
  return request({
    url: '/aigc/kube/resourceBan/' + banIds,
    method: 'delete'
  })
}
