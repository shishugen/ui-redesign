<template>
  <div class="paper-manager">
    <div class="paper-main">
      <!-- 标题 -->
      <div class="paper-header">
        <!-- 左侧 -->
        <div class="title-left">
          <a-button type="primary" @click="handleAdd()">
            <template #icon>
              <PlusOutlined/>
            </template>
            {{ t('新增考试') }}
          </a-button>
          <a-button type="primary" danger :disabled="ids.length === 0" @click="handleBatchDelete">
            <template #icon>
              <DeleteOutlined/>
            </template>
            {{ t('批量删除') }}
          </a-button>
        </div>
        <!-- 右侧 -->
        <div class="title-right">
          <a-form :model="queryParams" ref="queryRef" layout="inline">
            <a-form-item>
              <a-input
                  v-model:value="queryParams.examTitle"
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

      <!-- 内容 -->
      <div class="paper-content" :style="{height:tableHeight+'px'}">
        <!-- 表格区域 -->
        <a-table
            :loading="loading"
            :columns="columns"
            :data-source="paperList"
            :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
            row-key="examId" :scroll="{ y: tableHeight * 0.9 }"
            table-layout="fixed"
            :pagination="false"
            class="data-table"
        >
          <template #bodyCell="{ column, record }">

            <template v-if="column.key === 'paper'">
              <a-button type="primary" ghost size="small" class="paper-name-btn" :title="t('点击预览：') + getPaperName(record)" @click="handlePreview(record)">
                {{ getPaperName(record) }}
              </a-button>
              <!-- <a-tag v-if="record.examSource == 1" color="purple">AI</a-tag> -->
            </template>
            <template v-if="column.key === 'examTime'">
              <div>{{ record.beginTime }}</div>
              <div>{{ record.endTime }}</div>
            </template>

            <template v-if="column.key === 'examTarget'">
              <div v-if="record.examTarget == 0">{{ t('公开考试') }}</div>
              <div v-if="record.examTarget == 1">{{ getClassesName(record.targetId) }}</div>
            </template>

            <template v-if="column.key === 'state'">
              <a-tag v-if="record.state == 0" color="warning">{{ t('未开始') }}</a-tag>
              <a-tag v-if="record.state == 1" color="processing">{{ t('考试中') }}</a-tag>
              <a-tag v-if="record.state == 2">{{ t('已结束') }}</a-tag>
            </template>
            <template v-if="column.key === 'grader'">
              {{ getGraderName(record.grader) }}
            </template>

            <template v-if="column.key === 'action'">
              <!-- 列宽由 table-layout:fixed 强制后按钮放不下，允许换行避免溢出裁切；
                   间距归 0：link 按钮自身有左右内边距，a-space 默认 8px 叠加上去视觉上太疏 -->
              <a-space wrap :size="0">
                <a-button type="link" @click="handleUpdate(record)" v-if="checkPermi(['exam:exam:edit'])"
                          :disabled="record.state == 2">
                  <template #icon>
                    <FormOutlined/>
                  </template>
                  {{ t('编辑') }}
                </a-button>
                <a-button type="link" danger @click="handleDelete(record)" v-if="checkPermi(['exam:exam:remove'])"
                          :disabled="record.state != 0">
                  <template #icon>
                    <DeleteOutlined/>
                  </template>
                  {{ t('删除') }}
                </a-button>
                <a-button type="link" danger @click="toEnd(record)" :disabled="record.state == 2">
                  {{ t('结束') }}
                </a-button>
                <a-button type="link" @click="toDetail(record)" :disabled="record.state == 0">
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
            @pagination="getList"
        />
      </div>
    </div>

    <!-- 编辑框 -->
    <a-modal :title="modalTitle" v-model:open="modalOpen" :width="modalWidth" :mask-closable="false">
      <exam-arrange-form ref="arrangeRef" :form="form" :disabled="form.state != 0"/>
      <template #footer>
        <a-space>
          <a-button type="primary" @click="submitForm()">{{ t('保 存') }}</a-button>
          <a-button danger @click="handleClose">{{ t('关 闭') }}</a-button>
        </a-space>
      </template>
    </a-modal>

    <!-- 考试详情 -->
    <a-drawer v-model:open="detailDeawer" :title="t('考试详情')" :width="dialogWidth" @close="cancelDetail">
      <exam-detail :exam-obj="detailExam" :classes-name="getClassesName(detailExam.targetId)"
                   v-if="detailDeawer"></exam-detail>
      <!-- 操作按钮 -->
      <template #extra>
        <a-space>
          <a-button danger @click="cancelDetail" size="small">
            <CloseOutlined/>
          </a-button>
        </a-space>
      </template>
    </a-drawer>


    <!-- 试卷预览（手工卷） -->
    <a-drawer
        :title="t('试卷预览')"
        :width="drawerWidth"
        :open="drawerPreview" @close="handleClosePreview">
      <paper-preview :paper-id="previewId" v-if="drawerPreview && previewId"/>
      <!-- 操作按钮 -->
      <template #extra>
        <a-space>
          <a-button danger size="small" @click="handleClosePreview">
            <template #icon>
              <CloseOutlined/>
            </template>
          </a-button>
        </a-space>
      </template>
    </a-drawer>

    <!-- 试卷预览（AI 卷） -->
    <a-drawer
        :title="t('AI试卷预览')"
        :width="drawerWidth"
        :open="aiDrawerPreview" @close="handleCloseAiPreview">
      <ai-paper-preview :paper-id="previewId" v-if="aiDrawerPreview && previewId"/>
      <template #extra>
        <a-space>
          <a-button danger size="small" @click="handleCloseAiPreview">
            <template #icon>
              <CloseOutlined/>
            </template>
          </a-button>
        </a-space>
      </template>
    </a-drawer>

  </div>
