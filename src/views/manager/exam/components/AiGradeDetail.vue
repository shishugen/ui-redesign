<template>
  <div class="paper-preview">
    <!-- 头部（与手工卷批阅页同构） -->
    <div class="paper-header">
      <div class="header-left">
        <div class="name" title="">{{ t('考试') }}：《{{ examForm.examTitle }}》</div>
        <div class="name" title="">{{ t('试卷') }}：《{{ paperForm.title }}》</div>
        <div class="total">{{ t('总分') }}：{{ paperForm.totalScore }} {{ t('分') }}</div>
        <div class="pass">{{ t('及格分') }}：{{ paperForm.passScore }} {{ t('分') }}</div>
        <div class="split">|</div>
        <div class="total">{{ t('考生') }}：{{ userName }}</div>
        <!-- 学生视角在老师确认批阅前拿不到分（后端不下发），这里给状态而不是一行空的「当前得分： 分」 -->
        <div class="total" v-if="!gradeHidden">{{ t('当前得分') }}：{{ gradeInfo.score }} {{ t('分') }}</div>
        <div class="total" v-else>{{ t('成绩复核中') }}</div>
        <div>
          <!-- 及格线缺失或分数被闸门藏起时都不做比较，否则 null 会被当成 0 一律显示及格/未及格 -->
          <a-tag color="success" v-if="hasPassLine && Number(gradeInfo.score) >= Number(paperForm.passScore)">{{ t('已及格') }}</a-tag>
          <a-tag color="red" v-else-if="hasPassLine">{{ t('未及格') }}</a-tag>
        </div>
      </div>

      <div class="header-right">
        <a-space>
          <!-- 预览态（学生查看成绩/老师看详情）与手工 preview 一致，用按钮表状态 -->
          <template v-if="readonly">
            <a-button type="primary" style="background: var(--warn)" v-if="unfinishedNumber > 0">{{ t('待批阅') }}</a-button>
            <a-button v-else-if="gradeInfo.confirmed">{{ t('已批阅') }}</a-button>
            <a-button v-else type="primary" style="background: var(--warn)">{{ t('待确认批阅') }}</a-button>
          </template>
          <!-- 批阅态：逐题保存即时生效，但整卷要再点一次「确认批阅」收口，成绩才对学生可见（与手工卷 review 同构） -->
          <template v-else>
            <!-- AI批阅：整卷送判，只处理未判过的简答题；已有建议的题不重复送模型，重判走单题按钮 -->
            <!-- 头部是深色底（.paper-header），这里不能用 ghost：透底蓝字压在深灰上对比度不够，看着就是一片糊 -->
            <a-tooltip placement="bottom" :title="aiTipText">
              <a-button type="primary" :loading="aiPreviewing" :disabled="!aiPendingCount"
                        @click="runAiPreview">
                {{ t('AI批阅') }}<span v-if="aiPendingCount">{{ t('（{n}题）', { n: aiPendingCount }) }}</span>
              </a-button>
            </a-tooltip>
            <span class="tips" v-if="unfinishedNumber > 0">{{ unfinishedNumber }}{{ t('题待批阅') }}</span>
            <!-- 确认后又被动过（改分或取消）：留一个痕迹标签，不让老师以为自己一直在收口位上 -->
            <a-tag color="orange" v-if="submitted && gradeInfo.reverted">{{ t('已确认后改动') }}</a-tag>
            <template v-if="submitted">
              <a-tooltip placement="bottom" :title="confirmTip" v-if="!gradeInfo.confirmed">
                <a-button type="primary" :disabled="!canConfirmNow"
                          :loading="gradeActing" @click="confirmPaper">
                  {{ gradeInfo.confirmTime ? t('重新确认批阅') : t('确认批阅') }}
                </a-button>
              </a-tooltip>
              <template v-else>
                <a-button style="background: var(--ok)">{{ t('已确认批阅') }}</a-button>
                <a-popconfirm placement="bottom" :title="t('取消后该生成绩将重新隐藏，确认取消？')" @confirm="undoConfirm">
                  <a-button type="link" :loading="gradeActing">{{ t('取消确认') }}</a-button>
                </a-popconfirm>
              </template>
            </template>
          </template>
        </a-space>
      </div>
    </div>

    <!-- 主体 -->
    <div class="preview-main" :style="{height: mainHeightSize+'px'}">
      <!-- 左侧 -->
      <div class="main-left">
        <!-- 题型列表 -->
        <a-collapse v-model:activeKey="activeKey" :bordered="false">
          <a-collapse-panel v-for="config in questionGroups"
                            :key="config.questionType"
                            :style="{display: config.details.length > 0?'block':'none'}">
            <template #header>
              <div>
                {{ getQuestionTypeName(config.questionType) }}
                {{ config.details.length }}{{ t('题') }}
                （ {{ t('共') }}{{ config.score * config.details.length }} {{ t('分') }} ）
              </div>
            </template>
            <div>
              <a v-for="detail in config.details" href="javascript:void(0)"
                 @click.stop="scrollTo(detail.questionId)">
                <a-button :style="{background: getColor(detail)}" class="question-btn">
                  {{ detail.sort }}
                </a-button>
              </a>
            </div>
          </a-collapse-panel>
        </a-collapse>
      </div>

      <!-- 右侧 -->
      <div class="main-right" ref="mainRightPanel" @scroll="handleRightScroll">
        <a-spin :spinning="detailLoading">
          <div class="question-list" v-for="config in questionGroups"
               :style="{display: config.details.length > 0?'block':'none'}">
            <!-- 题型 -->
            <div class="question-title">{{ getQuestionTypeName(config.questionType) }}</div>
            <!-- 题目 -->
            <div class="question-box" v-for="detail in config.details" :id="detail.questionId">
              <!-- 序号 -->
              <div class="question-sort">{{ detail.sort }} 、</div>
              <!-- 分值 -->
              <div class="question-score">（{{ detail.score }} {{ t('分') }} ）</div>
              <!-- 内容（AI 生成纯文本，插值渲染免转义） -->
              <p class="question-content">{{ detail.content }}</p>
              <!-- 选项：AI 题的选项存在 options 字段、不在题干里，必须展示否则无法判断作答 -->
              <div class="option-list" v-if="optionList(detail).length">
                <div v-for="(opt, oi) in optionList(detail)" :key="oi"
                     :class="['option-item', { correct: correctKeys(detail).includes(letterOf(oi)) }]">
                  {{ letterOf(oi) }}. {{ opt }}
                  <span class="opt-mark" v-if="correctKeys(detail).includes(letterOf(oi))">✓</span>
                </div>
              </div>

              <!-- ******************考生作答************************** -->
              <div class="answer-box">
                <span class="user-label">{{ t('考生作答') }}：</span>
                <!-- 填空：逐空标色。对错是后端判分处算好下发的（blankResults），跟得分是同一份实现，这里只负责画 -->
                <span class="fill-blanks" v-if="fillBlanks(detail).length">
                  <span v-for="b in fillBlanks(detail)" :key="b.no" :class="['fill-blank', b.hit ? 'fill-right' : 'fill-wrong']">
                    {{ fillBlankLabel(b) }}<span class="fill-mark">{{ b.hit ? '✓' : '✗' }}</span>
                  </span>
                </span>
                <span v-else :class="detail.userAnswer?'user-answer':'no-answer'">
                  {{ userAnswerText(detail) || t('未作答') }}
                </span>
                <!-- 对错图标：已判分的题才给（待批阅题分数还没定，画叉会误导） -->
                <span class="answer-icon" v-if="detail.state == 2">
                  <!-- 半对不画绿勾也不画红叉：红叉会让人以为一个空都没对，可明明拿了一半的分 -->
                  <a-tag color="warning" v-if="isPartialFill(detail)">{{ partialFillLabel(detail) }}</a-tag>
                  <CheckOutlined style="color: var(--ok);font-size: 18px;" v-else-if="Number(detail.score) == Number(detail.userScore)"/>
                  <CloseOutlined style="color: var(--danger);font-size: 18px;" v-else/>
                </span>
              </div>

              <!-- ******************参考答案************************** -->
              <div class="answer-box">
                <span class="question-label">{{ t('参考答案') }}：</span>
                <span class="question-answer">{{ referenceText(detail) }}</span>
              </div>
              <!-- ******************答案解析************************** -->
              <div class="answer-box" v-if="detail.analysis">
                <span class="question-label">{{ t('答案解析') }}：</span>
                <span class="question-analysis">{{ detail.analysis }}</span>
              </div>

              <!-- ******************AI 处理状态提示************************** -->
              <!-- 只教师批改视角可见（后端仅对 gradeDetail 下发 aiSuggestion*）。已有建议分时整条不显示：
                   分数与理由已预填在下方得分/评价框里，不再重复一遍；这里只留失败、未作答、尚未判分三种状态 -->
              <div class="answer-box" v-if="showAiBox(detail)">
                <template v-if="detail.confirmState == 3">
                  <span class="ai-failed">{{ t('AI判分失败') }}：</span>
                  <a-tooltip placement="right" :title="detail.aiSuggestionComment || t('判分服务未返回原因')">
                    <span class="ai-reason">{{ t('原因') }}</span>
                  </a-tooltip>
                  <span class="ai-tip">{{ t('（可点下方「AI批阅」重试或人工评分）') }}</span>
                </template>
                <span class="ai-none" v-else-if="!detail.userAnswer">{{ t('该生未作答，AI 不判分') }}</span>
                <span class="ai-none" v-else>{{ t('AI 尚未给出建议') }}</span>
              </div>

              <!-- ******************批阅************************** -->
              <div class="answer-box" v-if="detail.answerId && markForm[detail.answerId] && !readonly
                                            && (detail.state == 1 || markForm[detail.answerId].editing)">
                <a-form class="answer-form">
                  <a-form-item :label="t('本题得分')">
                    <a-input-number v-model:value="markForm[detail.answerId].score"
                                    :min="0" :max="Number(detail.score) || 100" addon-after="分"/>
                  </a-form-item>
                  <a-form-item :label="t('本题评价')">
                    <a-textarea v-model:value="markForm[detail.answerId].comment" :rows="4"
                                :placeholder="t('请输入评价内容')" :maxlength="500"/>
                  </a-form-item>
                  <a-form-item>
                    <div class="form-btn">
                      <!-- 未批完：AI 只把得分与理由填进上面两个框，不动库，老师点「批阅」才生效 -->
                      <a-button v-if="canDraftAi(detail)" type="primary" ghost
                                :loading="aiAction[detail.answerId] === 'draft'"
                                :disabled="markForm[detail.answerId].saving" @click="draftByAi(detail)">{{ t('AI批阅') }}</a-button>
                      <!-- 已批完（展开重新批阅后）：AI 重判并直接覆盖生效分与评语，旧分不留历史所以要二次确认 -->
                      <a-popconfirm v-if="canOverwriteAi(detail)" placement="top"
                                    :title="t('用 AI 的新结果覆盖本题？当前得分 {score} 分与评语都会被替换', { score: detail.userScore })"
                                    :ok-text="t('覆盖')" :cancel-text="t('取消')" @confirm="overwriteByAi(detail)">
                        <a-button type="primary" ghost
                                  :loading="aiAction[detail.answerId] === 'overwrite'"
                                  :disabled="markForm[detail.answerId].saving">{{ t('AI更新') }}</a-button>
                      </a-popconfirm>
                      <a-button type="primary" style="background: var(--ok)"
                                :loading="markForm[detail.answerId].saving" @click="submitMark(detail)">{{ t('批阅') }}</a-button>
                      <a-button v-if="detail.state == 2" @click="cancelMark(detail)"
                                :disabled="markForm[detail.answerId].saving">{{ t('取消') }}</a-button>
                    </div>
                  </a-form-item>
                </a-form>
              </div>
              <!-- 预览状态 -->
              <div class="answer-box" v-else-if="detail.state == 2 && (detail.userScore != null || detail.comment) && showScorePreview(detail)">
                <a-form class="answer-form">
                  <a-form-item :label="t('本题得分')">
                    {{ detail.userScore }} （{{ t('分') }}）
                  </a-form-item>
                  <a-form-item :label="t('本题评价')" v-show="detail.comment">
                    <div>{{ detail.comment }}</div>
                  </a-form-item>
                  <a-form-item v-if="!readonly && detail.answerId">
                    <a-button type="primary" ghost size="small" @click="reopenMark(detail)">{{ t('重新批阅') }}</a-button>
                  </a-form-item>
                </a-form>
              </div>
            </div>
          </div>
          <a-empty v-if="!detailLoading && !details.length" :description="t('暂无作答明细')" style="margin-top: 40px"/>
        </a-spin>

        <!-- 回到顶部 -->
        <a-back-top @click="toRightTop" :title="t('回到顶部')" v-if="rightScrollTop > 0"></a-back-top>
      </div>
    </div>
  </div>
