<template>
  <div class="app-container">
    <a-card :bordered="false" class="main-card">
      <div>
        <a-form layout="inline">
          <a-form-item :label="t('考试标题')">
            {{examObj.examTitle}}
          </a-form-item>
          <a-form-item :label="t('试卷')">
            {{examObj.paperName || '-'}}
            <a-tag v-if="examObj.examSource == 1" color="purple" style="margin-left: 6px">{{ t('AI卷') }}</a-tag>
          </a-form-item>
          <a-form-item :label="t('考试时间')">
            {{examObj.beginTime}} ~~ {{examObj.endTime}}
          </a-form-item>
          <a-form-item :label="t('考试目标')">
            <div v-if="examObj.examTarget == 0">{{ t('公开考试') }}</div>
            <div v-if="examObj.examTarget == 1">{{classesName}}</div>
          </a-form-item>
          <a-form-item :label="t('考试人数')">
            {{total}}
          </a-form-item>
          <a-form-item :label="t('考试状态')">
            <a-tag v-if="examObj.state == 0" color="warning">{{ t('未开始') }}</a-tag>
            <a-tag v-if="examObj.state == 1" color="processing">{{ t('考试中') }}</a-tag>
            <a-tag v-if="examObj.state == 2">{{ t('已结束') }}</a-tag>
          </a-form-item>
        </a-form>
      </div>


      <!-- 手工卷成绩在 aigc_exam_grade，AI 卷成绩在 aigc_ai_exam_answer，
           下面统一按同一套列/操作展示，数据源在 getList 里按 examSource 分流 -->
      <div class="toolbar-wrapper">
        <div class="toolbar-left">
          <!-- AI 卷独有：把勾选的“题已批完、只差收口”的人确认掉，不用一人点一次；
               必须勾选才能点：不勾就默认收全场的话，误点一下几十人的成绩就一次性对学生可见了；
               每份真正能不能确认由服务端按同一口径现算，按钮上那个数字只是给老师的预期 -->
          <template v-if="isAiExam">
            <!-- v-if 必须坐在 a-popconfirm 本身：放在里层按钮上会使下面的 v-else 找不到相邻的 v-if -->
            <a-popconfirm placement="bottomLeft"
                          :title="batchConfirmTip"
                          @confirm="handleConfirmAll" v-if="batchTargets.length">
              <a-button type="primary" ghost :loading="batchConfirming">
                <template #icon>
                  <CheckOutlined/>
                </template>
                {{ t('批量确认批阅（{n}）', { n: batchTargets.length }) }}
              </a-button>
            </a-popconfirm>
            <!-- 灰按钮得说清为何灰：是“还没勾”还是“本场根本没人待确认”，两者处置完全不同 -->
            <a-tooltip v-else :title="batchDisabledTip">
              <a-button type="primary" ghost disabled>
                <template #icon>
                  <CheckOutlined/>
                </template>
                {{ t('批量确认批阅') }}
              </a-button>
            </a-tooltip>
          </template>
        </div>

        <div class="toolbar-right">
          <a-form :model="queryParams" ref="queryRef" layout="inline">
            <a-form-item>
              <a-input
                  v-model:value="queryParams.userName"
                  :placeholder="t('请输入关键字')"
                  allow-clear
              />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" @click="handleQuery">
                <template #icon>
                  <SearchOutlined/>
                </template>
                {{ t('搜索') }}
              </a-button>
              <a-button @click="resetQuery" style="margin-left: 8px">
                <template #icon>
                  <SyncOutlined/>
                </template>
                {{ t('重置') }}
              </a-button>
            </a-form-item>
          </a-form>
        </div>
      </div>

      <!-- 表格区域 -->
      <div class="paper-content" :style="{height:tableHeight+'px'}">
      <a-table
          :loading="loading"
          :columns="columns"
          :data-source="gradeList"
          row-key="gradeId"
          :pagination="false"
          :row-selection="isAiExam ? aiRowSelection : undefined"
          class="data-table" :scroll="{ y: tableHeight * 0.9 }"
      >
        <template #bodyCell="{ column, record }">

          <template v-if="column.key === 'state'">
            <div v-if="record.state == 0">
              <a-tag>{{ t('未提交') }}</a-tag>
            </div>
            <div v-if="record.state == 1">
              <a-tag color="warning" v-if="!awaitConfirmRow(record)">{{ t('待批阅') }}</a-tag>
              <!-- AI 卷独有的一步：题全批完还要老师点「确认批阅」收口，成绩才对学生可见（判据与操作列那个按钮同一个函数） -->
              <a-tag color="warning" v-else>{{ record.confirmTime ? t('待重新确认') : t('待确认批阅') }}</a-tag>
            </div>
            <div v-if="record.state == 2">
              <!-- 及格线缺失时不能走分数比较，否则 null 会被当成 0 一律显示已及格 -->
              <a-tag color="green" v-if="record.passScore != null && record.score >= record.passScore">{{ t('已及格') }}</a-tag>
              <a-tag color="red" v-else-if="record.passScore != null">{{ t('未及格') }}</a-tag>
              <a-tag color="green" v-else>{{ t('已完成') }}</a-tag>
            </div>

          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="handleReview(record)" :disabled="record.state != 1">
                <template #icon>
                  <FormOutlined/>
                </template>
                {{ t('批阅') }}
              </a-button>
              <!-- 题已批完只差收口的行，直接列表里确认，省得一人开一次抽屉；能确认的条件与上面那个标签完全一致 -->
              <a-popconfirm v-if="awaitConfirmRow(record)"
                            placement="bottom"
                            :title="record.confirmTime
                              ? t('重新确认后该生成绩重新可见，确认？')
                              : t('确认后该生成绩才对学生可见，确认？')"
                            @confirm="handleConfirmPaper(record)">
                <a-button type="link" :loading="confirmingId === record.gradeId">
                  <template #icon>
                    <CheckOutlined/>
                  </template>
                  {{ record.confirmTime ? t('重新确认') : t('确认批阅') }}
                </a-button>
              </a-popconfirm>
              <a-button type="link" @click="handlePreview(record)">
                <template #icon>
                  <ReadOutlined />
                </template>
                {{ t('详情') }}
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      </div>
      <div class="page-footer">
        <pagination
            :total="total"
            v-model:page="queryParams.pageNum"
            v-model:limit="queryParams.pageSize"
            @pagination="handlePage"
        />
      </div>
    </a-card>

    <!-- 试卷批阅 -->
    <a-drawer v-model:open="reviewDeawer" :title="viewFlag == 0 ? t('试卷批阅') : t('作答详情')" :width="reviewWidth"  @close="cancelReview">
      <!-- AI 卷：逐题明细 + 主观题评分（与 AI 试卷管理页共用同一组件） -->
      <AiGradeDetail
          :exam-id="examObj.examId"
          :user-id="currGrade.userId"
          :user-name="currGrade.userName"
          :readonly="viewFlag == 1"
          v-if="reviewDeawer && isAiExam" />
      <!-- 手工卷 预览批阅 -->
      <grade-review :grade-id="currGrade.gradeId"
                    :user-name="currGrade.userName"
                    v-if="reviewDeawer && !isAiExam && viewFlag == 0" />
      <!-- 手工卷 预览详情 -->
      <grade-preview :grade-id="currGrade.gradeId"
                    :user-name="currGrade.userName"
                    v-if="reviewDeawer && !isAiExam && viewFlag == 1" />
      <!-- 操作按钮 -->
      <template #extra>
        <a-space>
          <a-button danger @click="cancelReview" size="small">
            <CloseOutlined/>
          </a-button>
        </a-space>
      </template>
    </a-drawer>

  </div>
