import request from '@/utils/request'
import { getToken } from '@/utils/auth'
const api_base = '/gpt-api'

// 提示词优化（流式）
export function optimizePromptStream(data, onChunk, onComplete, onError) {
  const requestData = {
    core_prompt: data.core_prompt,
    chapter_title: data.chapter_title || '',
    chapter_overview: data.chapter_overview || '',
    role_and_skills: data.role_and_skills || '',
    scenario_and_requirements: data.scenario_and_requirements || '',
    requirements_and_tasks: data.requirements_and_tasks || '',
    constraints_and_limitations: data.constraints_and_limitations || '',
    deliverables_and_requirements: data.deliverables_and_requirements || '',
    additional_info: data.additional_info || '',
    reference_template: data.reference_template || '',
    reference_title: data.reference_title || '',
    reference_content: data.reference_content || ''
  }

  const controller = new AbortController()

  fetch(api_base + '/course-creation/optimize-prompt/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Authorization': `Bearer ${getToken() || ''}`
    },
    body: JSON.stringify(requestData),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        let errorData = {}
        try {
          const errorText = await response.text()
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: '请求失败' }
        }
        const error = new Error(errorData.message || `请求失败 (${response.status})`)
        error.status = response.status
        onError?.(error)
        throw error
      }

      if (!response.body) {
        const error = new Error('响应体为空')
        onError?.(error)
        throw error
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          onComplete?.()
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              onComplete?.()
              return controller
            }
            if (data) {
              try {
                const parsed = JSON.parse(data)
                onChunk?.(parsed)
              } catch (e) {
                onChunk?.({ content: data })
              }
            }
          }
        }
      }

      return controller
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        return controller
      }
      onError?.(error)
      throw error
    })

  return controller
}

// 提示词优化（非流式）- 保留原函数但标记为废弃或重定向到流式
export function optimizePrompt(data) {
  console.warn('optimizePrompt 已废弃，请使用 optimizePromptStream')
  // 可以临时调用流式接口并收集结果
  return new Promise((resolve, reject) => {
    let fullContent = ''
    const controller = optimizePromptStream(data,
      (chunk) => {
        if (chunk.content) {
          fullContent += chunk.content
        }
      },
      () => {
        resolve({
          status: 200,
          message: '提示词优化成功',
          data: {
            optimized_prompt: fullContent,
            original_prompt: data.core_prompt,
            success: true
          }
        })
      },
      (error) => reject(error)
    )
  })
}

// 生成课程内容（流式）
export function generateContentStream(data, onChunk, onComplete, onError) {
  const requestData = {
    optimized_prompt: data.optimized_prompt,
    chapter_index: data.chapter_index || 1,
    chapter_title: data.chapter_title || '',
    course_title: data.course_title || '',
    course_overview: data.course_overview || '',
    reference_title: data.reference_title || '',
    reference_content: data.reference_content || '',
    skip_optimization: data.skip_optimization || false,
    session_id: data.session_id || ''
  }

  const controller = new AbortController()

  fetch(api_base + '/course-creation/generate-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Authorization': `Bearer ${getToken() || ''}`
    },
    body: JSON.stringify(requestData),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        let errorData = {}
        try {
          const errorText = await response.text()
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: '请求失败' }
        }
        const error = new Error(errorData.message || `请求失败 (${response.status})`)
        error.status = response.status
        onError?.(error)
        throw error
      }

      if (!response.body) {
        const error = new Error('响应体为空')
        onError?.(error)
        throw error
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          onComplete?.()
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              onComplete?.()
              return controller
            }
            if (data) {
              try {
                const parsed = JSON.parse(data)
                onChunk?.(parsed)
              } catch (e) {
                onChunk?.({ content: data })
              }
            }
          }
        }
      }

      return controller
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        return controller
      }
      onError?.(error)
      throw error
    })

  return controller
}