</template>

<script setup name="AiGradeDetail">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { getAiExamInfo, getAiGradeDetail, markAiAnswer, getMyAiPaper, previewAiGrade, overwriteAiGrade, draftAiGrade,
  confirmAiPaperGrade, undoAiPaperGrade } from '@/api/exam/aiExam'
import { message } from 'ant-design-vue'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { getDicts } from '@/api/system/dict/data.js'
import { t } from '@/i18n'

const TYPE_NAMES = { 1: '单选题', 2: '多选题', 3: '判断题', 4: '填空题', 5: '简答题' }

const props = defineProps({
  // AI 考试id（aigc_exam.exam_id，exam_source=1）
  examId: { type: [String, Number], required: true },
  // 考生id（老师视角必传；self 模式下由后端按当前登录人取，可不传）
  userId: { type: [String, Number], default: '' },
  // 考生姓名仅用于头部展示，明细接口不返回，由列表行传入
  userName: { type: String, default: '' },
  // 只读：只展示明细不给评分入口（对应“详情”，与手工卷的预览/批阅区分一致）
  readonly: { type: Boolean, default: false },
  // 看当前登录学生自己的成绩：走只读的 /myPaper（无批阅权限要求），一次拿到考试+试卷+成绩+明细
  self: { type: Boolean, default: false },
  // 只看自己某一轮（仅 self 模式有意义）：不传时服务端兜成「已交卷里最高分那轮」，
  // 所以考试侧与各作业看板的调用点一行都没改、行为也没变。
  // 加它只为了作业答题页交完卷就地看答案：刚交的是第二轮时不该给人看第一轮（§4.8）
  attemptNo: { type: [String, Number], default: undefined }
})
const emit = defineEmits(['marked'])