</template>

<script setup name="Container">
import {ref, reactive, toRefs, computed, onMounted, watch} from 'vue'
import {listGradePlus} from '@/api/exam/examGrade.js'
import {listAiGrade, confirmAiPaperGrade, confirmAllAiPaperGrade} from '@/api/exam/aiExam.js'
import {message} from 'ant-design-vue'
import {t} from '@/i18n'
import GradeReview from './review/index.vue'
import GradePreview from './preview/index.vue'
import AiGradeDetail from '../../components/AiGradeDetail.vue'
import {
  CloseOutlined,
  FormOutlined,
  SearchOutlined,
  SyncOutlined,
  ReadOutlined,
  CheckOutlined,
} from '@ant-design/icons-vue'

// Props
const props = defineProps({
  // 考试对象
  examObj: {
    type: Object,
    default: () => ({
      examId: '',
      examTitle: '',
      examType: 0,
      state: 0,
      paperId: '',
      paperName: '',
      examSource: 0,
      examTarget: 0,
    })
  },
  //班级名称
  classesName: {
    type: String,
    default:''
  }
})

const gradeList = ref([])
const loading = ref(false)
const total = ref(0)
const selectedRowKeys = ref([])
const tableHeight = ref(document.documentElement.clientHeight - 260)

//
const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderByColumn: 'g.create_time',
    isAsc: 'desc',
    examId: undefined,
    timing: 0,
    userName: undefined,
  },
})
const {queryParams} = toRefs(data)
//表单列
const columns = [
  {title: t('考生姓名'), dataIndex: 'userName', key: 'userName', align: 'center', width: 260},
  {title: t('考生成绩'), dataIndex: 'score', key: 'score', align: 'center', width: 160},
  {title: t('成绩状态'), dataIndex: 'state', key: 'state', align: 'center', width: 160},
  {title: t('提交时间'), dataIndex: 'submitTime', key: 'submitTime', align: 'center', width: 180},
  {title: t('操作'), key: 'action', align: 'center', width: 250}
]
//批阅
const reviewDeawer = ref(false)
const viewFlag = ref(0)
const currGrade = ref({})
const reviewWidth = ref(document.documentElement.clientWidth * 0.95)