// 生成配图提示词（非流式）
export function generateImagePrompt(data) {
  return request({
    url: api_base + '/course-creation/generate-image-prompt',
    method: 'post',
    data,
    timeout: 60000 // 60秒超时
  })
}

// 生成配图（非流式）
export function generateImage(data) {
  return request({
    url: api_base + '/course-creation/generate-image',
    method: 'post',
    data,
    timeout: 60000 // 60秒超时
  })
}

// 优化图片提示词（流式）
export function optimizeImagePrompt(data, onChunk, onComplete, onError) {
  const requestData = {
    prompt: data.prompt,
    type: data.type || 'image_prompt'
  }

  const controller = new AbortController()

  fetch(api_base + '/course-creation/optimize-image-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Authorization': `Bearer ${getToken() || ''}`
    },
    body: JSON.stringify(requestData),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        let errorData = {}
        try {
          const errorText = await response.text()
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: '请求失败' }
        }
        const error = new Error(errorData.message || `请求失败 (${response.status})`)
        error.status = response.status
        onError?.(error)
        throw error
      }

      if (!response.body) {
        const error = new Error('响应体为空')
        onError?.(error)
        throw error
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          onComplete?.()
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const dataStr = line.substring(6)
              if (dataStr.trim()) {
                const chunk = JSON.parse(dataStr)
                onChunk?.(chunk)
              }
            } catch (e) {
              console.error('解析SSE数据失败:', e)
            }
          }
        }
      }
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError?.(error)
      }
    })

  return controller
}

// 生成配图（流式）
export function generateImageStream(data, onChunk, onComplete, onError) {
  const requestData = {
    image_prompt: data.image_prompt,
    style: data.style || 'educational'
  }

  const controller = new AbortController()

  fetch(api_base + '/course-creation/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Authorization': `Bearer ${getToken() || ''}`
    },
    body: JSON.stringify(requestData),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        let errorData = {}
        try {
          const errorText = await response.text()
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: '请求失败' }
        }
        const error = new Error(errorData.message || `请求失败 (${response.status})`)
        error.status = response.status
        onError?.(error)
        throw error
      }

      if (!response.body) {
        const error = new Error('响应体为空')
        onError?.(error)
        throw error
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          onComplete?.()
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              onComplete?.()
              return controller
            }
            if (data) {
              try {
                const parsed = JSON.parse(data)
                onChunk?.(parsed)
              } catch (e) {
                onChunk?.({ content: data })
              }
            }
          }
        }
      }

      return controller
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        return controller
      }
      onError?.(error)
      throw error
    })

  return controller
}

// 创建课程
export function createCourse(data) {
  return request({
    url: api_base + '/course-creation/courses',
    method: 'post',
    data,
    timeout: 60000 // 60秒超时
  });
}

// 更新课程
export function updateCourse(courseId, data) {
  return request({
    url: api_base + `/course-creation/courses/${courseId}`,
    method: 'put',
    data,
    timeout: 60000 // 60秒超时
  });
}

// 创建课程章节
export function createCourseChapter(data) {
  return request({
    url: api_base + '/course-creation/course-chapters',
    method: 'post',
    data,
    timeout: 60000 // 60秒超时
  });
}

// 更新课程章节
export function updateCourseChapter(chapterId, data) {
  return request({
    url: api_base + `/course-creation/course-chapters/${chapterId}`,
    method: 'put',
    data,
    timeout: 60000 // 60秒超时
  });
}

// 获取课程列表
export function getCourses(params) {
  return request({
    url: api_base + '/course-creation/courses',
    method: 'get',
    params,
    timeout: 60000 // 60秒超时
  });
}

// 获取课程详情
export function getCourseDetail(courseId) {
  return request({
    url: api_base + `/course-creation/courses/${courseId}`,
    method: 'get',
    timeout: 60000 // 60秒超时
  });
}

