<template>
  <a-form :model="form" :rules="rules" ref="formRef" :label-col="labelCol" :wrapper-col="wrapperCol">
    <a-row>
      <a-col :span="24">
        <a-form-item :label="t('考试标题')" name="examTitle">
          <a-input
              v-model:value="form.examTitle"
              :placeholder="t('请输入考试标题')"
              allow-clear :disabled="disabled"
          />
        </a-form-item>
      </a-col>
    </a-row>

    <a-row>
      <a-col :span="24">
        <a-form-item :label="t('试卷类型')" name="paperSource">
          <a-radio-group v-model:value="paperSource" :disabled="disabled || !!lockedPaperId"
                         @change="changePaperSource">
            <a-radio :value="0">{{ t('手工试卷') }}</a-radio>
            <a-radio :value="1">{{ t('AI试卷') }}</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-col>
    </a-row>

    <a-row>
      <a-col :span="24">
        <a-form-item :label="t('考试试卷')" name="paperId">
          <a-select :placeholder="t('请选择试卷')" :disabled="disabled || !!lockedPaperId"
                    v-model:value="form.paperId"
                    :options="currentPaperOptions" :filter-option="filterOption" allow-clear show-search/>
        </a-form-item>
      </a-col>
    </a-row>

    <a-row>
      <a-col :span="12">
        <a-form-item :label="t('安排目标')" name="examTarget">
          <a-radio-group v-model:value="form.examTarget" :disabled="disabled" @change="changeTarget">
            <a-radio :value="0">{{ t('公开考试') }}</a-radio>
            <a-radio :value="1">{{ t('班级考试') }}</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-col>
      <a-col :span="12">
        <a-form-item :label="t('考试班级')" name="targetId" v-if="form.examTarget == 1">
          <a-select v-model:value="form.targetId" :placeholder="t('请选择班级')" style="width: 200px"
                    :disabled="disabled"
                    :options="classesOptions" :filter-option="filterOption" allow-clear show-search/>
        </a-form-item>
      </a-col>
    </a-row>

    <a-row>
      <a-col :span="24">
        <a-form-item :label="t('开考时间')">
          <a-date-picker style="float: left;width: 45%;"
                         v-model:value="chooseBeginTime" :disabled="disabled"
                         format="YYYY-MM-DD HH:mm" :disabled-date="disabledDate"
                         :show-time="{ defaultValue: dayjs('00:00', 'HH:mm') }"
                         :placeholder="t('请选择开始时间')"
                         @change="changeBeginTime"
          />
          <div style="float:left; width: 5%;margin: 0px 5px">~</div>
          <a-date-picker style="float: left;width: 45%"
                         v-model:value="chooseEndTime" :disabled="!chooseBeginTime"
                         format="YYYY-MM-DD HH:mm" :disabled-date="disabledDate"
                         :show-time="{ defaultValue: dayjs('00:00', 'HH:mm') }"
                         :placeholder="t('请选择结束时间')"
                         @change="changeEndTime"
          />
        </a-form-item>
      </a-col>
    </a-row>

    <a-row>
      <a-col :span="24">
        <a-form-item :label="t('考试时长')">
          <a-input-number v-model:value="durationDays" :min="0" :step="1" style="width: 130px;"
                          @change="changeDuration"
                          :disabled="disabled || !chooseBeginTime">
            <template #addonAfter>
              {{ t('(天)') }}
            </template>
          </a-input-number>
          <a-input-number v-model:value="durationHours" :min="0" :step="1" style="width: 130px;margin-left: 5px;"
                          @change="changeDuration"
                          :disabled="disabled || !chooseBeginTime">
            <template #addonAfter>
              {{ t('(时)') }}
            </template>
          </a-input-number>

          <a-input-number v-model:value="durationMinutes" :min="0" :step="1" style="width: 130px;margin-left: 5px;"
                          @change="changeDuration"
                          :disabled="disabled || !chooseBeginTime">
            <template #addonAfter>
              {{ t('(分)') }}
            </template>
          </a-input-number>
        </a-form-item>
      </a-col>
    </a-row>

    <a-row>
      <a-col :span="24">
        <a-form-item :label="t('批阅人员')">
          <a-select v-model:value="form.grader" :placeholder="t('请选择批阅人员')"
                    :options="teacherOptions" :filter-option="filterOption" allow-clear show-search/>
        </a-form-item>
      </a-col>
    </a-row>

    <a-row>
      <a-col :span="24"></a-col>
    </a-row>

  </a-form>
