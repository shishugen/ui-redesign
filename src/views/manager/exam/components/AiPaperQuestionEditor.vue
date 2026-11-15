<template>
  <div class="pe">
    <div class="pe__hd">
      <div class="pe__meta">
        <span class="pe__name" :title="paper?.title || ''">{{ t('试卷：《{name}》', { name: paper?.title || '' }) }}</span>
        <span>{{ t('总分：{n} 分', { n: liveTotalScore }) }}</span>
        <span>{{ t('及格分：{n} 分', { n: passScore }) }}</span>
      </div>
      <a-space :size="6">
        <a-tag v-if="answeredCount > 0" color="error">{{ t('已有 {n} 人交卷，题目不可修改', { n: answeredCount }) }}</a-tag>
        <a-tag v-else-if="liveTotalScore < passScore" color="warning">
          {{ t('总分低于及格线 {n} 分', { n: passScore }) }}
        </a-tag>
        <a-button size="small" @click="emit('cancel')">{{ t('取消') }}</a-button>
        <a-button type="primary" size="small" :loading="saving"
                  :disabled="locked || !questions.length || liveTotalScore < passScore" @click="handleSave">
          {{ t('保存题目') }}
        </a-button>
      </a-space>
    </div>

    <!-- 可聚焦的错误汇总：校验失败时聚焦到此处，逐条链接到对应题块（WCAG 表单错误汇总） -->
    <div v-if="errorList.length" ref="errorSummary" class="pe__err-sum" role="alert" tabindex="-1"
         :aria-label="t('题目校验未通过')">
      <b>{{ t('有 {n} 处题目需要修改', { n: errorList.length }) }}</b>
      <ul>
        <li v-for="(e, i) in errorList" :key="i">
          <a href="javascript:void(0)" @click.prevent="focusQuestion(e.id)">{{ e.text }}</a>
        </li>
      </ul>
    </div>

    <div v-if="loadError" class="pe__state" role="alert">
      <b>{{ t('试卷加载失败') }}</b><span>{{ loadError }}</span>
      <a-button size="small" @click="load">{{ t('重试') }}</a-button>
    </div>
    <div v-else-if="loading" class="pe__state" aria-busy="true"><a-spin :tip="t('正在加载')" /></div>
    <div v-else-if="!questions.length" class="pe__state" role="status"><b>{{ t('该试卷暂无题目') }}</b></div>

    <div v-else class="pe__body" :style="{ height: bodyHeight + 'px' }">
      <nav class="pe__nav" :aria-label="t('题型导航')">
        <a-collapse v-model:activeKey="activeKey" :bordered="false">
          <a-collapse-panel v-for="g in questionGroups" :key="g.type">
            <template #header>
              <span>{{ typeName(g.type) }} {{ t('{n} 题', { n: g.rows.length }) }} · {{ t('共 {n} 分', { n: g.total }) }}</span>
            </template>
            <button v-for="q in g.rows" :key="q.questionId" type="button" class="pe__nav-btn"
                    :aria-label="t('跳到第 {n} 题', { n: sortOf(q) })" @click="focusQuestion(q.questionId)">
              {{ sortOf(q) }}
            </button>
          </a-collapse-panel>
        </a-collapse>
      </nav>

      <div ref="rightPanel" class="pe__list" @scroll="onScroll">
        <section v-for="g in questionGroups" :key="g.type">
          <h3 class="pe__group-t">{{ typeName(g.type) }}</h3>
          <article v-for="q in g.rows" :id="'q-' + q.questionId" :key="q.questionId" class="pe__q">
            <header class="pe__q-hd">
              <span class="pe__q-no">{{ sortOf(q) }}.</span>
              <label class="pe__field">
                <span>{{ t('分值') }}</span>
                <a-input-number v-model:value="q.score" :min="0.5" :max="100" :step="0.5" :precision="1"
                                size="small" style="width: 104px" :disabled="locked" addon-after="分" />
              </label>
              <label class="pe__field">
                <span>{{ t('难度') }}</span>
                <a-select v-model:value="q.difficulty" size="small" style="width: 106px" :disabled="locked"
                          :options="difficultyOptions" allow-clear :placeholder="t('未设置')" />
              </label>
              <span class="pe__gap" />
              <a-button type="link" danger size="small" :disabled="locked || questions.length <= 1"
                        :aria-label="t('删除第 {n} 题', { n: sortOf(q) })" @click="removeQuestion(q)">
                {{ t('删除本题') }}
              </a-button>
            </header>

            <a-form-item class="pe__fi" :validate-status="fieldError(q.questionId, 'content') ? 'error' : ''">
              <a-textarea v-model:value="q.content" :auto-size="{ minRows: 1, maxRows: 8 }" :disabled="locked"
                          :placeholder="t('请输入题干')" :aria-label="t('题干')"
                          :aria-describedby="fieldError(q.questionId, 'content') ? 'err-' + q.questionId + '-content' : undefined" />
              <div v-if="fieldError(q.questionId, 'content')" :id="'err-' + q.questionId + '-content'" class="pe__err">
                {{ fieldError(q.questionId, 'content') }}
              </div>
            </a-form-item>

            <div v-if="q.type === '1' || q.type === '2'" class="pe__opts">
              <div v-for="(opt, oi) in q.options" :key="oi" class="pe__opt"
                   :class="{ 'pe__opt--ok': q.answer.includes(letterOf(oi)) }">
                <span class="pe__letter">{{ letterOf(oi) }}.</span>
                <a-input :value="q.options[oi]" size="small" :disabled="locked"
                         :placeholder="t('选项内容')" :aria-label="t('选项 {k}', { k: letterOf(oi) })"
                         @update:value="(v) => { q.options[oi] = v }" />
                <a-checkbox :checked="q.answer.includes(letterOf(oi))" :disabled="locked"
                            @change="toggleCorrect(q, letterOf(oi), q.type === '1')">{{ t('正确答案') }}</a-checkbox>
                <a-button type="link" danger size="small" :disabled="locked || q.options.length <= 2"
                          :aria-label="t('删除选项 {k}', { k: letterOf(oi) })" @click="removeOption(q, oi)">
                  {{ t('删') }}
                </a-button>
              </div>
              <div v-if="fieldError(q.questionId, 'options')" class="pe__err">{{ fieldError(q.questionId, 'options') }}</div>
              <a-button size="small" :disabled="locked" @click="q.options.push('')">{{ t('添加选项') }}</a-button>
            </div>

            <div v-if="q.type === '3'" class="pe__ans">
              <span class="pe__label">{{ t('参考答案') }}：</span>
              <a-radio-group v-model:value="q.judge" :disabled="locked">
                <a-radio value="A">{{ t('正确') }}</a-radio><a-radio value="B">{{ t('错误') }}</a-radio>
              </a-radio-group>
            </div>
            <div v-if="q.type === '4'" class="pe__ans">
              <span class="pe__label">{{ t('参考答案') }}：</span>
              <div class="pe__blanks">
                <div v-for="(blank, bi) in q.answer" :key="bi" class="pe__opt">
                  <span class="pe__letter">{{ t('第 {n} 空', { n: bi + 1 }) }}</span>
                  <a-input :value="q.answer[bi]" size="small" :disabled="locked"
                           :placeholder="t('该空答案，多个可接受写法用 / 分隔')"
                           @update:value="(v) => { q.answer[bi] = v }" />
                  <a-button type="link" danger size="small" :disabled="locked || q.answer.length <= 1"
                            @click="q.answer.splice(bi, 1)">{{ t('删') }}</a-button>
                </div>
                <div v-if="fieldError(q.questionId, 'answer')" class="pe__err">{{ fieldError(q.questionId, 'answer') }}</div>
                <a-button size="small" :disabled="locked" @click="q.answer.push('')">{{ t('添加一空') }}</a-button>
                <div v-if="q.answer.length > 1" class="pe__tip">{{ t('填空按空均分：{v}', { v: blankLadder(q) }) }}</div>
              </div>
            </div>
            <div v-if="q.type === '5'" class="pe__ans">
              <span class="pe__label">{{ t('参考答案') }}：</span>
              <a-textarea v-model:value="q.judge" :auto-size="{ minRows: 3, maxRows: 12 }" :disabled="locked"
                          :placeholder="t('参考答案，一行一个得分要点（可空）')" />
            </div>
            <div class="pe__ans">
              <span class="pe__label">{{ t('解析') }}：</span>
              <a-textarea v-model:value="q.explanation" :auto-size="{ minRows: 1, maxRows: 6 }" :disabled="locked"
                          :placeholder="t('答案解析（可空）')" />
            </div>
          </article>
        </section>
        <a-button v-if="scrollTop > 0" class="pe__top" size="small" :aria-label="t('回到顶部')" @click="toTop">
          <template #icon><ArrowUpOutlined /></template>{{ t('回到顶部') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup name="AiPaperQuestionEditor">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'
