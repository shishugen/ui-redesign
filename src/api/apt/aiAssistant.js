import request from '@/utils/request'
import { chatDebugger } from '@/utils/chatDebugger'
import { getToken } from '@/utils/auth'
const api_base = '/gpt-api'
// AI助教API接口

/**
 * 发送消息给AI助教（流式返回）
 * @param {Object} data - 消息数据
 * @param {string} data.message - 用户消息内容
 * @param {string} data.sessionId - 会话ID（可选）
 * @param {string} data.context - 上下文信息（可选）
 * @param {string} data.timestamp - 时间戳（可选）
 * @param {Array} data.images - 上传的图片列表（可选）
 * @param {boolean} data.enableWebSearch - 是否启用联网搜索（可选）
 * @param {string} data.selectedModel - 选择的AI模型（可选）
 * @param {string} data.knowledge_id - 知识库ID（可选）
 * @param {number} data.score_threshold - 知识库分数阈值（可选）
 * @param {string} data.project_id - 项目ID（可选）
 * @param {boolean} data.regenerate - 是否为重新生成请求（可选）
 * @param {Function} onChunk - 接收流式数据的回调函数
 * @param {Function} onComplete - 完成时的回调函数
 * @param {Function} onError - 错误时的回调函数
 * @returns {Promise} 返回控制器，可用于取消请求
 */
