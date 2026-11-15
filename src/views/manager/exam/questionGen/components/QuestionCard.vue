<template>
  <a-card class="qc" size="small" :bordered="true">
    <template #title>
      <div class="qc__hd">
        <span class="qc__no">{{ t('第 {n} 题', { n: index + 1 }) }}</span>
        <a-tag :color="typeColor">{{ typeLabel }}</a-tag>
        <a-tag v-if="difficultyLabel" color="geekblue">{{ t('难度：{v}', { v: difficultyLabel }) }}</a-tag>
        <label class="qc__score">
          <span>{{ t('分值') }}：</span>
          <a-input-number v-model:value="question.score" :min="0" :max="100" :step="0.5" size="small"
                          style="width: 84px" :aria-label="t('本题分值')" />
          <span>{{ t('分') }}</span>
        </label>
        <span class="qc__gap" />
        <a-button v-if="editable" type="link" size="small"
                  :aria-label="t('编辑第 {n} 题', { n: index + 1 })" @click="emit('edit', index)">
          <template #icon><EditOutlined /></template>{{ t('编辑') }}
        </a-button>
        <a-button type="link" danger size="small"
                  :aria-label="t('删除第 {n} 题', { n: index + 1 })" @click="emit('remove', index)">
          <template #icon><DeleteOutlined /></template>{{ t('删除') }}
        </a-button>
      </div>
    </template>

    <div class="qc__content">{{ question.content }}</div>

    <div v-if="question.type === 'single' || question.type === 'judge'" class="qc__opts">
      <a-radio-group v-model:value="selectedKey" class="qc__opt-group" @change="handleChoice">
        <div v-for="opt in optionsWithKey" :key="opt.key" class="qc__opt" :class="optionClass(opt.key)">
          <a-radio :value="opt.key">{{ opt.key }}. {{ opt.label }}</a-radio>
        </div>
      </a-radio-group>
    </div>
    <div v-else-if="question.type === 'multiple'" class="qc__opts">
      <a-checkbox-group v-model:value="selectedKeys" class="qc__opt-group" @change="handleMultiChoice">
        <div v-for="opt in optionsWithKey" :key="opt.key" class="qc__opt" :class="optionClass(opt.key)">
          <a-checkbox :value="opt.key">{{ opt.key }}. {{ opt.label }}</a-checkbox>
        </div>
      </a-checkbox-group>
      <a-button v-if="selectedKeys.length && !(showAnswer && !answered)" type="link" size="small"
                @click="confirmMultiple">{{ t('确认作答') }}</a-button>
    </div>

    <div v-if="answered" class="qc__result" :class="isCorrect ? 'qc__result--ok' : 'qc__result--bad'" role="status">
      <CheckCircleOutlined v-if="isCorrect" /><CloseCircleOutlined v-else />
      {{ isCorrect ? t('回答正确') : t('回答错误') }}{{ t('，正确答案：{v}', { v: answerText }) }}
    </div>
    <div v-else-if="question.type === 'fill_blank' && !showAnswer" class="qc__hint">
      <FileTextOutlined /> {{ t('本题为填空题，展开下方查看答案与解析') }}
    </div>
    <div v-else-if="question.type === 'short_answer' && !showAnswer" class="qc__hint">
      <FileTextOutlined /> {{ t('本题为简答题，展开下方查看参考答案与评分要点') }}
    </div>

    <a-collapse v-model:activeKey="activePanels" :bordered="false" class="qc__answer">
      <a-collapse-panel key="answer" :header="t('查看答案与解析')">
        <p><strong>{{ t('答案') }}：</strong><span class="qc__pre">{{ answerText }}</span></p>
        <p v-if="question.explanation"><strong>{{ t('解析') }}：</strong>{{ question.explanation }}</p>
      </a-collapse-panel>
    </a-collapse>
  </a-card>
</template>

<script setup name="QuestionCard">
import { ref, computed, watch } from 'vue'
import { t } from '@/i18n'
import { DeleteOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  question: { type: Object, required: true },
  index: { type: Number, required: true },
  showAnswer: { type: Boolean, default: false },
  editable: { type: Boolean, default: false }
})
const emit = defineEmits(['remove', 'edit'])