import { ArrowUpOutlined } from '@ant-design/icons-vue'
import { getAiPaperQuestionsForEdit, updateAiPaperQuestions } from '@/api/exam/aiExam.js'
import { getDicts } from '@/api/system/dict/data.js'

const props = defineProps({ paperId: { type: [String, Number], default: '' } })
const emit = defineEmits(['saved', 'cancel'])

const TYPE_FALLBACK = { 1: '单选题', 2: '多选题', 3: '判断题', 4: '填空题', 5: '简答题' }
const DIFF_FALLBACK = { 1: '容易', 2: '较易', 3: '中等', 4: '较难', 5: '极难' }
const HALF_SCORE = 0.5
const FILL_BLANK_RE = /_{3,}/g

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const paper = ref(null)
const questions = ref([])
const answeredCount = ref(0)
const typeDict = ref([])
const diffDict = ref([])
const activeKey = ref([])
const rightPanel = ref(null)
const errorSummary = ref(null)
const scrollTop = ref(0)
const bodyHeight = ref(560)
const errors = ref([])

const locked = computed(() => answeredCount.value > 0)
const passScore = computed(() => Number(paper.value?.passScore) || 0)
const liveTotalScore = computed(() => Math.round(questions.value.reduce((s, q) => s + (Number(q.score) || 0), 0) * 100) / 100)
const errorList = computed(() => errors.value)
const questionGroups = computed(() => ['1', '2', '3', '4', '5'].map(type => {
  const rows = questions.value.filter(q => q.type === type)
  return { type, rows, total: Math.round(rows.reduce((s, q) => s + (Number(q.score) || 0), 0) * 100) / 100 }
}).filter(g => g.rows.length))
const difficultyOptions = computed(() => (diffDict.value.length
  ? diffDict.value.map(d => ({ label: t(d.label), value: String(d.value) }))
  : Object.entries(DIFF_FALLBACK).map(([value, label]) => ({ label: t(label), value }))))
