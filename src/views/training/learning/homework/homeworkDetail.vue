<template>
  <!--
    逐题明细外壳：内层直接挂批阅侧的 AiGradeDetail，本模块零改动复用（P059 由第十五批迁移）。
    self=true 走 /myPaper（学生看自己的，不需要批阅权限）；self=false 走 /gradeDetail 且带 userId，
    那是老师视角，需要 exam:aiExam:grade 权限。两种模式都强制 readonly：本模块不给任何评分/确认入口，
    简答题要改分得回考试批阅页。
    容器用 95% 宽的 a-drawer（与考试中心「成绩查看」、AI 试卷管理页「作答与成绩」同构）：
    里面是左侧题型导航 + 右侧逐题的整页布局，窄弹窗既放不下左导航，也没有确定高度会让 height:100% 塌陷。
  -->
  <a-drawer
    :open="open"
    :title="title"
    :width="drawerWidth"
    placement="right"
    destroy-on-close
    @update:open="val => emit('update:open', val)"
  >
    <AiGradeDetail
      v-if="open && examId"
      :exam-id="examId"
      :user-id="userId"
      :user-name="userName"
      :attempt-no="attemptNo"
      :self="self"
      readonly
    />
    <div v-else-if="open" class="hd__empty" role="status">
      <div class="hd__empty-t">{{ t('这一行还没有可展示的卷子') }}</div>
      <div class="hd__empty-d">{{ t('未交卷，或成绩尚未生效。') }}</div>
    </div>

    <template #extra>
      <a-button danger size="small" :aria-label="t('关闭')" @click="emit('update:open', false)">
        <template #icon><CloseOutlined /></template>
      </a-button>
    </template>
  </a-drawer>
</template>

<script setup name="HomeworkDetail">
import { ref, watch } from 'vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import AiGradeDetail from '@/views/manager/exam/components/AiGradeDetail.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  // 标题由调用方拼好传入：不带卷名老师会以为是章节汇总分
  title: { type: String, default: '' },
  examId: { type: [String, Number], default: '' },
  userId: { type: [String, Number], default: '' },
  userName: { type: String, default: '' },
  self: { type: Boolean, default: false },
  // 只看自己某一轮（答题页交完卷就地看答案）：不传时服务端兜成「已交卷里最高分那轮」
  attemptNo: { type: [String, Number], default: undefined }
})
const emit = defineEmits(['update:open'])

// 宽度按「打开那一刻」的窗口算（与考试中心、AI 试卷管理页统一 0.95）：
// 不挂 resize 监听，多个实例共用一个壳，挂了反而到处是副作用
const drawerWidth = ref(Math.round(window.innerWidth * 0.95))
watch(() => props.open, (val) => {
  if (val) drawerWidth.value = Math.round(window.innerWidth * 0.95)
})
</script>

<style scoped>
.hd__empty { padding: 48px 20px; text-align: center; }
.hd__empty-t { font-size: 13.5px; font-weight: 600; color: var(--ink-2); }
.hd__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }
</style>
