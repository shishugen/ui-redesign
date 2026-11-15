import request from '@/utils/request'

// 系统配置（真实系统名在 aigc_system_name）
export function getConfigKey(configKey, silent = false) {
  return request({ url: '/system/config/configKey/' + configKey, method: 'get', silent })
}

// 通知公告
export function listNotice(query, silent = false) {
  return request({ url: '/system/notice/list', method: 'get', params: query, silent })
}

// 服务监控
export function getServer(silent = false) {
  return request({ url: '/monitor/server', method: 'get', silent })
}

// 数据字典：把后端真实代码值（ai / primary …）翻成中文标签
export function getDict(dictType, silent = false) {
  return request({ url: `/system/dict/data/type/${dictType}`, method: 'get', silent })
}
