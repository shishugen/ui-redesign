import request from '@/utils/request'
const api_base = '/gpt-api/mode-user-usage-statistics'

/**
 * 获取用户模型使用统计列表
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getUserModelUsageStats(params) {
  return request({
    url: `${api_base}/`,
    method: 'get',
    params
  })
}

/**
 * 获取单个用户模型使用统计数据
 * @param {String} id - 统计记录ID
 * @returns {Promise}
 */
export function getUserModelUsageStatById(id) {
  return request({
    url: `${api_base}/${id}/`,
    method: 'get'
  })
}

/**
 * 手动汇总所有类型的统计数据
 * @returns {Promise}
 */
export function manualAggregateHourlyStatistics() {
  return request({
    url: `${api_base}/manual-aggregate`,
    timeout: 60000,
    method: 'post'
  })
}


/**
 * 获取用户模型使用统计列表（按用户ID和班级ID）
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export function getUserClassUsageStatistics(params) {
  return request({
    url: `${api_base}/statistics-by-user-class`,
    method: 'get',
    params
  })
}
