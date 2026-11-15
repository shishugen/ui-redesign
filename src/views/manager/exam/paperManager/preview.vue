<template>
  <div class="paper-preview">
    <!-- 头部 -->
    <div class="paper-header">
      <div class="header-left">
        <div class="name" title="">{{ t('试卷') }}：《{{ paperForm.paperName }}》</div>
        <div class="total">{{ t('总分') }}：{{ paperForm.totalScore }} {{ t('分') }}</div>
        <div class="pass">{{ t('及格分') }}：{{ paperForm.passScore }} {{ t('分') }}</div>
      </div>

      <div class="header-right">
        <a-space>
<!--          <a-button type="primary">{{ t('操作') }}</a-button>-->
        </a-space>
      </div>
    </div>
    <!-- 主体 -->
    <div class="preview-main" :style="{height: mainHeightSize+'px'}">
      <!-- 左侧 -->
      <div class="main-left">
        <!-- 题型列表 -->
        <a-collapse v-model:activeKey="activeKey" :bordered="false">
          <a-collapse-panel v-for="config in paperForm.configList"
                            :key="config.questionType"
                            :style="{display: config.questionList.length > 0?'block':'none'}">
            <template #header>
              <div>
                {{ getQuestionTypeName(config.questionType) }}
                {{ config.questionList.length }}{{ t('题') }}
                （ {{ t('共') }}{{ config.totalScore }}{{ t('分') }} ）
              </div>

            </template>
            <div>
              <a v-for="question in config.questionList" href="javascript:void(0)" @click.stop="scrollTo(question.questionId)">
                <a-button class="question-btn">{{ question.sort }}</a-button>
              </a>
            </div>
          </a-collapse-panel>
        </a-collapse>

      </div>

      <!-- 右侧 -->
      <div class="main-right" ref="mainRightPanel" @scroll="handleRightScroll">
        <div class="question-list" v-for="config in paperForm.configList"
             :style="{display: config.questionList.length > 0?'block':'none'}">

          <div class="question-title">{{ getQuestionTypeName(config.questionType) }}</div>
          <div class="question-box" v-for="question in config.questionList" :id="question.questionId">
            <div class="question-sort">{{ question.sort }} 、</div>
            <div class="question-score">（{{ question.score }} {{ t('分') }}）</div>
            <p class="question-content" v-html="question.content"></p>
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
import { getPaperById } from '@/api/exam/paper.js'
import { getDicts } from '@/api/system/dict/data.js'
import { t } from '@/i18n'

const props = defineProps({
  paperId: {
    type: String,
    required: true
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

//试卷对象
const paperForm = ref({
  paperId: '',
  paperName: '',
  type: 0,
  totalScore: 0,
  passScore: 0,
  state: 0,
  sort: 0,
  configList: [],//配置信息列表
})

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

//加载题型字典
const loadDicts = async () => {
  try {
    const res = await getDicts('sys_question_type')
    typeDict.value = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
  } catch (e) {
    typeDict.value = []
  }
}

//初始化窗口
const handleSize = () => {
  mainHeightSize.value = document.documentElement.clientHeight - 40
}

//跳转到
const scrollTo = (id) =>{
  const el = document.getElementById(id)
  if (mainRightPanel && el) {
    const container = mainRightPanel.value
    const top = el.offsetTop - container.offsetTop
    container.scrollTo({top,behavior: 'smooth'})
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


//初始化数据
const initPaper = () => {
  if (props.paperId) {
    getPaperById(props.paperId).then(res => {
      if (res.data) {
        paperForm.value = res.data
        if (typeDict.value) {
          typeDict.value.some(item => {
            activeKey.value.push(item.value)
          })
        }
        calculateScore()
      }
    }).catch(() => {

    })
  }
}
//计算总分
const calculateScore = () => {
  paperForm.value.configList.forEach(config => {
    config.totalScore = 0
    if (config.questionList) {
      config.questionList.forEach(question => {
        config.totalScore += question.score
      })
    }
  })
}

//初始化
onMounted(async () => {
  //题型字典
  await loadDicts()
  //获取试卷
  initPaper()
  //初始化窗口
  handleSize()
  window.addEventListener('resize', handleSize)
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
      width: 60%;
      height: 100%;
      float: left;
      color: white;
      display: flex;

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
    }

    .header-right {
      width: 40%;
      height: 100%;
      padding: 0px 10px;
      float: right;
      text-align: right;
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
          width: 100%;
          padding: 10px;
          background-color: var(--canvas-2);
          border-radius: 10px;
          font-size: 16px;
          font-weight: bold;
        }

        .question-box {
          padding: 20px;

          .question-sort {
            float: left;
            font-size: 14px;
            font-weight: bold;
          }

          .question-score {
            float: right;
          }

          .question-content {
            white-space: pre-line;
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

</style>
