<template>
  <div class="paper-preview">
    <!-- 头部 -->
    <div class="paper-header">
      <div class="header-left">
        <div class="name" title="">{{ t('考试') }}：《{{ examForm.examTitle }}》</div>
        <div class="name" title="">{{ t('试卷') }}：《{{ paperForm.paperName }}》</div>
        <div class="total">{{ t('总分') }}：{{ paperForm.totalScore }} {{ t('分') }}</div>
        <div class="pass">{{ t('及格分') }}：{{ paperForm.passScore }} {{ t('分') }}</div>
        <div class="split">|</div>
        <div class="total">{{ t('考生') }}：{{ userName }}</div>
        <div class="total">{{ t('当前得分') }}：{{ gradeForm.score }} {{ t('分') }}</div>
        <div>
          <a-tag color="success" v-if="gradeForm.score >= paperForm.passScore">{{ t('已及格') }}</a-tag>
          <a-tag color="red" v-else>{{ t('未及格') }}</a-tag>
        </div>

      </div>

      <div class="header-right">
        <a-space>
          <a-button type="primary" style="background: var(--warn)" v-if="gradeForm.state == 1">{{ t('待批阅') }}</a-button>
          <a-button  v-if="gradeForm.state == 2">{{ t('已批阅') }}</a-button>
        </a-space>
      </div>
    </div>
    <!-- 主体 -->
    <div class="preview-main" :style="{height: mainHeightSize+'px'}">
      <!-- 左侧 -->
      <div class="main-left">
        <!-- 题型列表 -->
        <a-collapse v-model:activeKey="activeKey" :bordered="false">
          <a-collapse-panel v-for="config in paperConfigList"
                            :key="config.questionType"
                            :style="{display: config.gradeDetailList.length > 0?'block':'none'}">
            <template #header>
              <div>
                {{ getQuestionTypeName(config.questionType) }}
                {{ config.gradeDetailList.length }}{{ t('题') }}
                （ {{ t('共') }}{{ config.totalScore }}{{ t('分') }} ）
              </div>

            </template>
            <div>
              <a v-for="question in config.gradeDetailList" href="javascript:void(0)"
                 @click.stop="scrollTo(question.questionId)">
                <a-button :style="{background: getColor(question)}" class="question-btn">
                  {{ question.sort }}
                </a-button>
              </a>
            </div>
          </a-collapse-panel>
        </a-collapse>

      </div>

      <!-- 右侧 -->
      <div class="main-right" ref="mainRightPanel" @scroll="handleRightScroll">
        <div class="question-list" v-for="config in paperConfigList"
             :style="{display: config.gradeDetailList.length > 0?'block':'none'}">
          <!-- 题型 -->
          <div class="question-title">{{ getQuestionTypeName(config.questionType) }}</div>
          <!-- 题目 -->
          <div class="question-box" v-for="detail in config.gradeDetailList" :id="detail.questionId">
            <!-- 序号 -->
            <div class="question-sort">{{ detail.sort }} 、</div>
            <!-- 分值 -->
            <div class="question-score">（{{ detail.questionScore }} {{ t('分') }}）</div>
            <!-- 内容 -->
            <p class="question-content" v-html="detail.content"></p>

            <!-- ******************作答************************** -->
            <div class="answer-box">
              <span class="user-label">{{ t('考生作答') }}：</span>
              <span :class="detail.userAnswer?'user-answer':'no-answer'">
                {{ detail.userAnswer || t('未作答') }}
              </span>
              <!-- 图标 -->
              <span class="answer-icon" v-if="detail.questionType < 5">
                <CheckOutlined style="color: var(--ok);font-size: 18px;" v-if="detail.questionScore === detail.userScore"/>
                <CloseOutlined style="color: var(--danger);font-size: 18px;" v-else/>
              </span>

              <span class="answer-icon" v-if="detail.questionType >= 5 && !detail.userAnswer">
                <CloseOutlined style="color: var(--danger);font-size: 18px;"/>
              </span>
            </div>

            <!-- ******************参考答案************************** -->
            <div class="answer-box">
              <span class="question-label">{{ t('参考答案') }}：</span>
              <span class="question-answer">{{ decodeToString(detail.answer) }}</span>
            </div>
            <!-- ******************答案解析************************** -->
            <div class="answer-box" v-if="detail.analysis">
              <span class="question-label">{{ t('答案解析') }}：</span>
              <span class="question-analysis">{{ decodeToString(detail.analysis) }}</span>
            </div>
            <!-- ******************批阅************************** -->
            <div class="answer-box" v-if="detail.questionType >= 5">
              <a-form class="answer-form">
              <a-form-item :label="t('本题得分')">
                {{ detail.userScore }} （{{ t('分') }}）
              </a-form-item>
              <a-form-item :label="t('本题评价')" v-show="detail.comment">
                <div>
                  {{ detail.comment }}
                </div>
              </a-form-item>
              </a-form>
            </div>

          </div>
        </div>

        <!-- 回到顶部 -->
        <a-back-top @click="toRightTop" :title="t('回到顶部')" v-if="rightScrollTop > 0"></a-back-top>
      </div>
    </div>

  </div>