//是否 AI 试卷考试（成绩存在 AI 独立表，要走另一套接口）
const isAiExam = computed(() => String(props.examObj?.examSource) === '1')
//AI 成绩接口一次返回全量，搜索与分页在前端做
const aiAllRows = ref([])

/*** AI 成绩行 -> 本页列结构（state 口径对齐手工成绩表：0未提交/1待批阅/2已批阅） */
const mapAiRow = (row) => {
  const submitted = Number(row.submitted) === 1
  const pendingCount = Number(row.pendingCount) || 0
  return {
    //AI 侧无 gradeId，用考生id 作行唯一键
    gradeId: row.userId,
    userId: row.userId,
    userName: row.userName,
    score: row.totalScore,
    passScore: row.passScore,
    submitTime: row.submitTime,
    // 已交但未收口（gradeState!=2）一律算待批阅：下面的列与「批阅」按钮都靠 state，手工卷那套口径直接复用
    state: !submitted ? 0 : (pendingCount > 0 || Number(row.gradeState) !== 2 ? 1 : 2),
    pendingCount: pendingCount,
    // 确认痕迹非空且当前未确认：曾确认后又被改分/取消，列上提标“待重新确认”
    confirmTime: row.confirmTime,
    answeredCount: row.answeredCount,
    questionCount: row.questionCount,
  }
}

/** 按关键字+分页加 AI 行 */
const applyAiRows = () => {
  const kw = String(queryParams.value.userName || '').trim()
  const rows = kw
    ? aiAllRows.value.filter(r => String(r.userName || '').indexOf(kw) > -1 || String(r.userId).indexOf(kw) > -1)
    : aiAllRows.value
  total.value = rows.length
  const start = (queryParams.value.pageNum - 1) * queryParams.value.pageSize
  gradeList.value = rows.slice(start, start + queryParams.value.pageSize)
}

