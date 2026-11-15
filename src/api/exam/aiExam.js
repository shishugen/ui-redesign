import request from '@/utils/request'

// AI 判分接口要同步等大模型返回，全局 10s 必然超时，这里单独放宽。
// 且必须大于 Java 侧 exam.ai-grader.read-timeout-ms（默认 120s）：谁先超时谁报错，
// 让 Java 先断才能拿到可读的失败原因（code 500 会弹 msg），而不是前端一个看不懂的 ECONNABORTED
const AI_GRADE_TIMEOUT = 125000

// 保存到AI试卷库（只建待用试卷 + 落题，不建考试安排）
export function saveAiPaper(data) {
  return request({
    url: '/aigc/exam/aiExam/savePaper',
    method: 'post',
    data: data
  })
}

// 用已有AI试卷发布一场考试（paperId + 考试安排字段；一张卷可考多场）
export function publishAiExam(data) {
  return request({
    url: '/aigc/exam/aiExam/publish',
    method: 'post',
    data: data
  })
}

// AI试卷下拉选项（考试安排表单选卷，出参结构对齐 findListPaper）
export function listAiPaperOptions() {
  return request({
    url: '/aigc/exam/aiExam/paperOptions',
    method: 'get'
  })
}

// 试卷详情（回显卷属性）
export function getAiPaper(paperId) {
  return request({
    url: '/aigc/exam/aiExam/paper/' + paperId,
    method: 'get'
  })
}

// 修改试卷属性（卷名/及格线/状态）
export function updateAiPaper(data) {
  return request({
    url: '/aigc/exam/aiExam/paper',
    method: 'put',
    data: data
  })
}

// 删除试卷（被考试引用的卷后端会拒删）
export function delAiPaper(paperId) {
  return request({
    url: '/aigc/exam/aiExam/paper/' + paperId,
    method: 'delete'
  })
}

// 引用该试卷的考试安排列表（一张卷可考多场）
export function listAiPaperExams(paperId) {
  return request({
    url: '/aigc/exam/aiExam/paperExams/' + paperId,
    method: 'get'
  })
}

// 按试卷id取题目（AI试卷管理页预览，含待用卷）
export function getAiPaperQuestions(paperId) {
  return request({
    url: '/aigc/exam/aiExam/paperQuestions/' + paperId,
    method: 'get'
  })
}

// 编辑态取整卷题目（含正确答案与解析，仅创建人/管理员）
export function getAiPaperQuestionsForEdit(paperId) {
  return request({
    url: '/aigc/exam/aiExam/paperQuestionsForEdit/' + paperId,
    method: 'get'
  })
}

// 整卷题目覆盖式保存（全字段可改 + 可删题）
export function updateAiPaperQuestions(data) {
  return request({
    url: '/aigc/exam/aiExam/paperQuestions',
    method: 'put',
    data: data
  })
}

// 获取AI考试信息
export function getAiExamInfo(examId) {
  return request({
    url: '/aigc/exam/aiExam/examInfo/' + examId,
    method: 'get'
  })
}

// 获取AI考试试卷题目（不含答案/解析）
// attemptNo 只在作业重做时传：普通考试不传就是第一轮，服务端按轮次回显该轮已答内容
export function getAiQuestions(examId, attemptNo) {
  return request({
    url: '/aigc/exam/aiExam/questions/' + examId,
    method: 'get',
    params: { attemptNo }
  })
}

// 逐题保存答案（data.attemptNo 跟着当前作答轮次，不传即第一轮）
export function saveAiAnswer(data) {
  return request({
    url: '/aigc/exam/aiExam/saveAnswer',
    method: 'post',
    data: data
  })
}

// 交卷（客观题自动判分）
export function submitAiExam(examId, attemptNo) {
  return request({
    url: '/aigc/exam/aiExam/submit/' + examId,
    method: 'post',
    params: { attemptNo }
  })
}