//题型字典（替代旧 proxy.useDict('sys_question_type')）
const typeDict = ref([])

const detailLoading = ref(false)
const submitted = ref(false)
const details = ref([])
const markForm = reactive({})   // answerId -> {score, comment, saving, editing}
const aiAction = reactive({})   // answerId -> 'confirm' | 'retry'，AI 建议条上两个动作的 loading 标记
const aiPreviewing = ref(false) // 头部「AI批阅」整卷送判的 loading
const examForm = ref({ examId: '', examTitle: '' })
const paperForm = ref({ paperId: '', title: '', totalScore: 0, passScore: 0 })
const gradeInfo = reactive({
  score: 0, fullScore: null, passScore: null, pendingCount: 0,
  // 整卷批阅流程：后端两个取数入口都回传，前端不再自己拿 pendingCount 推口径
  confirmed: false, confirmTime: null, reverted: false,
})

//窗口参数
const mainHeightSize = ref(0)      //主体高度
const mainRightPanel = ref(null)   //右侧内容对象
const rightScrollTop = ref(0)      //右侧滚动位置
const activeKey = ref([])          //左侧题型选择

const letterOf = (index) => String.fromCharCode(65 + index)

// 学生视角且整卷未确认：后端不下发任何分数，头部也不能再摆“当前得分/及格与否”
const gradeHidden = computed(() => props.self && !gradeInfo.confirmed)

