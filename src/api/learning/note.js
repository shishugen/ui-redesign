import request from '@/utils/request'

// 查询个人笔记列表
export function listNote(query) {
  return request({
    url: '/aigc/learning/note/list',
    method: 'get',
    params: query
  })
}

// 查询个人笔记详细
export function getNote(noteId) {
  return request({
    url: '/aigc/learning/note/' + noteId,
    method: 'get'
  })
}

// 新增个人笔记
export function addNote(data) {
  return request({
    url: '/aigc/learning/note',
    method: 'post',
    data: data,
  })
}

// 修改个人笔记
export function updateNote(data) {
  return request({
    url: '/aigc/learning/note',
    method: 'put',
    data: data,
  })
}

// 删除个人笔记
export function delNote(noteId) {
  return request({
    url: '/aigc/learning/note/' + noteId,
    method: 'delete'
  })
}

// 查询课程和章节
export function findCourseAndChapter(query) {
  return request({
    url: '/aigc/learning/note/findCourseAndChapter',
    method: 'get',
    params: query
  })
}


