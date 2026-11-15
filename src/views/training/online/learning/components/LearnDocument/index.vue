<template>
  <div class="doc">
    <FilePreview v-if="filePath" :file-path="filePath" :ratio="0.88" />
    <div v-else class="doc__empty" role="status">{{ t('未选择文档') }}</div>
  </div>
</template>

<script setup name="LearnDocument">
// 文档学习：把附件路径交给公共 FilePreview（kkfileview 在线预览）渲染。
import FilePreview from '@/components/FilePreview/index.vue'
import { t } from '@/i18n'

defineProps({
  filePath: { type: String, default: '' }
})
</script>

<style scoped>
.doc { width: 100%; height: 100%; background: var(--bg); }
.doc__empty {
  padding: 40px 16px; text-align: center;
  font-size: 12.5px; color: var(--ink-4);
}
</style>