const hasPassLine = computed(() => !gradeHidden.value
  && paperForm.value.passScore != null && paperForm.value.passScore !== '')

//按题型分组（顺序与手工卷一致：单选→多选→判断→填空→简答）
const questionGroups = computed(() => {
  const groupOrder = ['1', '2', '3', '4', '5']
  return groupOrder.map(type => {
    const rows = details.value.filter(d => String(d.questionType) === type)
    return {
      questionType: type,
      details: rows,
      score: rows.length ? Number(rows[0].score) || 0 : 0,
    }
  }).filter(config => config.details.length > 0)
})

//待批阅题数（头部提示与左侧题号颜色共用）
const unfinishedNumber = computed(() => details.value.filter(d => d.state == 1).length)

// 待 AI 处理的简答题：已交卷未判（state=1）+ AI 还没给过建议（confirmState=0）+ 确实写了作答
// 不统计“已有建议”的题，避免重复送模型白烧 token（这类题要重判用评分表单里的「AI批阅」）
const aiPendingCount = computed(() => details.value.filter(d =>
  String(d.questionType) === '5' && d.state == 1 && Number(d.confirmState || 0) === 0 && !!d.userAnswer).length)

const aiTipText = computed(() => aiPendingCount.value
  ? t('把本卷尚未处理的简答题送 AI 出建议分；建议分只预填到得分框，核对后点「批阅」才计入成绩，已批阅的题不受影响')
  : t('本卷没有待 AI 处理的简答题（都已批阅，或建议分已预填到得分框等你点「批阅」）'))

// 单题 AI 条只在“需要老师知道为什么没有 AI 分”时出现：教师视角 + 简答题 + 未批完 + 还没有建议分
// （已有建议分就整条收起，分数已预填在得分框里；state=2 后 AI 分已是生效分，更不需要这条）
const showAiBox = (detail) => !props.readonly && String(detail.questionType) === '5' && detail.state == 1
  && detail.aiSuggestionScore == null

// 单题的 AI 入口已收敛到评分表单（draftByAi 填框 / overwriteByAi 覆盖），这里不再在建议条上放按钮

// 未批完的简答题：表单里的「AI批阅」只填框不写库（已批完的走「AI更新」，两个入口互斥）
const canDraftAi = (detail) => detail.state == 1 && String(detail.questionType) === '5'

// AI 更新入口只在「重新批阅」展开后出现（state=2 的题只有 editing 才会渲染这块表单），避免在只读预览里误点覆盖已生效的分
const canOverwriteAi = (detail) => detail.state == 2
  && String(detail.questionType) === '5'
  && !!(markForm[detail.answerId] && markForm[detail.answerId].editing)

// 本题可用分：已生效的 userScore 优先，其次是待确认的 AI 建议分（仅用于预填评分框，不代表成绩生效）
const scoreOf = (detail) => detail.userScore != null ? detail.userScore
    : (detail.aiSuggestionScore != null ? detail.aiSuggestionScore : null)

//根据作答状态/得分取左侧题号底色
const getColor = (detail) => {
  if (!detail.userAnswer) return 'var(--panel)'
  if (detail.state == 1) return detail.aiSuggestionScore != null ? 'var(--pri-200)' : 'var(--warn)'   //待批阅：蓝=AI已给建议待确认，黄=等人工
  if (Number(detail.score) == Number(detail.userScore)) return 'var(--ok)'
  return 'var(--danger)'
}

//根据题型获取名称（优先字典，取不到回落到内置名称）
const getQuestionTypeName = (type) => {
  let name = ''
  if (typeDict.value) {
    typeDict.value.some(item => {
      if (item.value == type) {
        name = item.label
        return true
      }
    })
  }
  return t(name || TYPE_NAMES[String(type)] || '')
}

const parseList = (value) => {
  if (value == null || value === '') return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)]
  } catch (e) {
    return [String(value)]
  }
}

//选项列表（AI 题存 options JSON 数组串）
const optionList = (detail) => parseList(detail.options)
  .map(opt => String(opt).replace(/^\s*[A-Za-z][.、)]\s*/, ''))

//参考答案的字母键
const correctKeys = (detail) => {
  if (String(detail.questionType) === '4') return []
  return parseList(detail.answer).map(v => String(v).trim().charAt(0).toUpperCase())
}

