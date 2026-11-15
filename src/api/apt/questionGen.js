import request from '@/utils/request'

const api_base = '/gpt-api/question-gen'

// 出题接口超时时间（AI 生成整批题目耗时较长）
const timeout = 120000

// 解析出题依据文档（docx/pdf/txt/md），docx 嵌入图片与扫描版 pdf 会走 OCR 识别，
// 仅返回文本供前端暂存，后端不存储
export function parseFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request({
    url: api_base + '/parse_file',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 180000, // OCR 解析耗时较长，3分钟超时
    data: formData
  })
}

// 批量解析课程文件（学习附件/教学课件/章节附件统一按文件口径）：
// 后端从 FastDFS 下载并提取文本（含 OCR）后聚合返回，仅前端暂存，后端不存储
export function parseCourseFiles(files) {
  return request({
    url: api_base + '/parse_course_files',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 600000, // 多个文件逐个下载+OCR，预留 10 分钟
    data: { files }
  })
}

// 规则式压缩出题依据文本（后端去重+去噪声，不改写原文），返回压缩后的 content
export function compressContent(content) {
  return request({
    url: api_base + '/compress',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: timeout,
    data: { content }
  })
}

// AI 扩展知识点清单（自由主题模式：主题 → 两级结构清单供勾选），后端无状态不落库；
// 单次短输出，耗时远低于整批出题，60s 超时
export function expandKnowledge(data) {
  return request({
    url: api_base + '/expand_knowledge',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 60000,
    data: data
  })
}

// AI 出题：一次性返回结构化题目列表（后端不落库）
export function generateQuestions(data) {
  return request({
    url: api_base + '/generate',
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: timeout,
    data: data
  })
}
