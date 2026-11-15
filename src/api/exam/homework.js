import request from '@/utils/request'

/**
 * 章节作业接口
 * 设计文档：server/aigc-server/aigc-exam/docs/chapter_homework_design.md
 * 后端实现：HomeworkController（前缀 /aigc/exam/homework），与 AI 考试代码完全隔离
 *
 * 三条必须知道的约定：
 *  1. 取题/存答/批阅一律走 aiExam.js 的现有接口，这里不提供第二套 ——
 *     判分链路只允许有一套实现，复制一份必然导致普通考试与作业的分数算法漂移。
 *     例外只有一个：submitHomework 是作业侧的**交卷入口**，它在考试侧交卷之后多干一步
 *     「交卷即判」（简答题即时 AI 判分，见 HomeworkServiceImpl.submitHomework），
 *     判分仍然转调考试侧 IAiExamService.submit，不是第二套实现（设计文档 §4.8）。
 *     2026-10-08 起它不再定“接收老师”：交卷后本课全部任课老师都能在看板看到。
 *  2. 教师侧接口挂了 @PreAuthorize('exam:homework:*')，权限键由 chapter_homework.sql §5 建，
 *     执行完还必须给教师角色勾选，否则整条链路 403（本项目踩过两次，报错不指向权限）。
 *     学生侧（/myStatus、/draw、/submit）有意不加权限键，只受全局登录态保护。
 *  3. 业务失败（次数用完、不在开放时间、抽卷太频繁）由服务端 ServiceException 返回中文 msg，
 *     request 拦截器已统一弹窗并 reject；前端只需在 finally 里收尾，不要再按 code 分支，
 *     也不要再弹一次提示。
 */

// ================================================================ 学生侧

// 查询某章节的作业状态（章节页底部作业条的数据源）
// resp.data: { list: [{
//   groupId, title, maxAttempt, doneCount, paperCount,
//   hasUnfinished,       // 是否有进行中的轮次（state=0）
//   unfinishedExamId,    // 进行中那一场，用于直接续做
//   unfinishedAttemptNo,
//   requireFinish,       // 1=需先完成章节学习
//   showAnalysis, opened // opened=是否在开放时间窗内
// }] }
// 无作业时 list 为空数组，前端据此不渲染作业条（高度也要归零，见 ChapterList.vue）
export function getHomeworkMyStatus(chapterId, courseId) {
  return request({
    url: '/aigc/exam/homework/myStatus',
    method: 'get',
    params: {chapterId, courseId}
  })
}

// 抽卷：优先分配没做过的卷，池内卷都做过了则允许重复
// data: { groupId }
// resp.data: { examId, paperId, attemptNo, groupId, resumed }
// resumed=true 表示这是回到已抽到的那一轮（不消耗新次数），前端无需再弹确认
// ⚠ 2026-10-08 起不再有“提交归属”这一步：交卷后本课全部任课老师都能在看板看到，
// 旧行为见设计文档 §4.6/§4.12（已废弃）
export function drawHomework(data) {
  return request({
    url: '/aigc/exam/homework/draw',
    method: 'post',
    data
  })
}

// 交卷（§4.8）：服务端转调考试侧交卷，并在交完后即时 AI 判简答题——判分不在这一层
// 走的是 /homework/submit；2026-10-08 起不再带 teacherId（不再定单人归属）
// resp.data: { submitted, score, pendingCount, gradeState, attemptNo }（考试侧原样回包）
export function submitHomework(examId, attemptNo) {
  return request({
    url: '/aigc/exam/homework/submit/' + examId,
    method: 'post',
    params: {attemptNo}
  })
}

// ================================================================ 教师侧：作业

// 取本章节唯一的那份作业，不存在则服务端自动创建（幂等）——课程编辑页抽屉打开就调它
// resp.data: { group: HomeworkGroup, papers: [...] }，结构同 getHomeworkGroup
// title 只在新建那一刻用于生成作业名（传章节名），已有记录时服务端忽略
// 【主入口】一个章节只一份作业，界面上不再有「新建/选择作业组」这回事
export function ensureHomeworkChapter(chapterId, courseId, title) {
  return request({
    url: '/aigc/exam/homework/chapter',
    method: 'get',
    params: {chapterId, courseId, title}
  })
}

// 某章节下的作业组列表（含未发布）
// 【已降级】作业组不再暴露给老师，管理页请用 ensureHomeworkChapter；
// 本函数只留给排障与存量入口，resp.data: [HomeworkGroup...]
export function listHomeworkGroups(chapterId, courseId) {
  return request({
    url: '/aigc/exam/homework/group/byChapter/' + chapterId,
    method: 'get',
    params: {courseId}
  })
}

// 组详情 + 卷池明细
// resp.data: { group: HomeworkGroup, papers: [{paperId,title,questionCount,totalScore,status,examId,beginTime,endTime,attemptCount}] }
export function getHomeworkGroup(groupId) {
  return request({
    url: '/aigc/exam/homework/group/' + groupId,
    method: 'get'
  })
}