export function sendMessageStream(data, onChunk, onComplete, onError) {
  // 参数验证
  if (!data || typeof data !== 'object') {
    const error = new Error('请求参数必须是对象')
    onError?.(error)
    return Promise.reject(error)
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    const error = new Error('消息内容不能为空')
    onError?.(error)
    return Promise.reject(error)
  }


//return Promise.reject()
  // 构造请求数据
  const requestData = {
    message: data.message.trim(),
    userId: data.userId || '',
    sessionId: data.sessionId,
    model_id: data.selectedModel,
    context: data.context || '',
    timestamp: data.timestamp || new Date().toISOString(),
    images: data.images || [],
    files: data.files || [], // 添加文件
    enable_web_search: data.enableWebSearch || false,
    // 添加知识库ID参数
    knowledge_id: data.knowledge_id,
    knowledge_score_threshold: data.score_threshold,
    // 添加项目ID参数
    project_id: data.project_id || null,
    // 添加重新生成标志
    regenerate: data.regenerate || false
  }

 // console.log('🌐 发送AI流式请求:', data)
  //console.log('🌐 发送AI流式请求:', requestData)
 // console.log('🌐 请求URL:', `${getBaseURL()}${api_base}/chat/send_message_stream`)


  // 创建AbortController用于取消请求
  const controller = new AbortController()

  // 使用fetch进行流式请求
  const streamRequest = fetch(`${getBaseURL()}${api_base}/chat/send_message_stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...getAuthHeaders()
    },
    body: JSON.stringify(requestData),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        let errorData = {}
        try {
          const errorText = await response.text()
          console.log('错误响应原始内容:', errorText)
          errorData = JSON.parse(errorText)
        } catch (parseError) {
          console.log('解析错误响应失败:', parseError)
          errorData = { message: '解析错误响应失败' }
        }

        console.log('错误详情:', errorData)

        // 根据状态码提供更详细的错误信息
        let errorMessage = ''
        switch (response.status) {
          case 400:
            errorMessage = `请求参数错误 (400): ${
              errorData.message || errorData.detail || '参数格式不正确'
            }`
            break
          case 401:
            errorMessage = `认证失败 (401): ${errorData.message || '请检查API密钥'}`
            break
          case 422:
            errorMessage = `参数验证失败 (422): ${
              errorData.message || errorData.detail || '请检查输入参数格式'
            }`
            if (errorData.detail && Array.isArray(errorData.detail)) {
              const validationErrors = errorData.detail
                .map((err) => `${err.loc?.join('.')} - ${err.msg}`)
                .join('; ')
              errorMessage += ` 详细错误: ${validationErrors}`
            }
            break
          case 429:
            errorMessage = `请求过于频繁 (429): ${errorData.message || '请稍后再试'}`
            break
          case 500:
            errorMessage = `服务器内部错误 (500): ${errorData.message || '请稍后重试'}`
            break
          default:
            errorMessage = `请求失败 (${response.status}): ${
              errorData.message || errorData.detail || '未知错误'
            }`
        }

        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error('响应体为空')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''
      let actualSessionId = requestData.sessionId // 保存实际的会话ID
      let messageId = `msg_${Date.now()}`
      let totalTokens = 0
      let modelName = ''

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          // 解码数据
          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          // 处理Server-Sent Events格式
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保留不完整的行

          for (const line of lines) {
            //console.log('📡 处理SSE行:', line)

            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
             // console.log('📡 SSE数据:', data, '用时', Math.floor(Date.now() / 1000))

              if (data === '[DONE]') {
                // 兼容旧版本的[DONE]标记
                const endData = {
                  type: 'end',
                  messageId: messageId,
                  sessionId: actualSessionId,
                  timestamp: new Date().toISOString(),
                  tokens: totalTokens,
                  model: modelName,
                  content: fullContent
                }

                console.log('✅ 流式传输完成（[DONE]标记），返回数据:', endData)
                console.log('✅ 调用onComplete回调')
                onComplete?.(endData)
                return {
                  content: fullContent,
                  sessionId: actualSessionId,
                  messageId: messageId,
                  tokens: totalTokens,
                  model: modelName
                }
              }

              try {
                const parsed = JSON.parse(data)
                //   console.log('📡 解析的SSE数据:', parsed)

                // 特别检查图片生成相关的数据
                if (parsed.message_type === 'image_generation_success') {
                  console.log('🔍 SSE解析阶段 - 图片生成数据检查:')
                  console.log('  - 原始data字符串:', data)
                  console.log('  - parsed.generated_images:', parsed.generated_images)
                  console.log('  - parsed.images:', parsed.images)
                  console.log('  - parsed所有字段:', Object.keys(parsed))
                }

                // 检查是否是结束数据
                if (parsed.type === 'end') {
                  //console.log('✅ 收到结束数据，流式传输完成')

                  // 构造完整的结束数据
                  const endData = {
                    type: 'end',
                    messageId: parsed.messageId || messageId,
                    sessionId: parsed.sessionId || actualSessionId,
                    timestamp: parsed.timestamp || new Date().toISOString(),
                    tokens: parsed.tokens || totalTokens,
                    model: parsed.model || modelName,
                    knowledge_data: parsed.knowledge_data || [],
                    web_search_results: parsed.web_search_results || [],
                    content: fullContent
                  }

                  //console.log('✅ 流式传输完成（end类型），返回数据:', endData)
                  // console.log('✅ 调用onComplete回调')
                  onComplete?.(endData)
                  return {
                    content: fullContent,
                    sessionId: parsed.sessionId || actualSessionId,
                    messageId: parsed.messageId || messageId,
                    tokens: parsed.tokens || totalTokens,
                    model: parsed.model || modelName,
                    knowledge_data: parsed.knowledge_data || [],
                    web_search_results: parsed.web_search_results || []
                  }
                }

                // 处理内容数据 - 支持您的后台数据格式
                if (parsed.type === 'content' && parsed.content) {
                  // console.log('📝 收到内容数据:', parsed.content)

                  // 更新会话ID和消息ID
                  if (parsed.sessionId && !actualSessionId) {
                    actualSessionId = parsed.sessionId
                    // console.log('📝 更新会话ID:', actualSessionId)
                  }

                  if (parsed.messageId) {
                    messageId = parsed.messageId
                    //  console.log('📝 更新消息ID:', messageId)
                  }

                  // 累积内容
                  fullContent += parsed.content
                  totalTokens += 1 // 简单的token计数

                  // 构造数据块
                  const chunkData = {
                    content: parsed.content,
                    sessionId: parsed.sessionId || actualSessionId,
                    messageId: parsed.messageId || messageId,
                    timestamp: parsed.timestamp,
                    message_type: parsed.message_type,
                    generated_images: parsed.generated_images
                  }

                  // console.log('📝 调用onChunk回调，数据:', chunkData)
                  onChunk?.(chunkData)
                  continue
                }

                // 检查是否是图片生成成功响应
                if (parsed.message_type === 'image_generation_success') {
                  console.log('🖼️ API层收到图片生成成功响应:', parsed)
                  console.log('🔍 API层详细检查parsed对象结构:')
                  console.log('  - parsed.generated_images:', parsed.generated_images)
                  console.log('  - parsed.images:', parsed.images)
                  console.log('  - parsed的所有属性:', Object.keys(parsed))
                  console.log('  - parsed完整内容:', JSON.stringify(parsed, null, 2))

                  // 直接调用onChunk传递完整的图片生成数据
                  // console.log('🚀 API层调用onChunk，传递数据:', parsed)
                  onChunk?.(parsed, fullContent, parsed)

                  // 更新fullContent以包含文本内容
                  if (parsed.content) {
                    fullContent += parsed.content
                  }

                  // 继续处理其他字段
                } else if (parsed.content) {
                  // 处理普通流式内容
                  fullContent += parsed.content
                  totalTokens += 1 // 简单的token计数

                  // 构造符合前端期望的数据格式
                  const chunkData = {
                    content: parsed.content,
                    sessionId: parsed.sessionId || actualSessionId,
                    messageId: parsed.messageId || messageId,
                    timestamp: parsed.timestamp,
                    message_type: parsed.message_type
                  }

                  // console.log('📝 调用onChunk回调，数据:', chunkData)
                  chatDebugger.checkDataReceived(chunkData)
                  onChunk?.(chunkData)
                }

                // 处理会话ID（新会话时后台会返回）
                if (parsed.sessionId && parsed.sessionId !== actualSessionId) {
                  actualSessionId = parsed.sessionId
                  console.log('接收到新的会话ID:', actualSessionId)
                }

                // 处理消息ID
                if (parsed.messageId) {
                  messageId = parsed.messageId
                }

                // 处理token统计
                if (parsed.tokens !== undefined) {
                  totalTokens = parsed.tokens
                }

                // 处理模型信息
                if (parsed.model) {
                  modelName = parsed.model
                }
              } catch (e) {
                // 忽略解析错误，继续处理下一行
                console.warn('解析SSE数据失败:', data)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      return { content: fullContent }
    })
    .catch((error) => {
      console.error('AI流式请求失败:', error)

      if (error.name === 'AbortError') {
        const abortError = new Error('请求已取消')
        onError?.(abortError)
        throw abortError
      }

      // 处理不同类型的错误
      let errorMessage = '未知错误'

      if (error.message.includes('HTTP 400')) {
        errorMessage = '请求参数错误'
      } else if (error.message.includes('HTTP 401')) {
        errorMessage = '认证失败，请检查API密钥'
      } else if (error.message.includes('HTTP 422')) {
        errorMessage = '参数验证失败'
      } else if (error.message.includes('HTTP 429')) {
        errorMessage = '请求过于频繁，请稍后再试'
      } else if (error.message.includes('HTTP 500')) {
        errorMessage = '服务器内部错误，请稍后重试'
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = '网络连接失败，请检查网络连接'
      } else {
        errorMessage = error.message
      }

      const finalError = new Error(errorMessage)
      onError?.(finalError)
      throw finalError
    })

  // 返回包含取消功能的Promise
  return Object.assign(streamRequest, {
    cancel: () => {
      controller.abort()
    },
    controller
  })
}

/**
 * 获取基础URL
 */
function getBaseURL() {
  // 这里应该根据实际情况返回API基础URL
  return import.meta.env.VITE_API_BASE_URL || window.location.origin
}

/**
 * 获取认证头
 */
function getAuthHeaders() {
  const headers = {}

  // 获取用户认证token
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // 如果有API密钥，也添加到请求头（可选）
  const apiKey = import.meta.env.VITE_AI_API_KEY
  if (apiKey) {
    headers['X-API-Key'] = apiKey
  }

  return headers
}

/**
 * 发送消息给AI助教（普通请求）
 * @param {Object} data - 消息数据
 * @param {string} data.message - 用户消息内容
 * @param {string} data.userId - 用户ID
 * @param {string} data.sessionId - 会话ID（可选）
 * @param {string} data.context - 上下文信息（可选）
 * @param {string} data.timestamp - 时间戳（可选）
 * @param {Array} data.images - 上传的图片列表（可选）
 * @param {boolean} data.enableWebSearch - 是否启用联网搜索（可选）
 * @returns {Promise} API响应
 */
export function sendMessage(data) {
  // 参数验证
  if (!data || typeof data !== 'object') {
    return Promise.reject(new Error('请求参数必须是对象'))
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    return Promise.reject(new Error('消息内容不能为空'))
  }

  if (data.message.length > 2000) {
    return Promise.reject(new Error('消息内容过长，最多支持2000个字符'))
  }

  // 构造请求数据
  const requestData = {
    message: data.message.trim(),
    userId: data.userId || '',
    sessionId: data.sessionId, // 不在这里生成，让后台处理
    context: data.context || '',
    timestamp: data.timestamp || new Date().toISOString(),
    images: data.images || [],
    enable_web_search: data.enableWebSearch || false
  }

  console.log('🌐 发送AI普通请求:', requestData)
  console.log('🌐 请求URL:', api_base + '/ai/assistant/chat')
  console.log('🌐 普通请求体详情:', {
    sessionId: requestData.sessionId,
    sessionId类型: typeof requestData.sessionId,
    sessionId值:
      requestData.sessionId === null
        ? 'null'
        : requestData.sessionId === ''
        ? '空字符串'
        : requestData.sessionId,
    完整请求体: JSON.stringify(requestData, null, 2)
  })

  return request({
    url: api_base + '/ai/assistant/chat',
    method: 'post',
    data: requestData
  }).catch((error) => {
    console.log('API请求失败:', error)

    // 如果是HTTP错误响应，提供更详细的错误信息
    if (error.response) {
      const status = error.response.status
      const data = error.response.data || {}

      console.log('错误状态码:', status)
      console.log('错误响应数据:', data)

      let errorMessage = ''
      switch (status) {
        case 400:
          errorMessage = `请求参数错误 (400): ${data.message || data.detail || '参数格式不正确'}`
          break
        case 401:
          errorMessage = `认证失败 (401): ${data.message || '请检查API密钥'}`
          break
        case 422:
          errorMessage = `参数验证失败 (422): ${
            data.message || data.detail || '请检查输入参数格式'
          }`
          if (data.detail && Array.isArray(data.detail)) {
            const validationErrors = data.detail
              .map((err) => `${err.loc?.join('.')} - ${err.msg}`)
              .join('; ')
            errorMessage += ` 详细错误: ${validationErrors}`
          }
          break
        case 429:
          errorMessage = `请求过于频繁 (429): ${data.message || '请稍后再试'}`
          break
        case 500:
          errorMessage = `服务器内部错误 (500): ${data.message || '请稍后重试'}`
          break
        default:
          errorMessage = `请求失败 (${status}): ${data.message || data.detail || '未知错误'}`
      }

      throw new Error(errorMessage)
    }

    // 重新抛出原始错误
    throw error
  })
}

/**
 * 获取AI助教的历史对话记录
 * @param {string} sessionId - 会话ID
 * @param {number} page - 页码
 * @param {number} size - 每页数量
 * @returns {Promise} API响应
 */
export function getChatHistory(sessionId, page = 1, size = 20) {
  return request({
    url: api_base + '/chat/session/history',
    method: 'get',
    params: {
      sessionId,
      page,
      size
    }
  })
}

/**
 * 获取AI助教的会话列表
 * @param {string} userId - 用户ID
 * @param {number} page - 页码
 * @param {number} size - 每页数量
 * @returns {Promise} API响应
 */
export function getChatSession(userId, page = 1, size = 10, noProject = false) {
  return request({
    url: api_base + '/chat/sessions',
    method: 'get',
    params: {
      userId,
      page,
      size,
      noProject
    }
  })
}

/**
 * 创建新的AI助教会话
 * @param {Object} data - 会话数据
 * @param {string} data.title - 会话标题（可选）
 * @param {string} data.type - 会话类型（可选）
 * @returns {Promise} API响应
 */
export function createSession(data = {}) {
  return request({
    url: api_base + '/chat/session',
    method: 'post',
    data: {
      title: data.title || '新对话',
      type: data.type || 'general',
      createdAt: new Date().toISOString()
    }
  })
}

/**
 * 删除AI助教会话
 * @param {string} sessionId - 会话ID
 * @returns {Promise} API响应
 */
export function deleteSession(sessionId) {
  return request({
    url: api_base + `/chat/session/${sessionId}`,
    method: 'delete'
  })
}

/**
 * 保存聊天历史记录到服务器
 * @param {string} sessionId - 会话ID
 * @param {Array} messages - 消息列表
 * @returns {Promise} API响应
 */
export function saveChatHistory(sessionId, messages) {
  return request({
    url: api_base + '/chat/session/history',
    method: 'post',
    data: {
      sessionId,
      messages: messages.map((msg) => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        sessionId: msg.sessionId || sessionId
      }))
    }
  })
}

/**
 * 更新会话信息
 * @param {string} sessionId - 会话ID
 * @param {Object} sessionData - 会话数据
 * @returns {Promise} API响应
 */
export function updateSession(sessionId, sessionData) {
  return request({
    url: api_base + `/chat/session/${sessionId}`,
    method: 'put',
    data: {
      title: sessionData.title,
      updatedAt: sessionData.updatedAt || new Date().toISOString(),
      messageCount: sessionData.messageCount,
      lastMessage: sessionData.lastMessage
    }
  })
}

/**
 * 更新会话标题
 * @param {string} sessionId - 会话ID
 * @param {string} title - 会话标题
 * @returns {Promise} API响应
 */
export function updateSessionTitle(sessionId, title) {
  return request({
    url: `/gpt-api/chat/session/${sessionId}/title`,
    method: 'put',
    data: { title }
  })
}

/**
 * 清除会话的聊天历史记录
 * @param {string} sessionId - 会话ID
 * @returns {Promise} API响应
 */
export function clearChatHistory(sessionId) {
  return request({
    url: api_base + `/chat/session/${sessionId}`,
    method: 'delete'
  })
}

/**
 * 删除一次用户与AI助手的对话（一问一答的一对消息）
 * @param {string} sessionId - 会话ID
 * @param {string} messageId - 消息ID
 * @returns {Promise} API响应
 */
export function deleteMessagePair(sessionId, messageId) {
  return request({
    url: api_base + `/chat/session/${sessionId}/message-pair/${messageId}`,
    method: 'delete'
  })
}

// 搜索对话消息
export function searchMessages(userId, keyword, page = 1, size = 20) {
  return request({
    url: '/gpt-api/chat/messages/search',
    method: 'get',
    params: {
      userId,
      keyword,
      page,
      size
    }
  })
}

/**
 * 获取AI助教的快捷回复模板
 * @returns {Promise} API响应
 */
export function getQuickReplies() {
  return request({
    url: api_base + '/ai/assistant/quick-replies',
    method: 'get'
  })
}

/**
 * 获取AI助教的配置信息
 * @returns {Promise} API响应
 */
export function getAssistantConfig() {
  return request({
    url: api_base + '/ai/assistant/config',
    method: 'get'
  })
}

/**
 * 获取可用的AI模型列表
 * @returns {Promise} API响应
 */
export function getAssistantModels() {
  return request({
    url: api_base + '/models/all',
    method: 'get'
  })
}

/**
 * 获取AI助教的使用统计
 * @param {string} timeRange - 时间范围 (day/week/month)
 * @returns {Promise} API响应
 */
export function getUsageStats(timeRange = 'week') {
  return request({
    url: api_base + '/ai/assistant/stats',
    method: 'get',
    params: {
      timeRange
    }
  })
}

/**
 * 停止AI生成
 * @param {Object} data - 停止请求数据
 * @param {string} data.userId - 用户ID（必填）
 * @param {string} data.sessionId - 会话ID（必填）
 * @param {string} data.messageId - 消息ID（可选）
 * @returns {Promise} API响应
 */
export function stopGeneration(data) {
  return request({
    url: api_base + '/chat/stop',
    method: 'post',
    data: {
      userId: data.userId,
      sessionId: data.sessionId,
      messageId: data.messageId || null,
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * 反馈AI助教回复质量
 * @param {Object} feedback - 反馈数据
 * @param {string} feedback.messageId - 消息ID
 * @param {number} feedback.rating - 评分 (1-5)
 * @param {string} feedback.comment - 评论（可选）
 * @returns {Promise} API响应
 */
export function submitFeedback(feedback) {
  return request({
    url: '/ai/assistant/feedback',
    method: 'post',
    data: {
      messageId: feedback.messageId,
      rating: feedback.rating,
      comment: feedback.comment || '',
      timestamp: new Date().toISOString()
    }
  })
}

/**
 * 生成会话ID
 * @returns {string} 唯一的会话ID
 */
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11)
}

/**
 * 模拟AI回复（用于开发测试）
 * @param {string} message - 用户消息
 * @returns {Promise} 模拟的AI回复
 */
export function mockAiResponse(message) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const responses = [
        '我理解您的问题。让我为您详细解答...',
        '这是一个很好的问题！根据我的知识，我建议...',
        '关于这个问题，我可以从以下几个方面来帮助您：\n1. 首先...\n2. 其次...\n3. 最后...',
        '感谢您的提问。基于您的描述，我认为您可以尝试以下方法...',
        '让我为您分析一下这个问题的关键点...',
        '根据您的需求，我推荐以下解决方案...'
      ]

      const randomResponse = responses[Math.floor(Math.random() * responses.length)]

      resolve({
        code: 200,
        data: {
          message: randomResponse,
          messageId: 'msg_' + Date.now(),
          timestamp: new Date().toISOString(),
          type: 'assistant'
        },
        msg: 'success'
      })
    }, 1000 + Math.random() * 2000) // 1-3秒的随机延迟
  })
}

/**
 * 获取预设的快捷操作
 * @returns {Array} 快捷操作列表
 */
export function getQuickActions() {
  return [
    { id: 1, label: '学习建议', message: '请给我一些学习建议', icon: 'Reading' },
    { id: 2, label: '答疑解惑', message: '我有一个问题需要解答', icon: 'QuestionFilled' },
    { id: 3, label: '课程推荐', message: '请推荐一些适合的课程', icon: 'School' },
    { id: 4, label: '技术指导', message: '我需要一些技术方面的指导', icon: 'Tools' },
    { id: 5, label: '项目帮助', message: '我在项目中遇到了困难', icon: 'Folder' },
    { id: 6, label: '学习计划', message: '帮我制定一个学习计划', icon: 'Calendar' }
  ]
}

/**
 * 存储相关方法 - 现在使用API而不是localStorage
 */
export const storage = {

}
