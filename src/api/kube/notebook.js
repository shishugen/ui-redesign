import request from '@/utils/request'
const requestTimeout = 30000
// 查询超算notebook列表
export function listNotebook(query) {
  return request({
    url: '/aigc/kube/notebook/list',
    method: 'get',
    params: query
  })
}

export function findListNotebook(query) {
  return request({
    url: '/aigc/kube/notebook/findList',
    method: 'get',
    params: query
  })
}



// 查询超算notebook详细
export function getNotebook(scnetNotebookId) {
  return request({
    url: '/aigc/kube/notebook/' + scnetNotebookId,
    method: 'get'
  })
}


// 修改超算notebook

export function updateNotebook(data) {
  return request({
    url: '/aigc/kube/notebook',
    method: 'put',
    data: data
  })
}

// 删除超算notebook
// forceLocalDelete=true 时跳过远程关机/释放流程，直接删除本地数据库记录

export function delNotebook(scnetNotebookId, forceLocalDelete = false) {
  return request({
    url: '/aigc/kube/notebook/' + scnetNotebookId,
    method: 'delete',
    params: forceLocalDelete ? { forceLocalDelete: true } : {}
  })
}



// 新增超算notebook
export function createNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/actions/create',
    method: 'post',
    data: data
  })
}


// 批量新增超算notebook
export function batchCreateNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/actions/batchCreate',
    method: 'post',
    data: data,
    timeout: requestTimeout
  })
}

// 关机 Notebook 实例
export function stopNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/actions/stop',
    method: 'post',
    data: data
  });
}

// 释放 Notebook 实例
export function releaseNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/actions/release',
    method: 'post',
    data: data
  });
}

// 批量释放 Notebook 实例（未关机的先关机再释放）
export function batchReleaseNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/actions/batchRelease',
    method: 'post',
    data: data
  });
}

// 同步 Notebook 实例
export function syncNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/actions/sync',
    method: 'post',
    data: data
  });
}

// 查看详细Notebook实例
export function getNotebookDetail(scnetNotebookId) {
  return request({
    url: '/aigc/kube/notebook/detail/' + scnetNotebookId,
    method: 'get'
  })
}

// 开机 Notebook 实例
export function startNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/actions/start',
    method: 'post',
    data: data
  });
}


// 获取资源
export function accelerators() {
  return request({
    url: '/aigc/kube/notebook/accelerators',
    method: 'get'
  })
}


/****************远程方法开始************************ */

// 查询超算notebook列表
export function listRemoteNotebook(query) {
  return request({
    url: '/aigc/kube/notebook/remote/list',
    method: 'get',
    params: query
  })
}


// 远程开机 Notebook 实例
export function remoteStartNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/remote/start',
    method: 'post',
    data: data
  });
}

//远程 关机 Notebook 实例
export function remoteStopNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/remote/stop',
    method: 'post',
    data: data
  });
}

//远程 释放 Notebook 实例
export function remoteReleaseNotebook(data) {
  return request({
    url: '/aigc/kube/notebook/remote/release',
    method: 'post',
    data: data
  });
}

//远程  getNotebookUrl 实例
export function getNotebookUrl(data) {
  return request({
    url: '/aigc/kube/notebook/getNotebookUrl',
    method: 'post',
    data: data
  });
}

/****************远程方法结束************************ */