/** 拉 AI 成绩列表 */
const getAiList = () => {
  loading.value = true
  listAiGrade(props.examObj.examId).then(res => {
    aiAllRows.value = (res.data || []).map(mapAiRow)
    applyAiRows()
    // 重拉后把已经不可确认的勾选项清掉（刚被收口的、被别人改分退回的）
    pruneSelection()
  }).catch(() => {
    //接口异常已由请求拦截器提示，这里兜住避免未捕获异常
    aiAllRows.value = []
    gradeList.value = []
    total.value = 0
  }).finally(() => {
    loading.value = false
  })
}

//查询
const handleQuery = () => {
  queryParams.value.pageNum = 1
  if (isAiExam.value) {
    //已拉过全量则直接重过滤，不重复请求
    if (aiAllRows.value.length) {
      applyAiRows()
    } else {
      getAiList()
    }
    return
  }
  getList();
}
//重置
const resetQuery = () => {
  queryParams.value.userName = undefined
  handleQuery()
}


//批阅
const handleReview = (row) =>{
  currGrade.value = row
  viewFlag.value = 0
  reviewDeawer.value = true
}
//查看详情
const handlePreview = (row) =>{
  currGrade.value = row
  viewFlag.value = 1
  reviewDeawer.value = true
}

/*** 该行是否「题已批完、只差整卷确认」：状态列的标签与操作列的确认按钮共用这一个判据，
 * 免得两处各算一套口径，出现“列上写着待确认批阅、行内却没有确认按钮”
 * 待批题数用“不大于0”而不是“===0”：跟改写前的模板表达式逐位等价（字段缺失时 NaN>0 为假，仍归入可确认） */
const awaitConfirmRow = (row) => isAiExam.value
  && Number(row.state) === 1
  && !(Number(row.pendingCount) > 0)

// 当前正在确认的行（用行主键做标，AI 行的主键就是 userId）：只给那一行转圈，不锁全表
const confirmingId = ref('')

/*** 可批量确认的行：跟行内那个按钮用同一个判据（awaitConfirmRow），
 * 且算的是全量 aiAllRows 而不是当页：不然会出现“按钮写 3 人、服务端却收了 12 人” */
const awaitConfirmRows = computed(() => aiAllRows.value.filter(awaitConfirmRow))

/*** 多选框：只给 AI 卷挂（手工卷没有任何批量动作），且只有“题已批完待确认”的行可选——
 * 勾一堆未交卷/还有题待批的人，只会让接口挨个把他们计成跳过，白勾 */
const aiRowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => { selectedRowKeys.value = keys },
  getCheckboxProps: (row) => ({ disabled: !awaitConfirmRow(row) }),
}))

/*** 本次要确认的目标：只认已勾选的（一个没勾就没有对象，按钮随之置灰）；
 * 不是直接拿 selectedRowKeys 当名单：与 awaitConfirmRows 取交集，陈旧的勾选项（已确认/已退回）不递给后端 */
const batchTargets = computed(() => {
  if (!selectedRowKeys.value.length) return []
  const picked = new Set(selectedRowKeys.value.map(String))
  return awaitConfirmRows.value.filter(row => picked.has(String(row.gradeId)))
})

// 二次确认里把“到底收谁”说白
const batchConfirmTip = computed(() => t('将确认所选 {n} 名考生的成绩并对他们可见，确认？', { n: batchTargets.value.length }))

// 置灰原因分两种，说错了比不说更糟：有可确认的人→提示去勾选；一个都没有→告诉他本场就没活的
const batchDisabledTip = computed(() => awaitConfirmRows.value.length
  ? t('先在左侧勾选要确认的考生（未勾选不会确认任何人）')
  : t('本场没有“题已批完、等待确认批阅”的答卷'))

// 批量确认请求中：防连点（重复提交只会把已收口的人再走一遍跳过，但没必要发第二次）
const batchConfirming = ref(false)

/*** 重拉后清掉已经不可确认的勾选项：刚被收口的、被别的老师改分退回的人若留着，
 * 会让按钮上的数字与实际会收口的人数对不上 */
const pruneSelection = () => {
  if (!selectedRowKeys.value.length) return
  const alive = new Set(awaitConfirmRows.value.map(row => String(row.gradeId)))
  selectedRowKeys.value = selectedRowKeys.value.filter(key => alive.has(String(key)))
}