</template>

<script setup name="Container">
import {ref, reactive, toRefs} from 'vue'
import {listExam, addExam, updateExam, delExam, endExam} from '@/api/exam/exam.js'
import {findListPaper} from '@/api/exam/paper.js'
import {listAiPaperOptions} from '@/api/exam/aiExam.js'
import {listAllTeachers} from '@/api/system/clazz/teacherStudent'
import {listClasses} from '@/api/system/clazz/teacherStudent.js'
import ExamDetail from './detail/index.vue'
import ExamArrangeForm from '../components/ExamArrangeForm.vue'
import AiPaperPreview from '../components/AiPaperPreview.vue'
import PaperPreview from '@/views/manager/exam/paperManager/preview.vue'
import {getNickName, getUserId, isAdmin} from '@/utils/user'
import {message, Modal} from 'ant-design-vue'
import {checkPermi} from '@/utils/permission'
import {t} from '@/i18n'
import Pagination from '@/components/Pagination/index.vue'
import {
  SearchOutlined,
  SyncOutlined,
  DeleteOutlined,
  PlusOutlined,
  FormOutlined, CloseOutlined
} from '@ant-design/icons-vue'

//用户ID
const userId = ref(getUserId())
const userName = ref(getNickName())
const hasAdmin = ref(isAdmin())
const paperList = ref([])
const loading = ref(false)
const ids = ref([])
const total = ref(0)
const selectedRowKeys = ref([])
//编辑框
const modalOpen = ref(false)
const modalTitle = ref('')
const modalWidth = ref(document.documentElement.clientWidth * 0.5)
const tableHeight = ref(document.documentElement.clientHeight - 170)
const detailDeawer = ref(false)
const detailExam = ref({})
const dialogWidth = ref(document.documentElement.clientWidth * 0.95)
const data = reactive({
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    orderByColumn: 'create_time',
    isAsc: 'desc',
    examTitle: '',
    examType: 0,
    examTarget: undefined,
    searchState: undefined,
  },
  form: {},
})
const {queryParams, form} = toRefs(data)
//考试安排表单组件（与 AI 试卷页共用）
const arrangeRef = ref(null)
//表单列
const columns = [
  {title: t('标题'), dataIndex: 'examTitle', key: 'examTitle', align: 'center', width: 120},
  {title: t('试卷'), dataIndex: 'paper', key: 'paper', align: 'center', width: 240},
  {title: t('考试目标'), dataIndex: 'examTarget', key: 'examTarget', align: 'center', width: 100},
  {title: t('考试时间'), dataIndex: 'examTime', key: 'examTime', align: 'center', width: 180},
  {title: t('考试状态'), dataIndex: 'state', key: 'state', align: 'center', width: 100},
  {title: t('批阅员'), dataIndex: 'grader', key: 'grader', align: 'center', width: 120},
  {title: t('操作'), key: 'action', align: 'center', width: 240},
]
//试卷名映射（paperId -> 卷名，兼容手工卷与AI卷）
const paperNameMap = ref({})
//教师选项（列表回显批阅人）
const teacherOptions = ref([])
//班级选项
const classesOptions = ref([])

