<template>
  <div class="pp">
    <div class="pp__hd">
      <div class="pp__meta">
        <span class="pp__name" :title="paper?.title || ''">{{ t('试卷：《{name}》', { name: paper?.title || '' }) }}</span>
        <span>{{ t('总分：{n} 分', { n: paper?.totalScore ?? '—' }) }}</span>
        <span>{{ t('及格分：{n} 分', { n: paper?.passScore ?? '—' }) }}</span>
      </div>
      <a-tag v-if="paper && !hasAnswer" color="orange">{{ t('您非该卷创建人/批阅人，答案与解析不可见') }}</a-tag>
    </div>

    <div v-if="loadError" class="pp__state" role="alert">
      <b>{{ t('试卷加载失败') }}</b><span>{{ loadError }}</span>
      <a-button size="small" @click="load">{{ t('重试') }}</a-button>
    </div>
    <div v-else-if="loading" class="pp__state" aria-busy="true"><a-spin :tip="t('正在加载')" /></div>
    <div v-else-if="!questions.length" class="pp__state" role="status">
      <b>{{ t('该试卷暂无题目') }}</b><span>{{ t('可先在卷池里为本章出题，再回到这里预览。') }}</span>
    </div>

    <div v-else class="pp__body" :style="{ height: bodyHeight + 'px' }">
      <nav class="pp__nav" :aria-label="t('题型导航')">
        <a-collapse v-model:activeKey="activeKey" :bordered="false">
          <a-collapse-panel v-for="g in questionGroups" :key="g.type">
            <template #header>
              <span>{{ typeName(g.type) }} {{ t('{n} 题', { n: g.rows.length }) }} · {{ t('共 {n} 分', { n: g.total }) }}</span>
            </template>
            <button v-for="q in g.rows" :key="q.questionId" type="button" class="pp__nav-btn"
                    :aria-label="t('跳到第 {n} 题', { n: q.sort })" @click="scrollTo(q.questionId)">
              {{ q.sort }}
            </button>
          </a-collapse-panel>
        </a-collapse>
      </nav>

      <div ref="rightPanel" class="pp__list" @scroll="onScroll">
        <section v-for="g in questionGroups" :key="g.type" class="pp__group">
          <h3 class="pp__group-t">{{ typeName(g.type) }}</h3>
          <article v-for="q in g.rows" :id="String(q.questionId)" :key="q.questionId" class="pp__q">
            <header class="pp__q-hd">
              <span class="pp__q-no">{{ q.sort }}.</span>
              <span class="pp__q-score">{{ t('（{n} 分）', { n: q.score }) }}</span>
              <span v-if="difficultyName(q.difficulty)" class="pp__q-diff">
                {{ t('难度：{v}', { v: difficultyName(q.difficulty) }) }}
              </span>
            </header>
            <p class="pp__q-text">{{ q.content }}</p>
            <ul v-if="optionsOf(q).length" class="pp__opts">
              <li v-for="(opt, i) in optionsOf(q)" :key="i" :class="{ 'pp__opt--ok': correctKeys(q).includes(letterOf(i)) }">
                {{ letterOf(i) }}. {{ opt }}
              </li>
            </ul>
            <p v-if="q.answer" class="pp__ans"><strong>{{ t('参考答案') }}：</strong><span class="pp__pre">{{ answerText(q) }}</span></p>
            <p v-if="q.analysis" class="pp__ans"><strong>{{ t('解析') }}：</strong>{{ q.analysis }}</p>
          </article>
        </section>
        <a-button v-if="scrollTop > 0" class="pp__top" size="small" :aria-label="t('回到顶部')" @click="toTop">
          <template #icon><ArrowUpOutlined /></template>{{ t('回到顶部') }}
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup name="AiPaperPreview">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { t } from '@/i18n'
import { ArrowUpOutlined } from '@ant-design/icons-vue'
import { getAiPaperQuestions } from '@/api/exam/aiExam.js'
import { getDicts } from '@/api/system/dict/data.js'

const props = defineProps({ paperId: { type: [String, Number], default: '' } })

const TYPE_FALLBACK = { 1: '单选题', 2: '多选题', 3: '判断题', 4: '填空题', 5: '简答题' }
const DIFF_FALLBACK = { 1: '容易', 2: '较易', 3: '中等', 4: '较难', 5: '极难' }

const loading = ref(false)
const loadError = ref('')
const paper = ref(null)
const questions = ref([])
const typeDict = ref([])
const diffDict = ref([])
const activeKey = ref([])
const rightPanel = ref(null)
const scrollTop = ref(0)
const bodyHeight = ref(560)

const hasAnswer = computed(() => questions.value.some(q => q.answer != null))
const questionGroups = computed(() => ['1', '2', '3', '4', '5'].map(type => {
  const rows = questions.value.filter(q => String(q.questionType) === type)
  return { type, rows, total: Math.round(rows.reduce((s, q) => s + (Number(q.score) || 0), 0) * 100) / 100 }
}).filter(g => g.rows.length))

