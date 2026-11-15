import request from '@/utils/request'

// 查询liblib图片生成列表
export function listImg(query) {
  return request({
    url: '/aigc/liblib/img/list',
    method: 'get',
    params: query
  })
}

// 查询liblib图片生成详细
export function getImg(liblibImgId) {
  return request({
    url: '/aigc/liblib/img/' + liblibImgId,
    method: 'get'
  })
}

// 新增liblib图片生成
export function addImg(data) {
  return request({
    url: '/aigc/liblib/img',
    method: 'post',
    data: data
  })
}

// 修改liblib图片生成
export function updateImg(data) {
  return request({
    url: '/aigc/liblib/img',
    method: 'put',
    data: data
  })
}

// 删除liblib图片生成
export function delImg(liblibImgIds) {
  return request({
    url: '/aigc/liblib/img/' + liblibImgIds,
    method: 'delete'
  })
}



/**
 * 生成图像
 * @param {Object} params - 生成参数
 * @param {string} params.prompt - 正向提示词
 * @param {string} params.negativePrompt - 负向提示词
 * @param {string} params.checkpoint - Checkpoint模型
 * @param {string} params.vae - VAE模型
 * @param {number} params.clipSkip - CLIP跳过层数
 * @param {string} params.size - 图像尺寸
 * @param {number} params.batchSize - 生成数量
 * @param {string} params.sampler - 采样方法
 * @param {number} params.steps - 采样步数
 * @param {number} params.cfgScale - 提示词引导系数
 * @param {string} params.seed - 种子值
 * @param {number} params.denoisingStrength - 重绘幅度
 * @param {boolean} params.restoreFaces - 人脸修复
 * @param {boolean} params.enableHiRes - 高清修复
 * @param {string} params.hiResUpscaler - 高清算法
 * @param {number} params.hiResScale - 高清放大倍数
 * @param {number} params.hiResSteps - 高清重绘步数
 * @param {Array} params.loras - LoRA模型列表
 * @returns {Promise} API响应
 */
export function generateImage(params) {
  // 参数验证
  if (!params || typeof params !== 'object') {
    return Promise.reject(new Error('请求参数必须是对象'))
  }

  if (!params.prompt || typeof params.prompt !== 'string' || params.prompt.trim().length === 0) {
    return Promise.reject(new Error('提示词不能为空'))
  }

  if (params.prompt.length > 1000) {
    return Promise.reject(new Error('提示词过长，最多支持1000个字符'))
  }

  return request({
    url: '/aigc/liblib/img/text2img',
    method: 'post',
    data: {
      ...params,
      userId: 'current_user', // 这里应该从用户状态中获取
      timestamp: new Date().toISOString()
    },
    timeout: 120000 // 2分钟超时，因为图像生成可能需要较长时间
  })
}




/**
 * 生成图像
 * @param {Object} params - 生成参数
 * @param {string} params.prompt - 正向提示词
 * @param {string} params.negativePrompt - 负向提示词
 * @param {string} params.checkpoint - Checkpoint模型
 * @param {string} params.vae - VAE模型
 * @param {number} params.clipSkip - CLIP跳过层数
 * @param {string} params.size - 图像尺寸
 * @param {number} params.batchSize - 生成数量
 * @param {string} params.sampler - 采样方法
 * @param {number} params.steps - 采样步数
 * @param {number} params.cfgScale - 提示词引导系数
 * @param {string} params.seed - 种子值
 * @param {number} params.denoisingStrength - 重绘幅度
 * @param {boolean} params.restoreFaces - 人脸修复
 * @param {boolean} params.enableHiRes - 高清修复
 * @param {string} params.hiResUpscaler - 高清算法
 * @param {number} params.hiResScale - 高清放大倍数
 * @param {number} params.hiResSteps - 高清重绘步数
 * @param {Array} params.loras - LoRA模型列表
 * @returns {Promise} API响应
 */
export function generateImageToImg(params) {
  // 参数验证
  if (!params || typeof params !== 'object' || !params.generateParams) {
    return Promise.reject(new Error('请求参数必须是包含generateParams的对象'))
  }

  const { generateParams } = params;

  if (!generateParams.prompt || typeof generateParams.prompt !== 'string' || generateParams.prompt.trim().length === 0) {
    return Promise.reject(new Error('提示词不能为空'))
  }

  if (generateParams.prompt.length > 1000) {
    return Promise.reject(new Error('提示词过长，最多支持1000个字符'))
  }

  return request({
    url: '/aigc/liblib/img/img2img',
    method: 'post',
    data: {
      ...params,
      userId: 'current_user', // 这里应该从用户状态中获取
      timestamp: new Date().toISOString()
    },
    timeout: 120000 // 2分钟超时，因为图像生成可能需要较长时间
  })
}

/**
 * 获取生成任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise} API响应
 */
export function getGenerationStatus(taskId) {
  if (!taskId) {
    return Promise.reject(new Error('任务ID不能为空'))
  }
  return request({
    url: `/aigc/liblib/img/status/${taskId}`,
    method: 'get'
  })
}
