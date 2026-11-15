<template>
  <div class="cf">
    <a-button type="primary" size="small" class="cf__btn" :aria-label="learnLabel" @click.stop="startLearn">
      {{ t('在线学习') }}
    </a-button>
    <a-button type="primary" ghost size="small" class="cf__btn"
              :disabled="!hasConfig" :title="hasConfig ? t('开始当前章节的实验') : t('该章节没有配置实训内容')"
              :aria-label="trainLabel" @click.stop="startTraining">
      {{ t('开始实验') }}
    </a-button>
  </div>
</template>

<script setup name="ConfigFlag">
import { computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { t } from '@/i18n'
import { saveScheduleByParams } from '@/api/learning/schedule'
import { getUserId } from '@/utils/user'
import { getConfigKey } from '@/api/system/config'

const props = defineProps({
  chapter: { type: Object, required: true }
})

const hasConfig = computed(() => Number(props.chapter.hasConfig) === 1)
const learnLabel = computed(() => t('在线学习《{name}》', { name: props.chapter.chapterName || '' }))
const trainLabel = computed(() => t('开始实验《{name}》', { name: props.chapter.chapterName || '' }))

// 在线学习页 B03 第十六批已迁移（P220）：按旧页参数新窗口打开，带 type=chapter + chapterId
function startLearn() {
  const { courseId, chapterId } = props.chapter
  if (!courseId) { message.warning(t('该资源缺少课程编号，无法进入学习')); return }
  const qs = new URLSearchParams({
    courseId: String(courseId),
    type: 'chapter',
    ...(chapterId ? { chapterId: String(chapterId) } : {})
  })
  window.open(`${window.location.pathname}#/online/learning?${qs.toString()}`, '_blank')
}

// 默认课时分钟（后端 sys.course.period，取不到按 45）
let defaultPeriod = 45
async function initDefaultPeriod() {
  try {
    const res = await getConfigKey('sys.course.period')
    const period = Number(res?.msg)
    if (Number.isFinite(period) && period > 0) defaultPeriod = period
  } catch (e) { /* 取不到就用默认值，不阻塞实验入口 */ }
}

function startTraining() {
  if (!hasConfig.value) return
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认开始当前章节《{name}》的实验？', { name: props.chapter.chapterName || '' }),
    okText: t('确定'),
    cancelText: t('取消'),
    onOk: async () => {
      try {
        await saveScheduleByParams({
          courseId: props.chapter.courseId,
          chapterId: props.chapter.chapterId,
          userId: getUserId(),
          scheduleType: 2,
          minutes: defaultPeriod * 2
        })
        message.success(t('实验已开始'))
      } catch (e) { /* 拦截器已提示，不伪造成功 */ }
    }
  })
}

initDefaultPeriod()
</script>

<style scoped>
.cf { display: inline-flex; align-items: center; gap: 6px; }
.cf__btn { font-size: 12px; }
</style>