//预览
const drawerPreview = ref(false)
const aiDrawerPreview = ref(false)
const previewId = ref('')
const drawerWidth = ref(document.documentElement.clientWidth * 0.95)

//获取
const getPaperName = (record) => {
  return record.paperName || paperNameMap.value[record.paperId] || ''
}
//
const getGraderName = (grader) => {
  var name = ''
  teacherOptions.value.some(user => {
    if (user.value == grader) {
      name = user.label
    }
  })
  return name
}
//
const getClassesName = (classesId) => {
  var name = ''
  classesOptions.value.some(classes => {
    if (classes.value == classesId) {
      name = classes.label
    }
  })
  return name
}

// 多选框选中数据
const onSelectChange = (keys) => {
  selectedRowKeys.value = keys
  ids.value = keys
}

//查询
const handleQuery = () => {
  queryParams.value.pageNum = 1;
  getList();
}
//重置
const resetQuery = () => {
  queryParams.value.examTitle = ''
  handleQuery()
}

//重置form
const reset = () => {
  form.value = {
    examId: '',
    examTitle: '',
    examType: 0,
    state: 0,
    paperId: '',
    examTarget: 0,
    targetId: '',
    owner: userId.value,
    grader: '',
  }
}

/** 删除按钮操作 */
const handleDelete = (row) => {
  const _examIds = row.examId || ids.value;
  Modal.confirm({
    title: t('确认删除'),
    content: t('是否确认删除《{name}》的数据项？', { name: row.examTitle }),
    okText: t('确认'),
    cancelText: t('取消'),
    onOk: () => {
      delExam(_examIds).then(res => {
        getList();
        message.success(t('删除成功'));
      })
    }
  });
}

/** 批量删除按钮操作 */
const handleBatchDelete = () => {
  const _examIds = ids.value;
  Modal.confirm({
    title: t('确认删除'),
    content: t('是否确认删除所选的 {n} 个数据项？', { n: ids.value.length }),
    okText: t('确认'),
    cancelText: t('取消'),
    onOk: () => {
      delExam(_examIds).then(res => {
        getList();
        message.success(t('删除成功'));
        ids.value = []
        selectedRowKeys.value = []
      })
    }
  });
}

//预览（手工卷与 AI 卷分源预览）
const handlePreview = (row) => {
  previewId.value = row.paperId
  if (row.examSource == 1) {
    aiDrawerPreview.value = true
  } else {
    drawerPreview.value = true
  }
}
//关闭预览
const handleClosePreview = () => {
  drawerPreview.value = false
  previewId.value = ''
}
//关闭AI卷预览
const handleCloseAiPreview = () => {
  aiDrawerPreview.value = false
  previewId.value = ''
}

//查询试卷名（仅用于列表回显：手工卷 + AI 卷合到一张映射表）
const searchPaperList = () => {
  findListPaper({state: 1}).then(res => {
    (res.rows || []).forEach(item => {
      paperNameMap.value[item.paperId] = item.paperName
    })
  })
  listAiPaperOptions().then(res => {
    (res.data || []).forEach(item => {
      // AI 卷下拉 label 带分数后缀，列表只取卷名
      paperNameMap.value[item.value] = item.title || item.label
    })
  })
}

//查询班级
const searchClasseList = () => {
  listClasses().then((res) => {
    if (res.rows) {
      res.rows.forEach(item => {
        classesOptions.value.push({
          label: item.deptName,
          value: item.deptId.toString(),
        })
      })
    }
  })
}