//判断答案的字母键 -> 文字
const judgeText = (key) => {
  const k = String(key || '').trim().toUpperCase()
  return k === 'A' ? t('正确') : k === 'B' ? t('错误') : k
}

// 预览态是否单列“本题得分/本题评价”：简答题与填空题列得分，其余客观题靠 ✓/✗ 图标；
// 填空题是 2026-10-01 用户追加（「要有对应的分数，跟简答题一样，有一个本题得分」）：它虽然自动判分，
// 但逐空给分会出现 2.5 这种半对分数，光看每个空的对错图标跟「答对 1/2 空」算不出本题到底拿了几分，
// 必须把本题得分直接显出来；老师手写过的评语（自动判分不会写 comment）必须露出来，否则评价会被藏掉；批阅态全部展示（要能重新批阅）
const showScorePreview = (detail) => {
  const type = String(detail.questionType)
  if (!props.readonly || type === '5' || type === '4') return true
  return !!detail.comment
}

const userAnswerText = (detail) => {
  const type = String(detail.questionType)
  if (type === '3') return judgeText(detail.userAnswer)
  if (type === '4') {
    const blanks = parseList(detail.userAnswer)
    return blanks.length ? blanks.map((v, i) => t('第 {n} 空：{v}', { n: i + 1, v })).join('；') : ''
  }
  return detail.userAnswer || ''
}

const referenceText = (detail) => {
  const type = String(detail.questionType)
  const list = parseList(detail.answer)
  if (type === '3') return list.map(judgeText).join('；')
  if (type === '4') return list.map((v, i) => t('第 {n} 空：{v}', { n: i + 1, v })).join('；')
  // 简答题参考答案按「一个要点一项」存储，逐行展示才好读（单选/多选仍是答案键，保持原样）
  if (type === '5') return list.join('\n')
  return list.join('；')
}

/*** 填空逐空明细：对错一律用后端下发的 blankResults（它跟算分用的是同一个 matchFillBlank），
 * 不在这边自己比一遍：两套实现迟早做出“分数 2.5、界面每个空却显示全对”的矛盾 */
const fillBlanks = (detail) => {
  if (String(detail.questionType) !== '4') return []
  const hits = detail.blankResults || []
  if (!hits.length) return []
  const answers = parseList(detail.userAnswer)
  return hits.map((hit, i) => ({
    no: i + 1,
    text: answers[i] == null || String(answers[i]).trim() === '' ? t('未填') : String(answers[i]),
    hit: !!hit,
  }))
}

const fillHitCount = (detail) => fillBlanks(detail).filter(b => b.hit).length

// 半对：有对有错（全对/全错仍走原来那个勾与叉）
const isPartialFill = (detail) => {
  const total = fillBlanks(detail).length
  if (!total || Number(detail.state) !== 2) return false
  const hit = fillHitCount(detail)
  return hit > 0 && hit < total
}

// 填空逐空标签：带参 t() 抽到脚本里，避免模板表达式解析器在某些字符上误报
const fillBlankLabel = (b) => t('第 {n} 空：{text}', { n: b.no, text: b.text })
const partialFillLabel = (detail) =>
  t('答对 {a}/{b} 空', { a: fillHitCount(detail), b: fillBlanks(detail).length })

// 卷面分与待批阅数按当前明细重算（评分后头部要跟着变）
const recount = () => {
  // 只累加已判完成(state=2)的分：AI 建议分也落在 userScore 上，未经老师确认不得计卷面分（与后端同口径）
  const total = details.value
    .reduce((sum, d) => d.state == 2 ? sum + (Number(d.userScore) || 0) : sum, 0)
  gradeInfo.score = Math.round(total * 100) / 100
  gradeInfo.pendingCount = details.value.filter(d => d.state == 1).length
}

/* ---------- 整卷确认批阅（成绩对学生的可见闸门） ---------- */
const gradeActing = ref(false)

// 能不能收口：必须跟下面的 tooltip 用同一个本地量。
// 逐题保存只改本地 details（state 立即变 2）不会重拉明细，拿后端那次请求算出的快照做 disabled，
// 就会“批完最后一题按钮还灰着”（确认接口本身会再按库里的题粒度 state 校验一遍，不靠前端这个值守门）
const canConfirmNow = computed(() => submitted.value && unfinishedNumber.value === 0)

// 灰按钮要说清原因：还有待批题时不能只给一个点不动的按钮
const confirmTip = computed(() => unfinishedNumber.value > 0
  ? t('还有 {n} 题未批完，全部批完后才能确认', { n: unfinishedNumber.value })
  : t('确认后该生成绩才可见；之后再改本卷任意一题，会自动退回待确认'))

// 本地同步退回痕迹：后端在 mark/overwriteGrade 里会把已确认的整卷自动退回待确认，
// 不跟着改就要等一次重拉才能看到按钮换脸（两处改分成功回调里都要调）
const markReverted = () => {
  if (!gradeInfo.confirmed) return
  gradeInfo.confirmed = false
  gradeInfo.reverted = true
}