</template>

<script setup name="ExamArrangeForm">
/**
 * 考试安排表单（手工试卷与 AI 试卷共用）
 * 只负责收集字段与校验，保存动作由调用方完成（examManager 走 addExam/updateExam，AI 试卷页走 publishAiExam）
 */
import { ref, computed, watch } from 'vue'
import { findListPaper } from '@/api/exam/paper.js'
import { listAiPaperOptions } from '@/api/exam/aiExam.js'
import { listAllTeachers, listClasses } from '@/api/system/clazz/teacherStudent.js'
import { getNickName, getUserId, isAdmin } from '@/utils/user'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'

const props = defineProps({
  // 考试安排对象（表单直接读写其属性）
  form: { type: Object, required: true },
  // 已开考/已结束时禁改排期字段
  disabled: { type: Boolean, default: false },
  // 锁定试卷（AI 试卷页发布时传入，隐藏类型切换与选框）
  lockedPaperId: { type: String, default: '' },
  lockedPaperLabel: { type: String, default: '' },
})

const userId = ref(getUserId())
const userName = ref(getNickName())
const hasAdmin = ref(isAdmin())

const labelCol = { style: { width: '120px' } };
const wrapperCol = { span: 18 };
const formRef = ref(null)

const rules = {
  examTitle: [{ required: true, message: t('请输入标题'), trigger: 'blur' }],
  paperId: [{ required: true, message: t('请选择试卷'), trigger: 'change' }],
  targetId: [{ required: true, message: t('请选择班级'), trigger: 'change' }],
}

// 试卷类型：0手工试卷 1AI试卷（只切数据源，不落库；落库来源由后端按 paper_id 登记）
const paperSource = ref(0)
// 两种试卷的下拉数据源
const manualPaperOptions = ref([])
const aiPaperOptions = ref([])
const teacherOptions = ref([])
const classesOptions = ref([])

// 当前下拉项：锁定试卷时只给出这一张卷
const currentPaperOptions = computed(() => {
  if (props.lockedPaperId) {
    return [{ value: props.lockedPaperId, label: props.lockedPaperLabel || t('本试卷') }]
  }
  if (paperSource.value !== 1) {
    return manualPaperOptions.value
  }
  const options = aiPaperOptions.value
  // 下拉只下发“启用 + 本人”的卷，编辑一场原有考卷已被禁用（或不是自己的卷）的 AI 考试时，
  // 选项里没得它，拿考试行自带的 paperName 补一条置灰项，否则选卷框会直接显示成裸 paperId
  const currentId = props.form.paperId
  if (currentId && props.form.examSource == 1 && !options.some(item => item.value == currentId)) {
    return [{ value: currentId, label: `${props.form.paperName || t('原试卷')}（${t('已不可选')}）`, disabled: true }, ...options]
  }
  return options
})

// 过滤选项
const filterOption = (input, option) => {
  return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
}

// 切换试卷类型：清掉不属于当前数据源的已选试卷
const changePaperSource = () => {
  if (props.lockedPaperId) {
    return
  }
  const exists = currentPaperOptions.value.some(item => item.value == props.form.paperId)
  if (!exists) {
    props.form.paperId = ''
  }
}

// 触发目标改变
const changeTarget = () => {
  if (props.form.examTarget != 1) {
    props.form.targetId = ''
  }
}

//选取时间
const chooseBeginTime = ref(null)
const chooseEndTime = ref(null)
const durationDays = ref(0) //时长天
const durationHours = ref(0) //时长小时
const durationMinutes = ref(0) //时长分钟

//开始时间
const changeBeginTime = () => {
  if (chooseBeginTime.value) {
    props.form.beginTime = chooseBeginTime.value.format('YYYY-MM-DD HH:mm')
  } else {
    props.form.beginTime = ''
    chooseEndTime.value = ''
  }
  calculateDuration()
}
//结束
const changeEndTime = () => {
  if (chooseEndTime.value) {
    props.form.endTime = chooseEndTime.value.format('YYYY-MM-DD HH:mm')
  } else {
    props.form.endTime = ''
  }
  calculateDuration()
}
//禁用日期
const disabledDate = (current) => {
  return current && current < dayjs().startOf('day');
};

