import request from '@/utils/request'

// 分页查询镜像保存记录（管理侧）
export function listImageCommit(query) {
  return request({
    url: '/aigc/kube/imageCommit/list',
    method: 'get',
    params: query
  })
}

// 我的保存记录（userId 由服务端从登录态取）
export function myImageCommitList(query) {
  return request({
    url: '/aigc/kube/imageCommit/myList',
    method: 'get',
    params: query
  })
}

// 查询单条保存记录（前端轮询状态用）
export function getImageCommit(commitId) {
  return request({
    url: '/aigc/kube/imageCommit/' + commitId,
    method: 'get'
  })
}

// 发起「容器保存为镜像」
export function createImageCommit(data) {
  return request({
    url: '/aigc/kube/imageCommit',
    method: 'post',
    data: data
  })
}

// 删除保存记录（仅删留痕，进行中的任务服务端会拒绝）
export function delImageCommit(commitId) {
  return request({
    url: '/aigc/kube/imageCommit/' + commitId,
    method: 'delete'
  })
}

// 同步成功的 commit 记录到镜像数据库（可携带 ports/command）
export function syncCommitToImage(commitId, data) {
  return request({
    url: '/aigc/kube/imageCommit/sync/' + commitId,
    method: 'post',
    data: data || {}
  })
}