/** 批量收口：范围由勾选决定，但每份能不能确认仍由服务端按题粒度 state 现验 */
const handleConfirmAll = () => {
  const userIds = batchTargets.value.map(row => row.userId)
  if (!userIds.length) {
    // 走到这说明按钮该是灰的：兜一道防护，不递给后端一个空名单（服务端也必拒）
    message.info(t('请先勾选要确认批阅的答卷'))
    return
  }
  batchConfirming.value = true
  confirmAllAiPaperGrade({ examId: props.examObj.examId, userIds }).then(res => {
    const ret = res.data || {}
    const failed = ret.failed || []
    if (failed.length) {
      // 部分没成：把第一人的原因直接带到脸上，不只报个总数让老师猜
      message.warning(t('已确认 {a} 人，{b} 人未确认（{c}）', { a: ret.confirmed || 0, b: failed.length, c: failed[0] }))
    } else if (ret.confirmed) {
      message.success(t('已确认 {n} 人的成绩，学生端可见', { n: ret.confirmed }))
    } else {
      message.info(t('没有需要确认的答卷'))
    }
    // 本轮处过的人不再保留勾选态：收口的已确认，没成功的也得重新看一眼才能再勾
    selectedRowKeys.value = []
    getAiList()
  }).catch(() => {
    // 接口异常已由请求拦截器提示，这里兜住避免未捕获异常
  }).finally(() => {
    batchConfirming.value = false
  })
}

/** 列表行内直接确认整卷批阅：接口与提示跟批阅抽屉里的按钮同一口径，收口后成绩才对学生可见 */
const handleConfirmPaper = (row) => {
  confirmingId.value = row.gradeId
  confirmAiPaperGrade({ examId: props.examObj.examId, userId: row.userId }).then(() => {
    message.success(t('已确认批阅，成绩对学生可见'))
    // 重拉而不是本地改 state：确认时间、分数、状态全以后端为准，手改容易跟库里的口径走岔
    getAiList()
  }).catch(() => {
    // 接口拒绝（如并发下又多了待批题）已由请求拦截器提示，这里兜住避免未捕获异常
  }).finally(() => {
    confirmingId.value = ''
  })
}
//取消批阅
const cancelReview = () =>{
  reviewDeawer.value = false
  if(viewFlag.value == 0){
    getList()
  }
}


//翻页/改页容：AI 在前端切，手工回后端
const handlePage = () => {
  if (isAiExam.value) {
    applyAiRows()
    return
  }
  getList()
}

/** 查询列表 */
const getList = () => {
  if (isAiExam.value) {
    getAiList()
    return
  }
  loading.value = true
  queryParams.value.examId = props.examObj.examId
  listGradePlus(queryParams.value).then(res =>{
    gradeList.value = res.rows
    total.value = res.total
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

//初始化
onMounted(() => {
  getList()
})

//同一抽屉实例切换考试时重置并重拉
watch(() => props.examObj.examId, () => {
  aiAllRows.value = []
  queryParams.value.pageNum = 1
  queryParams.value.userName = undefined
  getList()
})

</script>

<style lang="scss" scoped>
.app-container {
  padding: 5px;
  background-color: var(--bg);
}

.main-card {
  border: none;
  background-color: var(--panel);
  border-radius: 12px;

  :deep(.ant-card-body) {
    padding: 20px;
  }
}

.toolbar-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;

  .ant-form {
    display: flex;
    gap: 10px;
  }

  .ant-form-item {
    margin-bottom: 0;
  }
}

.paper-content {
  padding: 5px;
}
.page-footer {
  width: 100%;
  padding-right: 10px;
  overflow: hidden;
  background: var(--line-3);
}

.data-table {
  :deep(th) {
    background-color: var(--bg-soft) !important;
  }
}

:deep(.ant-card-body) {
  padding: 10px !important;
}
:deep(.ant-table-cell){
  padding: 5px !important;
}
</style>