//计算时长
const calculateDuration = () => {
  if (props.form.beginTime && props.form.endTime) {
    var diff = parseInt(new Date(props.form.endTime).getTime() - new Date(props.form.beginTime).getTime())
    if (diff <= 0) {
      message.warning(t('结束时间需大于开始时间'))
      chooseEndTime.value = undefined
      props.form.endTime = ''
    } else {
      const diffAbs = Math.abs(diff);
      const days = Math.floor(diffAbs / 86400000);
      const hours = Math.floor((diffAbs % 86400000) / 3600000);
      const minutes = Math.floor((diffAbs % 3600000) / 60000);
      durationDays.value = days
      durationHours.value = hours
      durationMinutes.value = minutes
    }
  } else {
    durationDays.value = 0
    durationHours.value = 0
    durationMinutes.value = 0
  }
}

const format = ref('YYYY-MM-DD HH:mm')
//切换时长
const changeDuration = () => {
  if (props.form.beginTime) {
    var addMinuteVal = (durationDays.value * 24 * 60) + (durationHours.value * 60) + durationMinutes.value
    props.form.endTime = dayjs(props.form.beginTime).add(addMinuteVal, 'minutes').format(format.value)
    chooseEndTime.value = dayjs(props.form.endTime)
  }
}

// 外部传入 form（新增重置/编辑回填）后同步时间控件与试卷类型
watch(() => props.form, (val) => {
  const form = val || {}
  chooseBeginTime.value = form.beginTime ? dayjs(form.beginTime) : null
  chooseEndTime.value = form.endTime ? dayjs(form.endTime) : null
  paperSource.value = props.lockedPaperId ? 1 : (form.examSource == 1 ? 1 : 0)
  if (props.lockedPaperId) {
    form.paperId = props.lockedPaperId
  }
  calculateDuration()
}, { immediate: true })

//查询手工试卷
const searchManualPapers = () => {
  findListPaper({ state: 1 }).then(res => {
    manualPaperOptions.value = (res.rows || []).map(item => ({
      label: item.paperName,
      value: item.paperId,
    }))
  })
}
//查询AI试卷：后端只下发启用且属于当前用户（管理员为全部）的卷，禁用的不显示也不可选
//已排好的考试若原卷不在选项里，由 currentPaperOptions 补置灰项保证回显
const searchAiPapers = () => {
  listAiPaperOptions().then(res => {
    aiPaperOptions.value = (res.data || []).map(item => ({
      label: item.label,
      value: item.value,
    }))
  })
}
//查询班级
const searchClasseList = () => {
  listClasses().then((res) => {
    classesOptions.value = (res.rows || []).map(item => ({
      label: item.deptName,
      value: item.deptId.toString(),
    }))
  })
}
//查询教师
const searchTeacherList = () => {
  listAllTeachers({}).then(res => {
    const options = (res.rows || []).map(item => ({
      label: item.nickName,
      value: item.userId.toString(),
    }))
    if (hasAdmin.value) {
      options.push({ label: userName.value, value: userId.value.toString() })
    }
    teacherOptions.value = options
  })
}

//校验（由调用方在点击保存时触发）
const validate = () => {
  return formRef.value.validate().then(() => {
    if (!props.form.grader) {
      props.form.grader = userId.value
    }
    if (!props.form.beginTime || !props.form.endTime) {
      message.warning(t('请完整输入考试起止时间'))
      return Promise.reject(new Error(t('起止时间不完整')))
    }
    var difference = new Date(props.form.endTime).getTime() - new Date(props.form.beginTime).getTime()
    if (difference <= 0) {
      message.warning(t('结束时间需大于开始时间'))
      return Promise.reject(new Error(t('结束时间需大于开始时间')))
    }
    return Promise.resolve(props.form)
  })
}

// 默认只加载当前数据源，另一类首次切换时再加载
watch(paperSource, (val) => {
  if (val === 1 && aiPaperOptions.value.length === 0) {
    searchAiPapers()
  }
})

searchClasseList()
searchTeacherList()
if (props.lockedPaperId) {
  // 锁定试卷无需拉取试卷列表
} else {
  searchManualPapers()
}

defineExpose({ validate, chooseBeginTime, chooseEndTime, calculateDuration })
</script>

<style scoped lang="scss">
</style>
