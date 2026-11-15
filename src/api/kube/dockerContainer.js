import request from '@/utils/request'

// 分页查询Docker容器列表（管理侧）
export function listDockerContainer(query) {
  return request({
    url: '/aigc/kube/dockerContainer/list',
    method: 'get',
    params: query
  })
}

// 我的Docker容器列表（userId 由服务端从登录态取）
export function myDockerContainerList(query) {
  return request({
    url: '/aigc/kube/dockerContainer/myList',
    method: 'get',
    params: query
  })
}

// 查询Docker容器详细
export function getDockerContainer(containerId) {
  return request({
    url: '/aigc/kube/dockerContainer/' + containerId,
    method: 'get'
  })
}

// 创建Docker容器（闸门/选机/端口分配在服务端完成）
export function createDockerContainer(data) {
  return request({
    url: '/aigc/kube/dockerContainer/create',
    method: 'post',
    data: data,
    timeout: 30000 // 选机+端口分配+落库都在同步段，机器多时用全局 10s 容易误报超时
  })
}

// 列出当前用户可创建的 Docker 服务器（创建表单先选机用：管理员全部，普通用户仅分配给他的）
export function listAvailableDockerServers() {
  return request({
    url: '/aigc/kube/dockerContainer/availableServers',
    method: 'get'
  })
}

// 启动容器
export function startDockerContainer(containerId) {
  return request({
    url: '/aigc/kube/dockerContainer/start/' + containerId,
    method: 'put',
    timeout: 30000 // 要连宿主机 daemon 原地 start（或整链路重建），全局 10s 不够
  })
}

// 停止容器
export function stopDockerContainer(containerId) {
  return request({
    url: '/aigc/kube/dockerContainer/stop/' + containerId,
    method: 'put',
    timeout: 30000 // 要连宿主机 daemon 真正停进程，全局 10s 不够
  })
}

// 销毁容器实例（删 daemon 实例，保留记录，不可再启动）
export function destroyDockerContainer(containerId) {
  return request({
    url: '/aigc/kube/dockerContainer/destroy/' + containerId,
    method: 'put',
    timeout: 30000 // 要连宿主机 daemon 删实例，全局 10s 不够
  })
}

// 重置容器（销毁+原配置重建，镜像层恢复初始状态，/workspace 数据保留）
export function resetDockerContainer(containerId) {
  return request({
    url: '/aigc/kube/dockerContainer/reset/' + containerId,
    method: 'put',
    timeout: 30000 // 拆旧实例+复查+落库重建，动作链较长，全局 10s 不够
  })
}

// 删除Docker容器（支持数组批量，逗号分隔传参）
export function delDockerContainer(containerIds) {
  return request({
    url: '/aigc/kube/dockerContainer/' + (Array.isArray(containerIds) ? containerIds.join(',') : containerIds),
    method: 'delete',
    timeout: 30000 // 批量删时逐个连 daemon 清实例，全局 10s 不够
  })
}

// 同步容器运行状态（以宿主机 daemon 为准）
export function syncDockerStatus() {
  return request({
    url: '/aigc/kube/dockerContainer/syncStatus',
    method: 'post',
    timeout: 30000 // 需逐个轮询所有服务器的 daemon 对账，机器多时全局 10s 不够
  })
}

// 列出容器内目录（一层，docker cp 语义）
export function listDockerFiles(containerId, path) {
  return request({
    url: '/aigc/kube/dockerContainer/file/list',
    method: 'get',
    params: { containerId, path },
    timeout: 30000 // 走 daemon exec/cp 进容器列目录，大目录时全局 10s 不够
  })
}

// 下载容器内文件/目录（文件回文件流，目录回整包 tar）
export function downloadDockerFile(containerId, path) {
  return request({
    url: '/aigc/kube/dockerContainer/file/download',
    method: 'get',
    params: { containerId, path },
    responseType: 'blob',
    timeout: 300000 // 5 分钟，大文件流式读可能超 10s
  })
}

// 上传文件到容器内目录（multipart）
// filename 可选：传入后将以该名字上传（用于“保留”同名文件时自动重命名）；缺省则用 file 自带的文件名
export function uploadDockerFile(containerId, destPath, file, filename) {
  const data = new FormData()
  data.append('containerId', containerId)
  if (destPath) data.append('destPath', destPath)
  if (filename) data.append('file', file, filename)
  else data.append('file', file)
  return request({
    url: '/aigc/kube/dockerContainer/file/upload',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000 // 5 分钟，文件上传走 base64 分片 exec 比普通接口慢很多
  })
}
