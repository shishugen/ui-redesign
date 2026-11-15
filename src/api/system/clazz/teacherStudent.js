import request from '@/utils/request'

// 查询班级列表
export function listClasses(query) {
  return request({
    url: '/system/clazz/teacherStudent/listClasses',
    method: 'get',
    params: query
  })
}

// 分页查询学生列表
export function listStudents(params = {}) {
  return request({
    url: '/system/clazz/teacherStudent/listStudents',
    method: 'get',
    params
  })
}
//查询学生列表
export function findListStudents(params = {}) {
  return request({
    url: '/system/clazz/teacherStudent/findListStudents',
    method: 'get',
    params
  })
}


// 查询教师列表
export function listTeachers(query) {
  return request({
    url: '/system/clazz/teacherStudent/listTeachers',
    method: 'get',
    params: query
  })
}

// 根据班级id查询学生列表
export function listUsersByClass(classId, params = {}) {
  return request({
    url: '/system/clazz/teacherStudent/listUsersByClass/' + classId,
    method: 'get',
    params
  })
}

// 新增学生
export function addStudent(data) {
  return request({
    url: '/system/clazz/teacherStudent/addStudent',
    method: 'post',
    data: data
  })
}

// 修改学生
export function editStudent(data) {
  return request({
    url: '/system/clazz/teacherStudent/editStudent',
    method: 'put',
    data: data
  })
}

// addTeacher
export function addTeacher(data) {
  return request({
    url: '/system/clazz/teacherStudent/addTeacher',
    method: 'post',
    data: data
  })
}

// editTeacher
export function editTeacher(data) {
  return request({
    url: '/system/clazz/teacherStudent/editTeacher',
    method: 'put',
    data: data
  })
}

// 删除学生
export function deleteStudent(id) {
  return request({
    url: '/system/clazz/teacherStudent/deleteStudent/' + id,
    method: 'delete'
  })
}

// 删除教师
export function deleteTeacher(id) {
  return request({
    url: '/system/clazz/teacherStudent/deleteTeacher/' + id,
    method: 'delete'
  })
}

// 删除班级
export function deleteClass(id) {
  return request({
    url: '/system/clazz/teacherStudent/deleteClass/' + id,
    method: 'delete'
  })
}

// 查询班级列表
export function listAllClasses() {
  return request({
    url: '/system/clazz/teacherStudent/listAllClasses',
    method: 'get'
  })
}

// 查询教师列表
export function listAllTeachers() {
  return request({
    url: '/system/clazz/teacherStudent/listAllTeachers',
    method: 'get'
  })
}

// 查询学生列表
export function listAllStudents(query) {
  return request({
    url: '/system/clazz/teacherStudent/listAllStudents',
    method: 'get'
  })
}

// 根据班级id查询学生列表
export function getStudentCount(classesId) {
  var params = {
    classesId: classesId
  }
  return request({
    url: '/system/clazz/teacherStudent/getStudentCount',
    method: 'get',
    params
  })
}

// 导出选中的学生数据
export function exportSelectedStudents(userIds) {
  return request({
    url: '/system/clazz/teacherStudent/exportStudentData',
    method: 'post',
    data: userIds,
    responseType: 'blob'
  })
}
//查询简单用户列表
export function findSimpleUserList() {
  return request({
    url: '/system/clazz/teacherStudent/findSimpleUserList',
    method: 'get'
  })
}