const confirmPaper = () => {
  gradeActing.value = true
  confirmAiPaperGrade({ examId: props.examId, userId: props.userId }).then(() => {
    message.success(t('已确认批阅，成绩对学生可见'))
    loadDetail()
    emit('marked')
  }).finally(() => {
    gradeActing.value = false
  })
}

const undoConfirm = () => {
  gradeActing.value = true
  undoAiPaperGrade({ examId: props.examId, userId: props.userId }).then(() => {
    message.success(t('已取消确认，成绩暂时对学生隐藏'))
    loadDetail()
    emit('marked')
  }).finally(() => {
    gradeActing.value = false
  })
}

// 题型字典加载：替代旧 proxy.useDict（@/utils/dict 在 ui-redesign 不存在，改用 getDicts）
const loadDicts = async () => {
  try {
    const res = await getDicts('sys_question_type')
    typeDict.value = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
  } catch (e) {
    typeDict.value = []
  }
}

const initExamInfo = () => {
  // self 模式下 examInfo 已由 myPaper 一并返回，不必再请一次
  if (props.self) return
  getAiExamInfo(props.examId).then(res => {
    const data = res.data || {}
    examForm.value = data.exam || examForm.value
    paperForm.value = data.paper || paperForm.value
  }).catch(() => {
    //考试信息取不到不影响批阅主体，兜住避免未捕获异常
  })
}

// 明细装配：两个取数入口（老师 gradeDetail / 学生 myPaper）回包结构一致，共用一套处理
const applyDetailData = (data) => {
  details.value = data.details || []
  submitted.value = details.value.some(d => d.state > 0)
  if (data.grade) {
    gradeInfo.score = data.grade.score
    // 试卷总分/及格线均取自试卷（原先误用题数充当满分，一并修正）
    gradeInfo.fullScore = data.grade.totalScore
    gradeInfo.passScore = data.grade.passScore
    gradeInfo.pendingCount = data.grade.pendingCount
    // 整卷流程与确认痕迹：gradeDetail/myPaper 两个入口同构回传，未回时按未确认处理
    gradeInfo.confirmed = !!data.grade.confirmed
    gradeInfo.confirmTime = data.grade.confirmTime || null
    gradeInfo.reverted = !!data.grade.reverted
    if (data.grade.totalScore != null) paperForm.value.totalScore = data.grade.totalScore
    if (data.grade.passScore != null) paperForm.value.passScore = data.grade.passScore
  }
  // 预初始化每题评分表单（保证响应式）
  Object.keys(markForm).forEach(k => delete markForm[k])
  details.value.forEach(d => {
    if (d.answerId) {
      markForm[d.answerId] = { score: scoreOf(d), comment: d.comment || d.aiSuggestionComment || '', saving: false, editing: false }
    }
  })
  if (!activeKey.value.length) {
    activeKey.value = questionGroups.value.map(config => config.questionType)
  }
}

const loadDetail = () => {
  if (props.self) {
    if (!props.examId) return
  } else if (!props.examId || !props.userId) {
    return
  }
  detailLoading.value = true
  // attemptNo 为 undefined 时 axios 会省掉这个参数，服务端按默认轮次兜住（与考试侧旧行为一致）
  const request = props.self ? getMyAiPaper(props.examId, props.attemptNo) : getAiGradeDetail(props.examId, props.userId)
  request.then(res => {
    const data = res.data || {}
    if (props.self) {
      examForm.value = data.exam || examForm.value
      paperForm.value = data.paper || paperForm.value
    }
    applyDetailData(data)
  }).catch(() => {
    //接口异常已由请求拦截器提示，这里兜住避免未捕获异常
    details.value = []
  }).finally(() => {
    detailLoading.value = false
  })
}

//重新批阅（与手工卷同位置的同名交互）
const reopenMark = (detail) => {
  const form = markForm[detail.answerId]
  if (!form) return
  form.score = scoreOf(detail)
  form.comment = detail.comment || detail.aiSuggestionComment || ''
  form.tempScore = scoreOf(detail)
  form.tempComment = detail.comment
  form.editing = true
}
//取消重新批阅，回到已批阅展示
const cancelMark = (detail) => {
  const form = markForm[detail.answerId]
  if (!form) return
  form.score = form.tempScore == null ? null : form.tempScore
  form.comment = form.tempComment || ''
  form.editing = false
}

const submitMark = (detail) => {
  const form = markForm[detail.answerId]
  if (!form) return
  if (form.score == null || form.score === '') {
    message.warning(t('请输入得分'))
    return
  }
  form.saving = true
  markAiAnswer({ answerId: detail.answerId, userScore: form.score, comment: form.comment || null })
    .then(() => {
      message.success(t('批阅完成'))
      detail.userScore = form.score
      detail.comment = form.comment
      detail.state = 2
      form.editing = false
      recount()
      markReverted()
      emit('marked', detail)
    })
    .finally(() => {
      form.saving = false
    })
}

