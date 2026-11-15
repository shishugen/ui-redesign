<template>
  <!-- B02 同名新写：保留 inputPrompt / callbackContent / callbackCancel 契约。
       旧组件依赖 turndown；这里不做 HTML→Markdown 转换，内容按纯文本流式拼接，用 marked 预览。 -->
  <div class="mg">
    <div class="mg__tip">{{ t('手动优化简介') }}</div>
    <a-textarea v-model:value="prompt" :rows="3" :placeholder="t('输入要优化的内容或补充要求')" :disabled="busy" />

    <div class="mg__bar">
      <a-button type="primary" :loading="busy" :disabled="!prompt.trim()" @click="generate">
        {{ t('生成内容') }}
      </a-button>
      <a-button :disabled="busy || !answer" @click="useContent">{{ t('采用该内容') }}</a-button>
      <a-button :disabled="busy" @click="props.callbackCancel()">{{ t('取消') }}</a-button>
    </div>

    <div v-if="err" class="mg__err" role="alert">{{ err }}</div>

    <div class="mg__pane">
      <div class="mg__pane-hd">{{ t('生成结果') }}</div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="answer" class="mg__md" v-html="rendered" />
      <div v-else class="mg__empty">{{ t('还没有生成内容。填写要求后点「生成内容」。') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { marked } from 'marked'
import { t } from '@/i18n'
import { manualGenerateContentStream } from '@/api/apt/courseCreation'

const props = defineProps({
  inputPrompt: { type: String, default: '' },
  chapterTitle: { type: String, default: '' },
  courseTitle: { type: String, default: '' },
  overview: { type: String, default: '' },
  callbackContent: { type: Function, default: () => {} },
  callbackCancel: { type: Function, default: () => {} }
})

const prompt = ref(props.inputPrompt)
const answer = ref('')
const busy = ref(false)
const err = ref('')
const rendered = computed(() => {
  try { return marked.parse(answer.value || '') } catch (e) { return answer.value }
})

function generate() {
  if (!prompt.value.trim()) return
  answer.value = ''
  err.value = ''
  busy.value = true
  manualGenerateContentStream(
    {
      message: prompt.value.trim(),
      conversation_history: [],
      chapter_title: props.chapterTitle,
      course_title: props.courseTitle,
      course_overview: props.overview
    },
    (chunk) => {
      if (chunk?.content) answer.value += chunk.content
      if (chunk?.is_complete) busy.value = false
    },
    () => { busy.value = false },
    (error) => {
      busy.value = false
      err.value = error?.message || t('生成失败')
    }
  )
}
function useContent() {
  if (!answer.value) return
  props.callbackContent(answer.value)
}
</script>

<style scoped>
.mg { display: flex; flex-direction: column; gap: 12px; }
.mg__tip { color: var(--ink-3); font-size: 12px; }
.mg__bar { display: flex; flex-wrap: wrap; gap: 8px; }
.mg__err { color: var(--danger); font-size: 12px; }
.mg__pane {
  border: 1px solid var(--line); border-radius: var(--r);
  background: var(--bg-soft); min-height: 220px; max-height: 46vh; overflow: auto; padding: 14px;
}
.mg__pane-hd { font-weight: 600; color: var(--ink-2); margin-bottom: 8px; }
.mg__md { color: var(--ink); line-height: 1.7; }
.mg__md :deep(h1), .mg__md :deep(h2), .mg__md :deep(h3) { margin: 10px 0 6px; }
.mg__empty { color: var(--ink-4); font-size: 12px; }
</style>