const typeName = (type) => t(typeDict.value.find(d => String(d.value) === String(type))?.label || TYPE_FALLBACK[String(type)] || '')

const sortOf = (q) => questions.value.indexOf(q) + 1
const letterOf = (i) => String.fromCharCode(65 + i)
const indexOfLetter = (k) => String(k || '').trim().toUpperCase().charCodeAt(0) - 65
const stripLetter = (o) => String(o ?? '').replace(/^\s*[A-Za-z][.、)]\s*/, '')
const fieldError = (id, field) => errors.value.find(e => e.id === id && e.field === field)?.text || ''
const resize = () => { bodyHeight.value = Math.max(360, document.documentElement.clientHeight - 260) }
const onScroll = () => { scrollTop.value = rightPanel.value?.scrollTop || 0 }
const toTop = () => { if (rightPanel.value) rightPanel.value.scrollTop = 0 }
const focusQuestion = (id) => {
  const el = document.getElementById('q-' + id)
  const box = rightPanel.value
  if (el && box) { box.scrollTo({ top: el.offsetTop - box.offsetTop, behavior: 'smooth' }); el.querySelector('textarea')?.focus() }
}
const fillBlankSlots = (content) => (String(content || '').match(FILL_BLANK_RE) || ['']).length
const blankStepScore = (score, hit, total) => {
  const full = Number(score) || 0
  if (!total) return 0
  const per = Math.ceil(Math.round(full / total * 10000) / 10000 / HALF_SCORE) * HALF_SCORE
  let got = Math.round(per * hit * 100) / 100
  if (hit < total) got = Math.min(got, Math.round((full - HALF_SCORE * (total - hit)) * 100) / 100)
  return Math.min(Math.max(got, 0), full)
}
const blankLadder = (q) => {
  const total = (q.answer || []).length
  if (total < 2) return ''
  const full = Number(q.score) || 0
  if (total > 5) return t('本题 {n} 分 / {m} 空，对 1 空 {p} 分，全对 {n} 分',
    { n: full, m: total, p: blankStepScore(full, 1, total) })
  return Array.from({ length: total }, (_, i) => t('对 {i} 空 {p} 分', { i: i + 1, p: blankStepScore(full, i + 1, total) })).join('、')
}

async function loadDicts() {
  for (const [key, target] of [['sys_question_type', typeDict], ['sys_question_difficulty', diffDict]]) {
    try {
      const res = await getDicts(key)
      target.value = (res.data || []).map(d => ({ label: d.dictLabel, value: d.dictValue }))
    } catch (e) { target.value = [] }
  }
}