const typeName = (type) => t(typeDict.value.find(d => String(d.value) === String(type))?.label || TYPE_FALLBACK[String(type)] || '')
const difficultyName = (v) => v == null || v === '' ? '' : t(diffDict.value.find(d => String(d.value) === String(v))?.label || DIFF_FALLBACK[String(v)] || '')
const parseList = (v) => {
  if (v == null || v === '') return []
  try {
    const p = typeof v === 'string' ? JSON.parse(v) : v
    return Array.isArray(p) ? p.map(String) : [String(p)]
  } catch (e) { return [String(v)] }
}
const optionsOf = (q) => parseList(q.options).map(o => o.replace(/^\s*[A-Za-z][.、)]\s*/, ''))
const letterOf = (i) => String.fromCharCode(65 + i)
const correctKeys = (q) => ['1', '2', '3'].includes(String(q.questionType)) ? parseList(q.answer) : []
const answerText = (q) => {
  const list = parseList(q.answer)
  const type = String(q.questionType)
  if (type === '3') return list.map(a => a === 'A' ? t('正确') : a === 'B' ? t('错误') : a).join('；')
  if (type === '4') return list.map((v, i) => t('第 {n} 空：{v}', { n: i + 1, v })).join('；')
  if (type === '5') return list.join('\n')
  return list.join('；')
}

const resize = () => { bodyHeight.value = Math.max(360, document.documentElement.clientHeight - 190) }
const scrollTo = (id) => {
  const el = document.getElementById(String(id))
  const box = rightPanel.value
  if (el && box) box.scrollTo({ top: el.offsetTop - box.offsetTop, behavior: 'smooth' })
}
const onScroll = () => { scrollTop.value = rightPanel.value?.scrollTop || 0 }
const toTop = () => { if (rightPanel.value) rightPanel.value.scrollTop = 0 }

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
  if (!props.paperId) { paper.value = null; questions.value = []; return }
  loading.value = true
  try {
    const res = await getAiPaperQuestions(props.paperId)
    const data = res.data || {}
    paper.value = data.paper || null
    questions.value = data.questions || []
    await nextTick()
    activeKey.value = questionGroups.value.map(g => g.type)
  } catch (e) {
    loadError.value = e?.message || t('试卷接口不可用')
    questions.value = []
  } finally { loading.value = false }
}

onMounted(() => { resize(); window.addEventListener('resize', resize); loadDicts() })
onUnmounted(() => window.removeEventListener('resize', resize))
watch(() => props.paperId, load, { immediate: true })
defineExpose({ load })
</script>

<style scoped>
.pp { display: flex; flex-direction: column; gap: 12px; }
.pp__hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 10px 14px; border-radius: var(--r); background: var(--bg-soft); border: 1px solid var(--line); }
.pp__meta { display: flex; gap: 18px; flex-wrap: wrap; font-size: 12.5px; color: var(--ink-2); }
.pp__name { font-weight: 600; color: var(--ink); max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pp__state { display: flex; align-items: center; gap: 10px; padding: 40px 16px; flex-direction: column;
  border: 1px dashed var(--line-2); border-radius: var(--r); color: var(--ink-3); font-size: 13px; }
.pp__state b { color: var(--ink-2); }
.pp__body { display: flex; gap: 12px; min-height: 0; }
.pp__nav { width: 190px; flex: 0 0 190px; overflow-y: auto; border: 1px solid var(--line); border-radius: var(--r); background: var(--bg-soft); padding: 6px; }
.pp__nav-btn { min-width: 30px; height: 30px; margin: 3px; padding: 0 6px; border: 1px solid var(--line-2);
  border-radius: var(--r-xs); background: var(--panel); color: var(--ink-2); cursor: pointer; font-size: 12px; }
.pp__nav-btn:hover, .pp__nav-btn:focus-visible { border-color: var(--pri); color: var(--pri); outline: none; }
.pp__list { position: relative; flex: 1; min-width: 0; overflow-y: auto; padding: 0 12px 40px; }
.pp__group-t { font-size: 14px; font-weight: 600; color: var(--ink-2); margin: 14px 0 8px; }
.pp__q { padding: 12px 0; border-bottom: 1px solid var(--line-3); }
.pp__q-hd { display: flex; gap: 10px; align-items: center; font-size: 12px; color: var(--ink-4); }
.pp__q-no { font-size: 14px; font-weight: 600; color: var(--ink-2); }
.pp__q-text { margin: 8px 0; font-size: 13.5px; line-height: 1.7; color: var(--ink); white-space: pre-wrap; }
.pp__opts { list-style: none; padding: 0; margin: 8px 0; display: flex; flex-direction: column; gap: 4px; }
.pp__opts li { padding: 4px 8px; border-radius: var(--r-xs); font-size: 13px; color: var(--ink-2); }
.pp__opt--ok { background: var(--ok-soft); color: var(--ok); }
.pp__ans { margin: 6px 0; font-size: 12.5px; color: var(--ink-3); }
.pp__pre { white-space: pre-wrap; }
.pp__top { position: sticky; bottom: 8px; float: right; }
</style>
