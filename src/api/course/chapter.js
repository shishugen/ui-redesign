import request from '@/utils/request'

let baseUrl = process.env.NODE_ENV === 'development' ? '/dev-api' : '/prod-api';
//上传地址(单文件)
const uploadMarkDownUrl = baseUrl + '/aigc/course/chapter/uploadMarkDown';

export {uploadMarkDownUrl}

// 查询课程章节列表(分页)
export function listChapter(query) {
  return request({
    url: '/aigc/course/chapter/list',
    method: 'get',
    params: query
  })
}
// 查询课程章节列表(不分页)
export function findListChapter(query) {
  return request({
    url: '/aigc/course/chapter/findList',
    method: 'get',
    params: query
  })
}


// 查询课程章节列表
export function getSimpleList(query) {
  return request({
    url: '/aigc/course/chapter/getSimpleList',
    method: 'get',
    params: query
  })
}

// 查询课程章节详细
export function getChapter(chapterId) {
  return request({
    url: '/aigc/course/chapter/' + chapterId,
    method: 'get'
  })
}

// 新增课程章节
export function addChapter(data) {
  return request({
    url: '/aigc/course/chapter',
    method: 'post',
    data: data
  })
}

// 修改课程章节
export function updateChapter(data) {
  return request({
    url: '/aigc/course/chapter',
    method: 'put',
    data: data
  })
}

// 删除课程章节
export function delChapter(chapterId) {
  return request({
    url: '/aigc/course/chapter/' + chapterId,
    method: 'delete'
  })
}
// 删除课程章节
export function delChapterById(chapterId) {
  var params={chapterId: chapterId}
  return request({
    url: '/aigc/course/chapter/deleteById',
    method: 'post',
    params: params
  })
}

// 根据课程i和父级id课程章节
export function getChaptersByParentId(courseId,parentId) {
  var params={
    courseId:courseId,
    parentId:parentId
  }
  return request({
    url: '/aigc/course/chapter/getChaptersByParentId',
    method: 'get',
    params: params
  })
}

