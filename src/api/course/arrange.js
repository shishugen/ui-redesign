import request from '@/utils/request'
const requestTimeout = 30000
// 查询课程安排列表
export function listArrange(query) {
  return request({
    url: '/aigc/course/arrange/list',
    method: 'get',
    params: query
  })
}
// 查询课程安排列表
export function findListArrange(query) {
  return request({
    url: '/aigc/course/arrange/findList',
    method: 'get',
    params: query
  })
}


// 查询课程安排列表(联合查询)
export function listArrangePlus(query) {
  return request({
    url: '/aigc/course/arrange/listArrangePlus',
    method: 'get',
    params: query
  })
}
// 查询课程安排列表(联合查询不分页)
export function findListArrangePlus(query) {
  return request({
    url: '/aigc/course/arrange/findListArrangePlus',
    method: 'get',
    params: query
  })
}

// 查询课程安排详细
export function getArrange(arrangeId) {
  return request({
    url: '/aigc/course/arrange/' + arrangeId,
    method: 'get'
  })
}

// 新增课程安排
export function addArrange(data) {
  return request({
    url: '/aigc/course/arrange',
    method: 'post',
    data: data
  })
}

// 修改课程安排
export function updateArrange(data) {
  return request({
    url: '/aigc/course/arrange',
    method: 'put',
    data: data
  })
}

// 删除课程安排
export function delArrange(arrangeId) {
  return request({
    url: '/aigc/course/arrange/' + arrangeId,
    method: 'delete'
  })
}


export function addPersonArrange({courseId,chapterId,arrangeUserId,period} = {}) {
  const params = {
    courseId,
    chapterId,
    arrangeUserId,
    period
  }
  return request({
    url: '/aigc/course/arrange/addPersonArrange',
    method: 'post',
    params: params
  })
}

//教学班级排课
export function addClassArrange(data) {
  return request({
    url: '/aigc/course/arrange/addClassArrange',
    method: 'post',
    data: data
  })
}


// 延时实验
export function delayArrange(arrangeId, delayMinutes) {
  return request({
    url: '/aigc/course/arrange/delay',
    method: 'put',
    params: { arrangeId, delayMinutes }
  })
}

// 结束实验/排课
export function endArrange(arrangeId) {
  return request({
    url: '/aigc/course/arrange/end',
    method: 'put',
    params: { arrangeId }
  })
}

// 获取排课
export function getLastArrange({courseId,chapterId,classesId,arrangeUserId,arrangeType} = {}) {
  const params = {
    courseId,
    chapterId,
    classesId,
    arrangeUserId,
    arrangeType
  }
  return request({
    url: '/aigc/course/arrange/getLastArrange',
    method: 'get',
    params
  })
}

// 班级资源创建
export function createClassesResource(data) {
  return request({
    url: '/aigc/course/arrange/createClassesResource',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}
// 资源补充
export function supplementResource(arrangeId) {
  let params={
    arrangeId:arrangeId
  }
  return request({
    url: '/aigc/course/arrange/supplementResource',
    method: 'post',
    params,
    timeout: requestTimeout,
  })
}
//根据排课创建
export function createResourceByArrange(data) {
  return request({
    url: '/aigc/course/arrange/createResourceByArrange',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}
// 资源释放
export function releaseResource(data) {
  return request({
    url: '/aigc/course/arrange/releaseResource',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}


// 个人资源创建
export function createPrivateResource(data) {
  return request({
    url: '/aigc/course/arrange/createPrivateResource',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}

//开机
export function startPrivateResource(data) {
  return request({
    url: '/aigc/course/arrange/startPrivateResource',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}

//关机
export function stopPrivateResource(data) {
  return request({
    url: '/aigc/course/arrange/stopPrivateResource',
    method: 'post',
    data: data,
    timeout: requestTimeout,
  })
}




// 结束实验/排课
export function endArrangeByArrangeId(arrangeId,isDelete) {
  let params={
    arrangeId:arrangeId,
    isDelete:isDelete,
  }
  return request({
    url: '/aigc/course/arrange/endArrange',
    method: 'post',
    params,
    timeout: requestTimeout,
  })
}



// 分页查询本地教学容器
export function teachLocalContainerList(query) {
  return request({
    url: '/aigc/course/arrange/teachLocalContainerList',
    method: 'get',
    params: query
  })
}

// 查询超算教学容器
export function teachScnetContainerList(query) {
  return request({
    url: '/aigc/course/arrange/teachScnetContainerList',
    method: 'get',
    params: query
  })
}

// 查询超算notebook教学容器
export function teachScnetNotebookList(query) {
  return request({
    url: '/aigc/course/arrange/teachScnetNotebookList',
    method: 'get',
    params: query
  })
}
