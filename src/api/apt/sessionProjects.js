import request from '@/utils/request'

const api_base = '/gpt-api/session-projects'

// 查询会话项目分类列表
export function listSessionProjects(query) {
  return request({
    url: api_base + '/',
    method: 'get',
    params: query
  })
}

// 查询会话项目分类详细
export function getSessionProject(id) {
  return request({
    url: api_base + '/' + id+'/with-sessions',
    method: 'get'
  })
}

// 新增会话项目分类
export function addSessionProject(data) {
  return request({
    url: api_base + '/',
    method: 'post',
    data: data
  })
}

// 修改会话项目分类
export function updateSessionProject(data) {
  return request({
    url: api_base + '/',
    method: 'put',
    data: data
  })
}

// 删除会话项目分类
export function delSessionProject(id) {
  return request({
    url: api_base + '/' + id,
    method: 'delete'
  })
}

// 重命名会话项目分类
export function renameSessionProject(id, name) {
  return request({
    url: api_base + '/' + id + '/rename',
    method: 'put',
    data: { name }
  })
}

// 获取项目下的会话列表
export function getSessionListByProjectId(projectId, query) {
  return request({
    url: api_base + '/' + projectId + '/with-sessions',
    method: 'get',
    params: query
  })
}

// 为项目分配会话
export function assignSessionsToProject(projectId, sessionIds) {
  return request({
    url: api_base + '/' + projectId + '/sessions',
    method: 'post',
    data: { sessionIds }
  })
}

// 从项目中移除会话
export function removeSessionsFromProject(projectId, sessionIds) {
  return request({
    url: api_base + '/' + projectId + '/sessions',
    method: 'delete',
    data: { sessionIds }
  })
}

// 更新会话的项目关联
export function updateSessionProjectAssociation(sessionId, projectId) {
  return request({
    url: `/gpt-api/chat/session/${sessionId}/project`,
    method: 'put',
    data: { project_id: projectId }
  })
}