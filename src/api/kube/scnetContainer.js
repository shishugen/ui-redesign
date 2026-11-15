import request from '@/utils/request'

const requestTimeout = 30000

// 查询容器列表
export function listScnet(query) {
  return request({
    url: '/aigc/kube/scnetContainer/list',
    method: 'get',
    params: query
  })
}
// 查询容器列表
export function findListScnet(query) {
  return request({
    url: '/aigc/kube/scnetContainer/findList',
    method: 'get',
    params: query
  })
}


// 查询容器列表
export function listScnetContainer(query) {
  return request({
    url: '/aigc/kube/scnetContainer/scnetContainerList',
    method: 'get',
    timeout: requestTimeout,
    params: query
  })
}

// 查询容器详细
export function getScnetContainer(clusterId, containerId) {
  return request({
    url: '/aigc/kube/scnetContainer/' + clusterId + '/' + containerId,
    method: 'get',
    timeout: requestTimeout
  })
}

// 新增容器
export function addScnetContainer(data) {
  return request({
    url: '/aigc/kube/scnetContainer',
    method: 'post',
    data: data,
    timeout: requestTimeout
  })
}

// 新增容器
export function addBatchScnetContainer(data) {
  return request({
    url: '/aigc/kube/scnetContainer/addBatch', //addBatch
    method: 'post',
    data: data,
    timeout: requestTimeout
  })
}

// 删除超算镜像
export function delScnetContainer(containerId) {
  return request({
    url: '/aigc/kube/scnetContainer/' + containerId,
    method: 'delete'
  })
}

export function getByUserIdAndCourseId(userId, courseId) {
  return request({
    url: '/aigc/kube/scnetContainer/getByUserIdAndCourseId',
    method: 'get',
    params: {
      userId: userId,
      courseId: courseId
    },
    timeout: requestTimeout
  })
}


//createScnetContainer
export function createScnetContainer(data) {
  return request({
    url: '/aigc/kube/scnetContainer',
    method: 'post',
    data: data,
    timeout: requestTimeout
  })
}

// 重启或启动容器
export function restartOrStartScnetContainer(clusterIds, containerIds) {
  return request({
    url: '/aigc/kube/scnetContainer/restartOrStart',
    method: 'post',
    data: {
      clusterIds: clusterIds,
      containerIds: containerIds
    },
    timeout: requestTimeout
  })
}

// 查询容器URL
export function getScnetContainerUrl(clusterId, containerId) {
  return request({
    url: '/aigc/kube/scnetContainer/getScnetContainerUrl/',
    method: 'get',
    params: {
      clusterId: clusterId,
      containerId: containerId
    },
    timeout: requestTimeout
  })
}

// 获取容器信息
export function getScnetContainerInfo(clusterId, containerId) {
  return request({
    url: '/aigc/kube/scnetContainer/' + clusterId + '/' + containerId,
    method: 'get',
    timeout: requestTimeout
  })
}

// 批量停止容器
export function stopBatchScnetContainer(taskIds) {
  return request({
    url: '/aigc/kube/scnetContainer/stopBatch',
    method: 'post',
    data: {
      taskIds: taskIds
    },
    timeout: requestTimeout
  })
}

// 批量删除容器
export function batchDeleteContainer(taskIds) {
  return request({
    url: '/aigc/kube/scnetContainer/batchDeleteContainer',
    method: 'post',
    data: {
      taskIds: taskIds
    },
    timeout: requestTimeout
  })
}

// 获取区域列表
export function getAreaList() {
  return request({
    url: '/aigc/kube/scnetContainer/getAreaList',
    method: 'get',
    timeout: requestTimeout
  })
}

export function queryByScheduleAndConfig(scheduleItemId,configId,userId) {
  return request({
    url: '/aigc/kube/scnetContainer/queryByScheduleAndConfig',
    method: 'get',
    params: {
      scheduleItemId: scheduleItemId,
      configId: configId,
      userId: userId,
    },
    timeout: requestTimeout
  })
}

//syncContainer
export function syncContainer(taskId) {
  return request({
    url: '/aigc/kube/scnetContainer/syncContainer',
    method: 'post',
    params: { taskId },
    timeout: requestTimeout
  })
}

//restartContainer
export function restartContainer(taskId) {
  return request({
    url: '/aigc/kube/scnetContainer/restartContainer',
    method: 'post',
    params: { taskId },
    timeout: requestTimeout
  })
}

export function stopContainer(taskId) {
  return request({
    url: '/aigc/kube/scnetContainer/stopContainer',
    method: 'post',
    params: { taskId },
    timeout: requestTimeout
  })
}

// 删除容器
export function deleteScnetContainer(taskId,isDelete = false) {
  let params = {
    taskId: taskId,
    isDelete: isDelete,
  }
  return request({
    url: '/aigc/kube/scnetContainer/deleteContainer',
    method: 'post',
    params,
    timeout: requestTimeout
  })
}

// 删除容器
export function deleteScnetContainerById(containerId,isDelete = false) {
  let params = {
    taskId: taskId,
    isDelete: isDelete,
  }
  return request({
    url: '/aigc/kube/scnetContainer/deleteContainerById',
    method: 'post',
    params,
    timeout: requestTimeout
  })
}

//同步镜像
export function syncScnetImage() {
  return request({
    url: '/aigc/kube/scnetContainer/syncImage',
    method: 'post',
    timeout: requestTimeout
  })
}


// 删除数据
export function delContainer(scnetContainerIds) {
  return request({
    url: '/aigc/kube/scnetContainer/' + scnetContainerIds,
    method: 'delete'
  })
}