// 全局响应拦截器只对业务码（500/601/403 等）弹提示，超时与网络异常是静默 reject（只进 console），
// 而 AI 判分是长耗时同步请求、最容易走这两个分支，所以必须自己补一句，否则按钮转圈结束、界面像没反应
const isSilentRequestError = (err) => !!(err && (err.code === 'ECONNABORTED'
  || err.code === 'ETIMEDOUT' || /timeout|Network Error/i.test(err.message || '')))

// AI 起草：只把得分与理由填进当前评分框，不写库、不动建议位；老师点「批阅」才走 mark 落库
const draftByAi = (detail) => {
  const form = markForm[detail.answerId]
  if (!form || aiAction[detail.answerId]) return
  aiAction[detail.answerId] = 'draft'
  draftAiGrade({ answerId: detail.answerId }).then(res => {
    const data = res.data || {}
    if (data.ok) {
      form.score = data.score
      form.comment = data.reason || ''
      message.success(t('AI 结果已填进评分框，点「批阅」才生效'))
    } else {
      message.warning(data.error || t('AI 未能给出评分，请人工填写'))
    }
  }).catch(err => {
    if (isSilentRequestError(err)) {
      message.error(t('AI 判分超时或连不上判分服务，本题未做任何改动，可稍后重试或人工评分'))
    }
  }).finally(() => {
    delete aiAction[detail.answerId]
  })
}

// AI 更新已批阅结果：后端重判后直接落库覆盖，成功就地把新分与新评语刷进明细、评分框与卷面分
const overwriteByAi = (detail) => {
  if (aiAction[detail.answerId]) return
  aiAction[detail.answerId] = 'overwrite'
  overwriteAiGrade({ answerId: detail.answerId }).then(res => {
    const data = res.data || {}
    const form = markForm[detail.answerId]
    if (data.ok) {
      detail.userScore = data.score
      detail.comment = data.reason
      if (form) {
        form.score = data.score
        form.comment = data.reason || ''
        form.tempScore = data.score
        form.tempComment = data.reason || ''
      }
      message.success(t('AI 已更新本题批阅结果（{score} 分）', { score: data.score }))
      recount()
      markReverted()
      emit('marked', detail)
    } else {
      message.warning(data.error || t('AI 未能给出评分，本题保持原批阅结果'))
    }
  }).catch(err => {
    if (isSilentRequestError(err)) {
      message.error(t('AI 更新超时或连不上判分服务，本题保持原批阅结果'))
    }
  }).finally(() => {
    delete aiAction[detail.answerId]
  })
}

// AI批阅（整卷预评）：走 /previewGrade 旁路接口，与定时任务同一捞取条件、同一回写口径；
// 完事重拉明细，让各题的「AI建议」条出现
const runAiPreview = () => {
  if (aiPreviewing.value || !aiPendingCount.value) return
  aiPreviewing.value = true
  previewAiGrade({ examId: props.examId, userId: props.userId }).then(res => {
    const stat = res.data || {}
    const applied = Number(stat.applied) || 0
    const failed = Number(stat.failed) || 0
    const discarded = Number(stat.discarded) || 0
    if (applied > 0) {
      let msg = t('AI 已给出 {n} 题建议分', { n: applied })
      if (failed) msg += t('，{n} 题判不了已转人工', { n: failed })
      if (discarded) msg += t('，{n} 题已被人工批阅抢先作废', { n: discarded })
      message.success(msg)
    } else if (failed > 0) {
      message.warning(t('AI 未能给出评分（{n} 题），请人工批阅', { n: failed }))
    } else {
      message.info(t('本卷没有需要 AI 处理的简答题'))
    }
  }).catch(err => {
    if (isSilentRequestError(err)) {
      message.error(t('AI 预评超时或连不上判分服务，可稍后重试或人工批阅'))
    }
  }).finally(() => {
    aiPreviewing.value = false
    // 无论成功、部分失败还是服务不可用，都重拉一次，避免页面停在旧状态
    loadDetail()
  })
}

//初始化窗口
const handleSize = () => {
  mainHeightSize.value = document.documentElement.clientHeight - 40
}
//跳转到
const scrollTo = (id) => {
  const el = document.getElementById(id)
  if (mainRightPanel && el) {
    const container = mainRightPanel.value
    const top = el.offsetTop - container.offsetTop
    container.scrollTo({top, behavior: 'smooth'})
  }
}
//右侧内容滚动触发
const handleRightScroll = () => {
  if (mainRightPanel) {
    rightScrollTop.value = parseInt(mainRightPanel.value.scrollTop)
  }
}
//右侧内容回到顶部
const toRightTop = () => {
  if (mainRightPanel) {
    mainRightPanel.value.scrollTop = 0
  }
}

onMounted(async () => {
  //题型字典先就位，避免首屏题型名空白
  await loadDicts()
  initExamInfo()
  loadDetail()
  handleSize()
  window.addEventListener('resize', handleSize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleSize)
})

//同一组件实例切换考生时重新拉取
watch(() => props.userId, () => {
  activeKey.value = []
  loadDetail()
})

defineExpose({ reload: loadDetail })
</script>