const DIFFICULTY = { 1: '容易', 2: '较易', 3: '中等', 4: '较难', 5: '极难' }
const TYPES = {
  single: { label: '单选题', color: 'blue' },
  multiple: { label: '多选题', color: 'purple' },
  judge: { label: '判断题', color: 'cyan' },
  fill_blank: { label: '填空题', color: 'green' },
  short_answer: { label: '简答题', color: 'orange' }
}
const typeLabel = computed(() => t((TYPES[props.question.type] || {}).label || props.question.type))
const difficultyLabel = computed(() => DIFFICULTY[props.question.difficulty] ? t(DIFFICULTY[props.question.difficulty]) : '')
const typeColor = computed(() => (TYPES[props.question.type] || {}).color || 'default')

const selectedKey = ref(undefined)
const selectedKeys = ref([])
const answered = ref(false)
const activePanels = ref([])

const optionsWithKey = computed(() =>
  (props.question.options || []).map((opt, i) => ({ key: String.fromCharCode(65 + i), label: opt })))
const answerText = computed(() => {
  const list = props.question.answer || []
  return ['short_answer', 'fill_blank'].includes(props.question.type) ? list.join('\n') : list.join('、')
})
const isCorrect = computed(() => {
  const answer = [...(props.question.answer || [])].sort().join(',')
  return props.question.type === 'multiple'
    ? [...selectedKeys.value].sort().join(',') === answer
    : selectedKey.value === (props.question.answer || [])[0]
})

watch(() => props.showAnswer, (val) => {
  const has = activePanels.value.includes('answer')
  if (val && !has) activePanels.value = [...activePanels.value, 'answer']
  else if (!val && has) activePanels.value = activePanels.value.filter(k => k !== 'answer')
  if (answered.value) return
  if (['single', 'judge', 'multiple'].includes(props.question.type)) {
    const ans = props.question.answer || []
    if (val) {
      if (props.question.type === 'multiple') selectedKeys.value = [...ans]
      else selectedKey.value = ans[0]
    } else {
      selectedKey.value = undefined
      selectedKeys.value = []
    }
  }
}, { immediate: true })

const handleChoice = () => { answered.value = true; activePanels.value = ['answer'] }
const handleMultiChoice = (v) => { selectedKeys.value = v }
const confirmMultiple = () => { answered.value = true; activePanels.value = ['answer'] }
const optionClass = (key) => {
  if (!answered.value && !props.showAnswer) return ''
  if ((props.question.answer || []).includes(key)) return 'qc__opt--ok'
  if (!answered.value) return ''
  const selected = props.question.type === 'multiple' ? selectedKeys.value : [selectedKey.value]
  return selected.includes(key) ? 'qc__opt--bad' : ''
}
</script>

<style scoped>
.qc { margin-bottom: 12px; border: 1px solid var(--line); border-radius: var(--r); }
.qc__hd { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.qc :deep(.ant-card-head-title) { overflow: visible; white-space: normal; }
.qc__no { font-weight: 600; color: var(--ink-2); }
.qc__score { display: inline-flex; align-items: center; gap: 4px; color: var(--ink-3); font-size: 12px; }
.qc__gap { flex: 1; }
.qc__content { font-size: 13.5px; line-height: 1.7; color: var(--ink); white-space: pre-wrap; }
.qc__opts { margin-top: 10px; }
.qc__opt-group { display: flex; flex-direction: column; gap: 4px; width: 100%; }
.qc__opt { padding: 3px 8px; border-radius: var(--r-xs); }
.qc__opt--ok { background: var(--ok-soft); border: 1px solid var(--ok-line); }
.qc__opt--bad { background: var(--danger-soft); border: 1px solid var(--danger-line); }
.qc__result { margin-top: 10px; padding: 8px 10px; border-radius: var(--r-xs); font-size: 12.5px; }
.qc__result--ok { background: var(--ok-soft); color: var(--ok); }
.qc__result--bad { background: var(--danger-soft); color: var(--danger); }
.qc__hint { margin-top: 10px; font-size: 12px; color: var(--ink-4); }
.qc__pre { white-space: pre-wrap; }
.qc__answer { margin-top: 6px; }
</style>
