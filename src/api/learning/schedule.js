import request from '@/utils/request'
const requestTimeout = 30000
// 查询实训计划列表
export function listSchedule(query) {
  return request({
    url: '/aigc/learning/schedule/list',
    method: 'get',
    params: query
  })
}
// 查询实训计划列表
export function findListSchedule(query) {
  return request({
    url: '/aigc/learning/schedule/findList',
    method: 'get',
    params: query
  })
}
// 查询实训计划列表
export function listSchedulePlus(query) {
  return request({
    url: '/aigc/learning/schedule/listPlus',
    method: 'get',
    params: query
  })
}
// 查询实训计划列表
export function findListSchedulePlus(query) {
  return request({
    url: '/aigc/learning/schedule/findListPlus',
    method: 'get',
    params: query,
    timeout: requestTimeout,
  })
}

// 查询实训计划详细
export function getSchedule(scheduleId) {
  return request({
    url: '/aigc/learning/schedule/' + scheduleId,
    method: 'get'
  })
}


// 新增实训计划
export function addSchedule(data) {
  return request({
    url: '/aigc/learning/schedule',
    method: 'post',
    data: data
  })
}

// 修改实训计划
export function updateSchedule(data) {
  return request({
    url: '/aigc/learning/schedule',
    method: 'put',
    data: data
  })
}

// 删除实训计划
export function delSchedule(scheduleId) {
  return request({
    url: '/aigc/learning/schedule/' + scheduleId,
    method: 'delete'
  })
}

// 保存实训计划
export function saveSchedule(data) {
  return request({
    url: '/aigc/learning/schedule/saveSchedule',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}

// 根据条件保存学习计划
export function saveScheduleByParams({courseId,chapterId,userId,scheduleType,resourceType,minutes} = {}) {
  const params = {
    courseId,
    chapterId,
    userId,
    scheduleType,
    resourceType,
    minutes
  }
  return request({
    url: '/aigc/learning/schedule/saveScheduleByParams',
    method: 'post',
    params,
    timeout: requestTimeout,
  })
}


// 结束计划
export function endSchedule({scheduleId,isDelete} = {}) {
  const params = {
    scheduleId,
    isDelete,
  }
  return request({
    url: '/aigc/learning/schedule/endSchedule',
    method: 'post',
    params,
    timeout: requestTimeout,
  })
}

// 根据日期获取计划
export function getCurrSchedule(query) {
  return request({
    url: '/aigc/learning/schedule/getScheduleByDay',
    method: 'get',
    params: query,
    timeout: requestTimeout,
  })
}


// 根据参数对象操作资源
export function handleScheduleResource({scheduleId,itemId,userIds,configIds,classesId,handleType,isDelete = false} = {}) {
  const data = {
    scheduleId,
    itemId,
    userIds,
    configIds,
    classesId,
    handleType,
    isDelete,
  }
  return request({
    url: '/aigc/learning/schedule/handleScheduleResource',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}

// 根据参数对象创建资源
export function createScheduleResource({scheduleId,itemId,userIds,configIds} = {}) {
  const data = {
    scheduleId,
    itemId,
    userIds,
    configIds,
  }
  return request({
    url: '/aigc/learning/schedule/createScheduleResource',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}

// 根据参数对象同步资源
export function syncScheduleResource({scheduleId,itemId,userIds,configIds} = {}) {
  const data = {
    scheduleId,
    itemId,
    userIds,
    configIds,
  }
  return request({
    url: '/aigc/learning/schedule/syncScheduleResource',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}

// 根据参数对象释放资源
export function releaseScheduleResource({scheduleId,itemId,userIds,configIds,isDelete=false} = {}) {
  const data = {
    scheduleId,
    itemId,
    userIds,
    configIds,
    isDelete
  }
  return request({
    url: '/aigc/learning/schedule/releaseScheduleResource',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}



// 查询占用时长
export function getOccupy(query) {
  return request({
    url: '/aigc/learning/schedule/getOccupy',
    method: 'get',
    params: query,
    timeout: requestTimeout,
  })
}