<style lang="scss" scoped>
.paper-preview {
  /* 手工页同构的深色头部是绝对定位，这里显式锚定到本组件，避开外层有额外操作栏时错位 */
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;

  .paper-header {
    width: 100%;
    height: 40px;
    margin: 0px;
    padding: 0px 10px;
    position: absolute;
    background-color: var(--ink);
    line-height: 40px;

    .header-left {
      width: 80%;
      height: 100%;
      float: left;
      color: white;
      display: flex;
      font-weight: 800;

      .name {
        min-width: 100px;
        max-width: 400px;
        padding: 0px 10px;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }

      .total {
        padding: 0px 10px;
        min-width: 100px;
      }

      .pass {
        padding: 0px 10px;
        min-width: 100px;
      }

      .split {
        padding: 0px 10px;
        min-width: 10px;
      }
    }

    .header-right {
      width: 20%;
      height: 100%;
      padding: 0px 10px;
      float: right;
      text-align: right;

      .ant-space {
        float: right;
      }

      .tips {
        margin: 0px 20px;
        float: right;
        width: 150px;
        color: var(--warn);
        font-size: 16px;
        font-weight: 800;
      }

      /* 深色底上的禁用态得自己给：antd 的禁用样式是「25% 黑字 + 4% 黑底 + 浅灰边框」，
         压在深色上等于隐形，而「AI批阅」恰恰在本卷无待判简答题时就是禁用态（最常见的那一种） */
      :deep(.ant-btn[disabled]) {
        color: rgba(255, 255, 255, 0.72);
        background: rgba(255, 255, 255, 0.16);
        border-color: rgba(255, 255, 255, 0.32);
        box-shadow: none;
        text-shadow: none;
        cursor: not-allowed;
      }
    }
  }

  .preview-main {
    margin-top: 40px;
    display: flex;

    .main-left {
      background-color: var(--canvas-2);
      float: left;
      width: 450px;
      height: 100%;
      overflow: auto;
      scroll-behavior: smooth;
      padding-bottom: 100px;

      .question-btn {
        margin: 5px;
      }
    }

    .main-right {
      float: right;
      padding: 0px 5px;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      scroll-behavior: smooth;
      padding-bottom: 180px;

      .question-list {
        padding: 10px 20px;

        .question-title {
          margin-bottom: 10px;
          width: 100%;
          padding: 10px;
          background-color: var(--canvas-2);
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
        }

        .question-box {
          margin-bottom: 20px;
          padding: 20px;
          background: var(--bg-soft);
          border-radius: 15px;

          .question-sort {
            float: left;
            font-size: 16px;
            font-weight: bold;
          }

          .question-score {
            float: right;
          }

          .question-content {
            white-space: pre-line;
          }

          /* 选项一行一个（AI 题选项不在题干里） */
          .option-list {
            margin: 6px 0;

            .option-item {
              padding: 2px 8px;
              border-radius: 6px;
              line-height: 1.7;

              &.correct {
                color: var(--ok);
                font-weight: bold;
              }

              .opt-mark {
                margin-left: 4px;
              }
            }
          }

          .answer-box {
            margin: 15px 5px;

            .answer-form {
              width: 65% !important;
            }

            .form-btn {
              margin-top: 5px;
              text-align: center;

              button {
                margin: 0px 10px;
              }
            }

            .user-label {
              color: var(--warn);
            }

            .ai-reason {
              color: var(--ink-4);
              border-bottom: 1px dashed var(--line-2);
              cursor: pointer;
              margin-right: 8px;
            }

            .ai-failed {
              color: var(--danger);
            }

            /* AI 还未给建议 / 未作答时的中性提示，不抢红色告警的语义 */
            .ai-none {
              color: var(--ink-4);
            }

            .ai-tip {
              color: var(--ink-4);
              font-size: 12px;
            }

            .answer-icon {
              margin-left: 10px;
            }

            .user-answer {
              font-size: 16px;
              /* 考生自己打的换行也要保留，否则多段作答会被压成一整段 */
              white-space: pre-line;
              overflow-wrap: anywhere;
            }

            /* 填空逐空：一空一行，对绿错红（跟选项的 correct / 叉同色） */
            .fill-blanks {
              display: inline-flex;
              flex-direction: column;
              vertical-align: middle;

              .fill-blank {
                font-size: 16px;
                overflow-wrap: anywhere;

                &.fill-right {
                  color: var(--ok);
                }

                &.fill-wrong {
                  color: var(--danger);
                }

                .fill-mark {
                  margin-left: 4px;
                }
              }
            }

            .no-answer {
              color: var(--ink-4);
            }

            .question-label {
              color: var(--ok);
            }

            .question-answer {
              font-size: 16px;
              /* 参考答案（数组拆行）与解析都可能带 \n */
              white-space: pre-line;
              overflow-wrap: anywhere;
            }

            .question-analysis {
              color: var(--ink-4);
              white-space: pre-line;
              overflow-wrap: anywhere;
            }
          }
        }
      }
    }
  }
}

:deep(.ant-float-btn) {
  display: block !important;
  position: absolute;
  right: 10px;
  bottom: 20px !important;
}

:deep(.ant-form-item) {
  margin-bottom: 5px !important;
}
</style>