// 我的成绩与答卷回看（未交卷会报“尚未交卷”，列表轮询不要用这个）
// 不传 attemptNo 时服务端取“分数最高的那轮”
export function getMyAiPaper(examId, attemptNo) {
  return request({
    url: '/aigc/exam/aiExam/myPaper/' + examId,
    method: 'get',
    params: { attemptNo }
  })
}

// 我的交卷状态（考试中心列表轮询专用：未交卷也返回 200，不弹错）
export function getMyAiSubmitted(examId, attemptNo) {
  return request({
    url: '/aigc/exam/aiExam/mySubmitted/' + examId,
    method: 'get',
    params: { attemptNo }
  })
}

// AI试卷列表（查 aigc_ai_exam_paper 试卷表，分页）
export function listAiPaper(query) {
  return request({
    url: '/aigc/exam/aiExam/paperList',
    method: 'get',
    params: query
  })
}

// 某场考试学生成绩列表（教师）
export function listAiGrade(examId) {
  return request({
    url: '/aigc/exam/aiExam/gradeList/' + examId,
    method: 'get'
  })
}

// 单个学生逐题作答明细（教师）
// attemptNo 可省：不传时服务端取成绩列表上看到的那一轮（已交卷里最高分那轮）
export function getAiGradeDetail(examId, userId, attemptNo) {
  return request({
    url: '/aigc/exam/aiExam/gradeDetail',
    method: 'get',
    params: { examId, userId, attemptNo }
  })
}

// 主观题人工评分（教师）
export function markAiAnswer(data) {
  return request({
    url: '/aigc/exam/aiExam/mark',
    method: 'post',
    data: data
  })
}

// 采纳 AI 建议分（教师，采纳后该题才计入成绩）
export function confirmAiGrade(data) {
  return request({
    url: '/aigc/exam/aiExam/confirmGrade',
    method: 'post',
    timeout: AI_GRADE_TIMEOUT,
    data: data
  })
}

// 单题立即重判（教师，同步调 AI 判分服务）
export function retryAiGrade(data) {
  return request({
    url: '/aigc/exam/aiExam/retryGrade',
    method: 'post',
    timeout: AI_GRADE_TIMEOUT,
    data: data
  })
}

// AI 起草（教师，未批完的题）：只把得分与理由回给前端填进评分框，不写库，点「批阅」才生效
export function draftAiGrade(data) {
  return request({
    url: '/aigc/exam/aiExam/draftGrade',
    method: 'post',
    timeout: AI_GRADE_TIMEOUT,
    data
  })
}

// AI 更新已批阅完的题（教师，重判后直接覆盖生效分与评语；前端需二次确认）
export function overwriteAiGrade(data) {
  return request({
    url: '/aigc/exam/aiExam/overwriteGrade',
    method: 'post',
    timeout: AI_GRADE_TIMEOUT,
    data: data
  })
}

// 手动触发一批简答题预评（教师，定时任务的旁路）
export function previewAiGrade(data) {
  return request({
    url: '/aigc/exam/aiExam/previewGrade',
    method: 'post',
    timeout: AI_GRADE_TIMEOUT,
    data: data
  })
}

// 整卷确认批阅（教师）：收口一份答卷，此后成绩才对学生可见；不动任何分数
export function confirmAiPaperGrade(data) {
  return request({
    url: '/aigc/exam/aiExam/confirmPaperGrade',
    method: 'post',
    data: data
  })
}

// 取消整卷确认（教师）：成绩重新对学生隐藏，确认痕迹保留
// data.attemptNo 不传时退的是列表上看到的那一轮
export function undoAiPaperGrade(data) {
  return request({
    url: '/aigc/exam/aiExam/undoPaperGrade',
    method: 'post',
    data: data
  })
}

// 整卷批量确认（教师）：只收勾选的那几份，userIds 必传（空则服务端直接拒，不默认收全场）
// 每份能否确认仍由服务端按成绩列表口径现算，回 {confirmed 已确认人数, skipped 跳过人数, failed 未能确认的人与原因}
export function confirmAllAiPaperGrade(data) {
  return request({
    url: '/aigc/exam/aiExam/confirmPaperGradeBatch',
    method: 'post',
    data: data
  })
}