// 删除课程
export function deleteCourse(courseId) {
  return request({
    url: api_base + `/course-creation/courses/${courseId}`,
    method: 'delete',
    timeout: 60000 // 60秒超时
  })
}

// 获取课程章节列表
export function getCourseChapters(courseId) {
  return request({
    url: api_base + `/course-creation/courses/${courseId}/chapters`,
    method: 'get',
    timeout: 60000 // 60秒超时
  });
}

// 根据课程ID获取章节列表
export function getChaptersByCourseId(courseId) {
  return request({
    url: api_base + `/course-creation/chapters/by-course-id/${courseId}`,
    method: 'get',
    timeout: 60000 // 60秒超时
  });
}

// 获取章节详情
export function getCourseChapterDetail(chapterId) {
  return request({
    url: api_base + `/course-creation/course-chapters/${chapterId}`,
    method: 'get',
    timeout: 60000 // 60秒超时
  });
}

// 通过关联章节ID获取章节详情
export function getChapterByChapterId(chapterId) {
  return request({
    url: api_base + `/course-creation/course-chapters/by-chapter-id/${chapterId}`,
    method: 'get',
    timeout: 60000 // 60秒超时
  });
}

// 删除课程章节
export function deleteCourseChapter(chapterId) {
  return request({
    url: api_base + `/course-creation/course-chapters/${chapterId}`,
    method: 'delete',
    timeout: 60000 // 60秒超时
  });
}

// 获取下一个可用的章节序号
export function getNextChapterIndex(courseId) {
  return request({
    url: api_base + `/course-creation/courses/${courseId}/next-chapter-index`,
    method: 'get',
    timeout: 60000 // 60秒超时
  });
}

// 压缩内容
export function compressContent(data) {
  return request({
    url: api_base + '/course-creation/compress-content',
    method: 'post',
    data,
    timeout: 60000 // 60秒超时
  });
}

// 更新章节顺序
export function updateChapterOrder(courseId, chapterOrders) {
  return request({
    url: api_base + `/course-creation/courses/${courseId}/chapters/order`,
    method: 'put',
    data: { chapter_orders: chapterOrders },
    timeout: 60000 // 60秒超时
  });
}

// 手动生成章节内容（流式）
export function manualGenerateContentStream(data, onChunk, onComplete, onError) {
  const requestData = {
    message: data.message,
    conversation_history: data.conversation_history || [],
    chapter_title: data.chapter_title || '',
    course_title: data.course_title || '',
    course_overview: data.course_overview || '',
    reference_title: data.reference_title || '',
    reference_content: data.reference_content || ''
  }

  const controller = new AbortController()

  fetch(api_base + '/course-creation/manual-generate/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'Authorization': `Bearer ${getToken() || ''}`
    },
    body: JSON.stringify(requestData),
    signal: controller.signal
  })
    .then(async (response) => {
      if (!response.ok) {
        let errorData = {}
        try {
          const errorText = await response.text()
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { message: '请求失败' }
        }
        const error = new Error(errorData.message || `请求失败 (${response.status})`)
        error.status = response.status
        onError?.(error)
        throw error
      }

      if (!response.body) {
        const error = new Error('响应体为空')
        onError?.(error)
        throw error
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          onComplete?.()
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              onComplete?.()
              return controller
            }
            if (data) {
              try {
                const parsed = JSON.parse(data)
                onChunk?.(parsed)
              } catch (e) {
                onChunk?.({ content: data })
              }
            }
          }
        }
      }

      return controller
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        return controller
      }
      onError?.(error)
      throw error
    })

  return controller
}


// 读取文件内容
export function readFiles(data) {
  return request({
    url: api_base + '/course-creation/read-files',
    method: 'post',
    data,
    timeout: 60000 // 60秒超时
  });
}

// 停止课程内容生成
export function stopContentGeneration(data) {
  return request({
    url: api_base + '/course-creation/stop',
    method: 'post',
    data,
    timeout: 10000 // 10秒超时
  });
}