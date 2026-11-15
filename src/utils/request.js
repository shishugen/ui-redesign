import axios from 'axios'
import { message } from 'ant-design-vue'
import { getToken, removeToken } from './auth'
import { tansParams, blobValidate } from '@/utils/aigc.js'

// 适配层：冻结的 api/** 与迁移后页面共用的请求契约。
// 旧项目 ui/src/utils/request.js 的 401 分支写死 location.href='/index'（history 模式），
// 本项目是 hash 路由，故本文件按同名同路径重写，ui/ 里的原文件保持不变。
export let isRelogin = { show: false }

/**
 * 真实接口请求封装（对齐主项目 src/utils/request.js 的核心行为）
 * baseURL = /dev-api，由 vite proxy 转发到 PROXY_HOST:38080（主机见 .env.local）
 * silent: true 用于首页并发探测，失败只记录状态，不弹一堆错误提示
 */
const service = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API || '/dev-api',
  timeout: 15000
})

service.interceptors.request.use(config => {
  const url = config.url || ''
  // 这些前缀走各自独立的代理，不能拼到 /dev-api 后面
  if (url.startsWith('/gpt-api') || url.startsWith('/preview') || url.startsWith('/graph')) {
    config.baseURL = '/'
  }
  const isToken = (config.headers || {}).isToken === false
  if (!isToken && getToken()) {
    config.headers['Authorization'] = 'Bearer ' + getToken()
  }
  return config
}, error => Promise.reject(error))

service.interceptors.response.use(res => {
  const config = res.config || {}
  const silent = config.silent === true
  const isGpt = (config.url || '').startsWith('/gpt-api')

  if (config.responseType === 'blob' || config.responseType === 'arraybuffer') return res.data

  const data = res.data
  // RuoYi 风格统一响应 { code, msg, data }
  if (data && typeof data === 'object' && 'code' in data) {
    if (data.code === 200) return data
    if (data.code === 401) {
      if (!silent) message.error(data.msg || '登录状态已过期，请重新登录')
      // AI 服务（/gpt-api）的 401 属于它自己的鉴权；首页静默探测失败也不应把人踢下线。
      // 真正判定登录失效交给 bootstrap 里非静默的 /getInfo。
      if (!isGpt && !silent) {
        removeToken()
        if (!location.hash.startsWith('#/login')) location.hash = '#/login'
      }
    } else if (!silent) {
      message.error(data.msg || `接口返回 ${data.code}`)
    }
    return Promise.reject(new Error(data.msg || `接口返回 ${data.code}`))
  }
  return data
}, error => {
  const config = error.config || {}
  const silent = config.silent === true
  const status = error.response && error.response.status
  if (!silent) {
    let msg = error.message || '请求失败'
    if (msg === 'Network Error') msg = '后端接口连接异常'
    else if (/timeout/i.test(msg)) msg = '系统接口请求超时'
    else if (status) msg = `系统接口 ${status} 异常`
    message.error(msg)
  }
  return Promise.reject(error)
})

/** 通用下载：与旧项目 request.js 的 download(url, params, filename, config) 同签名，
 *  用原生 Blob + a[download] 替代 file-saver，避免为适配层引入新依赖。 */
export function download(url, params, filename, config = {}) {
  message.loading('正在下载数据，请稍候...', 0)
  return service.post(url, tansParams(params), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    ...config
  }).then(async (data) => {
    if (blobValidate(data)) {
      const objectUrl = URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
    } else {
      const rspObj = JSON.parse(await data.text())
      message.error(rspObj.msg || '下载文件出现错误')
    }
  }).catch(() => {
    message.error('下载文件出现错误，请联系管理员！')
  }).finally(() => {
    message.destroy()
  })
}

export default service