async function load() {
  loadError.value = ''
  errors.value = []
  if (!props.paperId) { paper.value = null; questions.value = []; return }
  loading.value = true
  try {
    const res = await getAiPaperQuestionsForEdit(props.paperId)
    const data = res.data || {}
    paper.value = data.paper || null
    answeredCount.value = Number(data.answeredCount) || 0
    questions.value = (data.questions || []).map(q => {
      const type = String(q.type)
      const answer = (q.answer || []).map(k => String(k))
      return {
        questionId: q.questionId, type,
        judge: type === '3' ? (answer[0] || 'A') : (type === '5' ? answer.join('\n') : (answer[0] || '')),
        content: q.content || '',
        options: (q.options || []).map(stripLetter),
        answer: type === '1' || type === '2' ? answer.map(k => k.trim().toUpperCase()) : answer,
        explanation: q.explanation || '',
        difficulty: q.difficulty == null || q.difficulty === '' ? undefined : String(q.difficulty),
        score: Number(q.score) || 0
      }
    })
    await nextTick()
    activeKey.value = questionGroups.value.map(g => g.type)
  } catch (e) {
    loadError.value = e?.message || t('试卷接口不可用')
    questions.value = []
  } finally { loading.value = false }
}

const toggleCorrect = (q, key, single) => {
  const at = q.answer.indexOf(key)
  if (at >= 0) { q.answer.splice(at, 1); return }
  if (single) q.answer.splice(0, q.answer.length, key)
  else q.answer.push(key)
}
const removeOption = (q, oi) => {
  const removed = letterOf(oi)
  q.options.splice(oi, 1)
  q.answer = q.answer.filter(k => k !== removed)
    .map(k => indexOfLetter(k) > oi ? letterOf(indexOfLetter(k) - 1) : k)
}
const removeQuestion = (q) => {
  const at = questions.value.indexOf(q)
  if (at >= 0) questions.value.splice(at, 1)
  errors.value = errors.value.filter(e => e.id !== q.questionId)
}

// 逐题校验：错误既落在字段旁（aria-describedby），也汇总到顶部可聚焦容器
function validate() {
  const found = []
  const add = (id, field, text) => found.push({ id, field, text })
  if (!questions.value.length) { message.warning(t('试卷至少要保留 1 道题')); return false }
  questions.value.forEach((q, i) => {
    const no = t('第 {n} 题', { n: i + 1 })
    if (!String(q.content || '').trim()) add(q.questionId, 'content', t('{no}题干不能为空', { no }))
    if (!(Number(q.score) > 0)) add(q.questionId, 'content', t('{no}分值必须大于 0', { no }))
    if (q.type === '1' || q.type === '2') {
      if (q.options.length < 2) add(q.questionId, 'options', t('{no}至少需要 2 个选项', { no }))
      else if (q.options.some(o => !String(o || '').trim())) add(q.questionId, 'options', t('{no}存在空的选项内容', { no }))
      if (!q.answer.length) add(q.questionId, 'options', t('{no}请勾选正确答案', { no }))
      else if (q.type === '1' && q.answer.length > 1) add(q.questionId, 'options', t('{no}是单选题，只能有一个正确答案', { no }))
    }
    if (q.type === '4') {
      if (q.answer.some(b => !String(b || '').trim())) add(q.questionId, 'answer', t('{no}存在空的填空答案', { no }))
      const slots = fillBlankSlots(q.content)
      if (slots !== q.answer.length) add(q.questionId, 'answer',
        t('{no}题干有 {a} 个空位，但设了 {b} 个填空答案，两者数量要对齐', { no, a: slots, b: q.answer.length }))
      const min = Math.round(HALF_SCORE * q.answer.length * 100) / 100
      if (!(Number(q.score) >= min)) add(q.questionId, 'answer', t('{no}有 {b} 个空，分值至少 {m} 分', { no, b: q.answer.length, m: min }))
    }
  })
  if (passScore.value > liveTotalScore.value) {
    message.warning(t('调整后总分 {a} 分低于当前及格线 {b} 分，请先下调及格线', { a: liveTotalScore.value, b: passScore.value }))
    return false
  }
  errors.value = found
  if (found.length) nextTick(() => errorSummary.value?.focus())
  return !found.length
}