//查询教师
const searchTeacherList = () => {
  listAllTeachers({}).then(res => {
    if (res.rows) {
      res.rows.forEach(item => {
        teacherOptions.value.push({
          label: item.nickName,
          value: item.userId.toString(),
        })
      })
    }
    if (hasAdmin.value) {
      teacherOptions.value.push({label: userName.value, value: userId.value.toString()})
    }
  })
}
//查询关联
const searchRelation = () => {
  searchPaperList()
  searchClasseList()
  searchTeacherList()
}

//新增
const handleAdd = () => {
  reset()  //重置表单
  modalTitle.value = t('新增考试安排')
  modalOpen.value = true;
}

/** 修改按钮操作（时间/时长回显由表单组件自行处理） */
const handleUpdate = (row) => {
  reset();
  form.value = row
  modalOpen.value = true;
  modalTitle.value = t('编辑考试安排')
}

//保存（字段校验、起止时间与时长联动均在 ExamArrangeForm 内）
const submitForm = () => {
  arrangeRef.value.validate().then(() => {
    if (form.value.examId) {
      updateExam(form.value).then(res => {
        message.success(t('保存成功'))
        getList()
        modalOpen.value = false
      })
    } else {

      addExam(form.value).then(res => {
        message.success(t('保存成功'))
        getList()
        modalOpen.value = false
      })
    }

  }).catch(() => {
    // 校验未通过，表单已自行提示
  })
}

//关闭编辑框
const handleClose = () => {
  reset();
  modalOpen.value = false
}

/** 查询容器列表 */
const getList = () => {
  loading.value = true
  listExam(queryParams.value).then((response) => {
    paperList.value = response.rows
    total.value = response.total
    loading.value = false
  })
}

//结束考试
const toEnd = (row) => {
  Modal.confirm({
    title: t('确认结束'),
    content: t('确认结束该考试吗？'),
    okText: t('确认'),
    cancelText: t('取消'),
    onOk: () => {
      endExam(row.examId).then(res => {
        getList();
        message.success(t('操作成功'));
      })
    }
  });
}
//详情
const toDetail = (row) => {
  detailExam.value = row
  detailDeawer.value = true
}
//关闭详情
const cancelDetail = () => {
  detailExam.value = {}
  detailDeawer.value = false
}
//查询倒计时
const searchTimer = ref(null)
//开始倒计时定时器
const startTimer = () => {
  searchTimer.value = setInterval(() => {
    getList()
  }, 30000)
}
//停止倒计时
const stopTimer = () => {
  if (searchTimer.value) {
    clearInterval(searchTimer.value)
  }
}
//初始化
onMounted(() => {
  getList()
  searchRelation()
})

onUnmounted(() => {
  stopTimer()
})

</script>

<style scoped lang="scss">
.paper-manager {
  height: 100%;
  padding: 5px;
  background-color: var(--bg);
  overflow: hidden;

  .paper-main {
    border-radius: 10px;
    background-color: var(--panel);
    padding: 10px;
    overflow: hidden;

    .paper-header {
      width: 100%;
      height: 40px;
      border-bottom: 0.1px solid var(--line);

      .title-left {
        width: 45%;
        float: left;
      }

      .title-right {
        width: 55%;
        float: right;

        .ant-form {
          float: right !important;
        }
      }

      button {
        margin: 0px 5px;
      }
    }

    .paper-content {
      padding: 5px;
    }

    .page-footer {
      position: absolute;
      bottom: 0px;
      width: 100%;
      padding-right: 10px;
      overflow-x: hidden;
      background: var(--line-3);
    }

  }


}

.data-table {
  :deep(th) {
    background-color: var(--bg-soft) !important;
  }

  /* 卷名过长时按钮的 nowrap 固有宽度会撑出单元格、盖住右边列（表格列的 min-width:auto 老坑）：
     限宽到单元格 100% 并省略号截断，完整卷名悬停看 title */
  .paper-name-btn {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 操作列 link 按钮自身左右内边距（默认每侧 ~15px）再压到 4px，按钮挨得更紧 */
  :deep(.ant-btn-link) {
    padding-inline: 4px;
  }
}

</style>