// 新建作业组
// 【已降级】一个章节只一份作业，正常流程请用 ensureHomeworkChapter 自动建；
// title 现在可省略（服务端按章节名兜底），保留本函数只给存量调用与排障
// data: {courseId, chapterId, title, maxAttempt, requireFinish, showAnalysis, beginTime, endTime, remark}
// beginTime/endTime 格式 yyyy-MM-dd HH:mm（服务端 @JsonFormat 就是这个pattern）
// resp.data: groupId
export function addHomeworkGroup(data) {
  return request({
    url: '/aigc/exam/homework/group',
    method: 'post',
    data
  })
}

// 更新作业组规则（同上字段 + groupId）
// 已有作答记录时下调 maxAttempt 会被服务端拒绝，提示改用「重置某轮」
export function updateHomeworkGroup(data) {
  return request({
    url: '/aigc/exam/homework/group',
    method: 'put',
    data
  })
}

// 删除作业组
// 卷池内已有学生轮次时服务端拒删（会留下看不见的分数的孤儿数据），此时应改用「关闭作业」
export function delHomeworkGroup(groupId) {
  return request({
    url: '/aigc/exam/homework/group/' + groupId,
    method: 'delete'
  })
}

// 关闭作业：学生端作业条立即消失、不能再抽卷
// 只改组状态，已排场次与已有轮次都不动，进行中的学生仍可交完这一轮
// 重新开放：再点一次「发布」即可回到已发布态
export function closeHomeworkGroup(groupId) {
  return request({
    url: '/aigc/exam/homework/group/close/' + groupId,
    method: 'put'
  })
}

// 发布整组：为池内每张「还没排考」的卷建一场考试（重复点安全，已排过的卷会跳过）
// 起止时间取自组上的时间窗，为空会被服务端拒；exam_type 由服务端强制写 2，前端无需也无法传
// resp.data: {published 新建场次数, groupStatus, paperCount}
export function publishHomeworkGroup(groupId) {
  return request({
    url: '/aigc/exam/homework/group/publish/' + groupId,
    method: 'post'
  })
}

// ================================================================ 教师侧：卷池

// 出一张新卷并直接入池
// groupId 走 query，data 与 aiExam.savePaper 的 AiExamPaperSaveDto 同构：
//   {title, passScore, questions:[{type,content,options,answer,explanation,difficulty,score}]}
// 建卷本身复用 IAiExamService.savePaper：落题/算总分/校验只有那一套
// 调用方是章节作业自己的出题面板 courseEdit/components/Homework/HomeworkGenPanel.vue（只读本章正文出题），
// 不是通用 AI 出题页 —— 作业出题的范围必须跟章节钉死，不能让学生学到哪一节却做到无关内容
export function saveHomeworkPaper(groupId, data) {
  return request({
    url: '/aigc/exam/homework/paper',
    method: 'post',
    params: {groupId},
    data
  })
}

// 停用/启用池内某张卷
// status: 1启用 0停用。停用只是不再分配给新学生，已抽到的仍可做完
// 这是「第一个学生交卷后该卷永久锁题」的唯一出路
export function updateHomeworkPaperStatus(paperId, status) {
  return request({
    url: `/aigc/exam/homework/paper/${paperId}/status`,
    method: 'put',
    params: {status}
  })
}

// ================================================================ 教师侧：统计与重置

// 组维度进度总览 + 逐轮成绩分布
// resp.data: {
//   group: HomeworkGroup,
//   summary: {userCount, attemptCount, submittedCount, confirmedCount},   // 可能为 null（一场没人做过）
//   attempts: [{userId, userName, examId, paperTitle, attemptNo, state, submitTime, score}],
//   papers: [...]                                                         // 同 getHomeworkGroup
// }
export function getHomeworkStatistics(groupId) {
  return request({
    url: '/aigc/exam/homework/statistics/' + groupId,
    method: 'get'
  })
}

// 授权删除某一轮记录（重做/补做）
// data: {groupId, userId, attemptNo}
// 该轮只要产生过作答就被服务端拒绝（分数本来就是 answer 实时聚合出来的，删轮次等于删成绩）
export function resetHomeworkAttempt(data) {
  return request({
    url: '/aigc/exam/homework/resetAttempt',
    method: 'post',
    data
  })
}

// ================================================================ 教师侧：完成看板（设计文档 §4 / §5.2）
//
// 管理员用的就是这一套接口，不另开一套（§4.9 定稿）：他进来拿到的是全量数据，
// 拉开关的仍是服务端 boardOwner()（userId=1 或 roleKey=admin → owner 为空），本文件不需要多传任何参数。
// 课程下拉对他是**全库所有课**（含一门作业都没布置的，选项标「暂无作业」）——
// 2026-10-01 用户定：「下拉要展示所有的课程，跟老师一样」；这里曾加过一道 EXISTS(作业池) 过滤已去掉，
// 因为它恰好把“哪些课还没布置作业”这个信息干掉了。点到 0 作业的课不会拉出“都没做”的表：
// 服务端在进聚合前就返回 emptyReason「该课程还没有布置作业」（与老师点自己那些空课是同一条路径）。
//
// 三个口径要先记住：
//  1. classIds 一律拼成逗号串传（后端是 @RequestParam List<Long>）。数组直传会受 axios
//     默认序列化影响变成 classIds[]=1，Spring 不认；逗号串两种序列化下都能绑上。
//  2. “全部班级”不是不传 —— 必须展开成当前课程下的完整班级id，后端靠它算完成率的分母。
//     一个班都没展开时服务端直接报「请先选择班级」。
//  3. 看板只读：本模块没有任何评分/确认入口，简答题要改分得回考试批阅页。

