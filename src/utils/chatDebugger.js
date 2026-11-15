/**
 * AI助手聊天调试工具
 * 用于排查消息显示问题
 */

export class ChatDebugger {
  constructor() {
    this.logs = []
    this.isEnabled = process.env.NODE_ENV === 'development'
  }

  log(category, message, data = null) {
    if (!this.isEnabled) return

    const logEntry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null
    }

    this.logs.push(logEntry)
    console.log(`[ChatDebugger:${category}] ${message}`, data || '')

    // 保持最近100条日志
    if (this.logs.length > 100) {
      this.logs.shift()
    }
  }

  // 检查数据接收
  checkDataReceived(sseData) {
    this.log('DATA_RECEIVED', 'SSE数据接收', {
      type: sseData.type,
      content: sseData.content,
      contentLength: sseData.content ? sseData.content.length : 0,
      messageId: sseData.messageId,
      sessionId: sseData.sessionId,
      timestamp: sseData.timestamp
    })
  }

  // 检查消息更新
  checkMessageUpdate(messagesBefore, messagesAfter, updateType) {
    this.log('MESSAGE_UPDATE', `消息更新: ${updateType}`, {
      beforeCount: messagesBefore.length,
      afterCount: messagesAfter.length,
      lastMessageBefore: messagesBefore[messagesBefore.length - 1],
      lastMessageAfter: messagesAfter[messagesAfter.length - 1]
    })
  }

  // 检查UI渲染
  checkUIRender(component, messageData) {
    this.log('UI_RENDER', `${component}组件渲染`, {
      messageId: messageData.id,
      messageType: messageData.type,
      content: messageData.content,
      contentLength: messageData.content ? messageData.content.length : 0,
      streaming: messageData.streaming,
      loading: messageData.loading
    })
  }

  // 检查错误
  checkError(errorType, error, context = null) {
    this.log('ERROR', `错误: ${errorType}`, {
      error: error.message || error,
      stack: error.stack,
      context
    })
  }

  // 获取调试报告
  getDebugReport() {
    return {
      totalLogs: this.logs.length,
      categories: this.logs.reduce((acc, log) => {
        acc[log.category] = (acc[log.category] || 0) + 1
        return acc
      }, {}),
      recentLogs: this.logs.slice(-20),
      summary: this.generateSummary()
    }
  }

  // 生成问题摘要
  generateSummary() {
    const dataReceivedLogs = this.logs.filter(log => log.category === 'DATA_RECEIVED')
    const messageUpdateLogs = this.logs.filter(log => log.category === 'MESSAGE_UPDATE')
    const uiRenderLogs = this.logs.filter(log => log.category === 'UI_RENDER')
    const errorLogs = this.logs.filter(log => log.category === 'ERROR')

    return {
      dataReceived: dataReceivedLogs.length,
      messageUpdates: messageUpdateLogs.length,
      uiRenders: uiRenderLogs.length,
      errors: errorLogs.length,
      lastDataReceived: dataReceivedLogs[dataReceivedLogs.length - 1],
      lastMessageUpdate: messageUpdateLogs[messageUpdateLogs.length - 1],
      lastUIRender: uiRenderLogs[uiRenderLogs.length - 1],
      lastError: errorLogs[errorLogs.length - 1]
    }
  }

  // 清空日志
  clearLogs() {
    this.logs = []
    console.log('[ChatDebugger] 日志已清空')
  }

  // 导出日志
  exportLogs() {
    const report = this.getDebugReport()
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-debug-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
}

// 创建全局调试器实例
export const chatDebugger = new ChatDebugger()

// 在开发环境下将调试器挂载到window对象
if (process.env.NODE_ENV === 'development') {
  window.chatDebugger = chatDebugger
}