</template>

<script setup name="paperView">
import { ref, onMounted, onUnmounted } from 'vue'
import { getExam } from '@/api/exam/exam.js'
import { getPaper } from '@/api/exam/paper.js'
import { getPaperConfigList } from '@/api/exam/paperConfig.js'
import { getGrade } from '@/api/exam/examGrade.js'
import { decodeToString } from '@/utils/aigc.js'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { getDicts } from '@/api/system/dict/data.js'
import { Modal } from 'ant-design-vue'
import { t } from '@/i18n'

// Props
const props = defineProps({
  // 成绩id
  gradeId: {
    type: String,
    default: ""
  },
  //用户名称
  userName: {
    type: String,
    default: ""
  },
})
//窗口参数
const mainHeightSize = ref(0)//主体高度
//右侧内容对象
const mainRightPanel = ref(null)
//滚动右侧头部
const rightScrollTop = ref(null)
//左侧题型选择
const activeKey = ref([]);
//题型字典
const typeDict = ref([])
//考试安排对象
const examForm = ref({
  examId: '',
  examTitle: '',
  examType: 0,
  paperId: '',
  examTarget: 0,
  targetId: '',
})
//试卷对象
const paperForm = ref({
  paperId: '',
  paperName: '',
  type: 0,
  totalScore: 0,
  passScore: 0,
  state: 0,
  sort: 0,
})
//成绩对象
const gradeForm = ref({
  gradeId: '',
  examId: '',
  timing: '',
  configList: [],//配置信息列表
})

//明细
const paperConfigList = ref([])


//根据得分获取颜色
const getColor = (question) => {
  let color = 'var(--panel)'
  if (question.userAnswer) {
    if (question.questionScore === question.userScore) {
      color = 'var(--ok)'
    } else if (question.questionType >= 5) {
      if (question.userScore === 0) {
        color = 'var(--warn)'
      } else {
        color = 'var(--ok)'
      }
    } else {
      color = 'var(--danger)'
    }
  }
  return color
}

//加载题型字典
const loadDicts = async () => {
  try {
    const res = await getDicts('sys_question_type')
    typeDict.value = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
  } catch (e) {
    typeDict.value = []
  }
}

//根据题型获取名称
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
  return name;
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

//初始化考试
const initExam = () => {
  getExam(gradeForm.value.examId).then(res => {
    if (res.data) {
      examForm.value = res.data
      if (examForm.value.examId) {
        initPaper()
      }
    } else {
      Modal.warning({ title: t('提示'), content: t('考试不存在！') });
    }
  })
}

//初始化数据
const initPaper = () => {
  if (examForm.value.paperId) {
    getPaper(examForm.value.paperId).then(res => {
      if (res.data) {
        paperForm.value = res.data
        if (paperForm.value.paperId) {
          //查询试题明细
          initGradeDetail()
        }
      }
    }).catch(() => {

    })
  }
}

//初始化成绩
const initGrade = () => {
  getGrade(props.gradeId).then(res => {
    gradeForm.value = res.data
    if (gradeForm.value.gradeId) {
      //初始化明细
      initExam()
    }
  })
}
//查询试题明细
const initGradeDetail = () => {
  paperConfigList.value = []
  getPaperConfigList(paperForm.value.paperId, gradeForm.value.gradeId, true).then(res => {
    paperConfigList.value = res.rows
    calculateConfigScore()
  })
}
//计算每类题总分
const calculateConfigScore = () => {
  paperConfigList.value.forEach(config =>{
    config.totalScore = 0;
    if(config.gradeDetailList){
      config.gradeDetailList.forEach(detail => {
        config.totalScore += detail.questionScore
      })
    }
  })
}
//初始化
onMounted(async () => {
  //题型字典
  await loadDicts()
  //初始化考试成绩
  initGrade()
  //初始化窗口
  handleSize()
  window.addEventListener('resize', handleSize)
  //
  if (typeDict.value) {
    typeDict.value.some(item => {
      activeKey.value.push(item.value)
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleSize)
})

</script>
<style lang="scss" scoped>
.paper-preview {
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

            .answer-icon {
              margin-left: 10px;
            }

            .user-answer {
              font-size: 16px;
            }


            .no-answer {
              color: var(--ink-4);
            }

            .question-label {
              color: var(--ok);
            }

            .question-answer {
              font-size: 16px;
              /* 手工题库的参考答案里本来就存了真换行（形如“答案：\n①…”），不写这条会被压成一整段 */
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

.submit-tips {
  text-align: center;

  .tips-a {
    color: var(--danger);

    i {
      font-size: 18px;
    }
  }

  .tips-b {
    color: var(--pri);
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