// 看板筛选器：课程总返，班级与章节只在传了 courseId 时返
// resp.data: {
//   courses:[{courseId, courseName, chapterCount, groupCount}],   // chapterCount>0 的才进 tabs
//   classes: [{classId, className, studentCount}],                // 已布置的班 ∪ 有完成记录学生所在的班
//   chapters: [{chapterId, chapterName, groupCount}]              // 只列有作业池的章节
// }
export function getHomeworkBoardFilters(courseId) {
  return request({
    url: '/aigc/exam/homework/board/filters',
    method: 'get',
    params: {courseId}
  })
}

// 完成看板：一个接口两态，mode 由服务端按 chapterId 是否为空自己切
// query: {courseId, classIds:[id...], chapterId}  chapterId 为空→态 A（学生×章节，含未完成行）
// resp.data: {
//   mode: 'student' | 'paper',
//   summary: {totalStudents, finishedStudents, finishRate},
//   rows: 态A [{userId,userName,classId,className,chapterId,chapterName,finished,submitted,
//               bestExamId,bestAttemptNo,bestPaperId,bestPaperTitle,bestScore,finishedTime}]
//         态B [{paperId,examTitle,examId,finishedStudents,avgScore}]
//   emptyReason: 可选，课程下一个作业池都没有时的空态文案
// }
export function getCompleteBoard(query) {
  return request({
    url: '/aigc/exam/homework/completeBoard',
    method: 'get',
    params: {...query, classIds: (query.classIds || []).join(',')}
  })
}

// 名单下钻（§4.2）：一行一个「学生 × 这份卷」，没做过本卷的人也出行
// 用 paperId 而不是 examId：一张卷一场考试本来就 1:1，而 0 完成的卷也能列名单
// query: {paperId, classIds:[id...]}
// resp.data: {rows:[{userId,userName,classId,className,finished,bestScore,bestAttemptNo,bestExamId,finishedTime}], totalStudents}
export function getCompleteRoster(query) {
  return request({
    url: '/aigc/exam/homework/completeRoster',
    method: 'get',
    params: {...query, classIds: (query.classIds || []).join(',')}
  })
}

// ================================================================ 课程级统一配置（§4.13）
//
// “每人可做次数”从章节级提为课程级：全课设一次、一次写入拉平本课所有作业组（与 §4.12 默认老师同构）。
// 值仍存组行，学生端逐条读组行的判据一行不改就能生效；本次走“零 DDL”，不新增列/表。

// 取本课当前的统一可做次数（存量不等时取最大）；无组时 data 为 null
export function getCourseMaxAttempt(courseId) {
  return request({
    url: '/aigc/exam/homework/course/maxAttempt',
    method: 'get',
    params: {courseId}
  })
}

// 设置全课统一的可做次数：一次同步所有章节作业。
// 下调低于任一学生已占用轮次时服务端拒（提示改用重置某轮）；本课一个组都没有时也拒
export function updateCourseMaxAttempt(courseId, maxAttempt) {
  return request({
    url: '/aigc/exam/homework/course/maxAttempt',
    method: 'put',
    data: {courseId, maxAttempt}
  })
}

// ================================================================ 课程级章节状态点（§4.23）

// 本课各章节作业的发布状态，一个请求拿全（作业管理页左栏）
// resp.data: [{chapterId, status}]  status: 0未发布 1已发布 2已关闭
// ⚠ 纯读：没布置过的章节不在返回里（前端当“未发布”显示），不像逐章 ensureHomeworkChapter
//    那样顺手建组——组仍在老师真正打开那章抽屉时由 /homework/chapter 惰性建
export function getCourseChapterStatus(courseId) {
  return request({
    url: '/aigc/exam/homework/course/chapterStatus',
    method: 'get',
    params: {courseId}
  })
}

// ================================================================ 学生侧：完成清单（§3）

// 我的完成清单：只包成绩已生效的卷子，一行一份卷（不传 courseId/chapterId 就是全量，
// 前端自己按课程筛——量很小，不值得为它多一次往返）
// 意图与 /myStatus、/draw 同例：按登录人查自己的数据，不加权限键
// resp.data: {list:[{courseId,courseName,chapterId,chapterName,paperId,examTitle,examId,
//                    bestScore,bestAttemptNo,finishedTime,lastScore}]}
export function getMyCompleteList(query) {
  return request({
    url: '/aigc/exam/homework/myCompleteList',
    method: 'get',
    params: query
  })
}