const buildAnswer = (q) => {
  if (q.type === '3') return [q.judge || 'A']
  if (q.type === '5') return String(q.judge || '').split('\n').map(l => l.trim()).filter(Boolean)
  if (q.type === '4') return q.answer.map(b => String(b).trim())
  return [...q.answer].sort()
}
async function handleSave() {
  if (locked.value || !validate()) return
  saving.value = true
  try {
    const res = await updateAiPaperQuestions({
      paperId: props.paperId,
      questions: questions.value.map(q => ({
        type: q.type, content: q.content,
        options: q.type === '1' || q.type === '2' ? q.options.map(o => String(o).trim()) : [],
        answer: buildAnswer(q), explanation: q.explanation || '',
        difficulty: q.difficulty || '', score: Number(q.score)
      }))
    })
    const d = res.data || {}
    message.success(t('题目已保存，共 {n} 题 / 总分 {s} 分', { n: d.questionCount, s: d.totalScore }))
    emit('saved')
  } catch (e) {
    message.error(e?.message || t('保存失败，请重试'))
  } finally { saving.value = false }
}

onMounted(() => { resize(); window.addEventListener('resize', resize); loadDicts() })
onUnmounted(() => window.removeEventListener('resize', resize))
watch(() => props.paperId, load, { immediate: true })
defineExpose({ load })
</script>

<style scoped>
.pe { display: flex; flex-direction: column; gap: 12px; }
.pe__hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; border-radius: var(--r); background: var(--bg-soft); border: 1px solid var(--line); }
.pe__meta { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: var(--ink-2); }
.pe__name { font-weight: 600; color: var(--ink); max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pe__err-sum { padding: 10px 14px; border: 1px solid var(--danger-line); background: var(--danger-soft);
  border-radius: var(--r); color: var(--danger); font-size: 12.5px; }
.pe__err-sum:focus { outline: 2px solid var(--danger); outline-offset: 2px; }
.pe__err-sum ul { margin: 6px 0 0; padding-left: 18px; }
.pe__err-sum a { color: var(--danger); text-decoration: underline; }
.pe__state { display: flex; align-items: center; gap: 10px; padding: 40px 16px; flex-direction: column;
  border: 1px dashed var(--line-2); border-radius: var(--r); color: var(--ink-3); font-size: 13px; }
.pe__state b { color: var(--ink-2); }
.pe__body { display: flex; gap: 12px; min-height: 0; }
.pe__nav { width: 190px; flex: 0 0 190px; overflow-y: auto; border: 1px solid var(--line); border-radius: var(--r); background: var(--bg-soft); padding: 6px; }
.pe__nav-btn { min-width: 30px; height: 30px; margin: 3px; padding: 0 6px; border: 1px solid var(--line-2);
  border-radius: var(--r-xs); background: var(--panel); color: var(--ink-2); cursor: pointer; font-size: 12px; }
.pe__nav-btn:hover, .pe__nav-btn:focus-visible { border-color: var(--pri); color: var(--pri); outline: none; }
.pe__list { position: relative; flex: 1; min-width: 0; overflow-y: auto; padding: 0 12px 40px; }
.pe__group-t { font-size: 14px; font-weight: 600; color: var(--ink-2); margin: 14px 0 8px; }
.pe__q { padding: 12px; margin-bottom: 10px; border: 1px solid var(--line); border-radius: var(--r); background: var(--panel); }
.pe__q-hd { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.pe__q-no { font-size: 14px; font-weight: 600; color: var(--ink-2); }
.pe__field { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--ink-3); }
.pe__gap { flex: 1; }
.pe__fi { margin-bottom: 0; }
.pe__opts { margin: 10px 0; display: flex; flex-direction: column; gap: 6px; }
.pe__opt { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: var(--r-xs); }
.pe__opt--ok { background: var(--ok-soft); }
.pe__opt :deep(.ant-input) { flex: 1; min-width: 0; }
.pe__letter { flex: none; width: 48px; text-align: right; font-size: 12px; color: var(--ink-3); }
.pe__ans { display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; font-size: 12.5px; }
.pe__label { flex: none; color: var(--ink-3); }
.pe__blanks { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.pe__blanks .pe__letter { width: 58px; }
.pe__blanks :deep(.ant-btn) { flex: none; }
.pe__err { color: var(--danger); font-size: 12px; margin-top: 4px; }
.pe__tip { color: var(--ink-4); font-size: 12px; }
.pe__top { position: sticky; bottom: 8px; float: right; }
</style>
