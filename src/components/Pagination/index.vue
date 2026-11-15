<template>
  <!-- B02 同名新写：旧组件基于 el-pagination，这里等价换成 antd v4 a-pagination -->
  <div class="pg">
    <span class="pg__total">{{ t('共 {n} 条', { n: total }) }}</span>
    <a-pagination
      :current="page" :page-size="limit" :total="total"
      :page-size-options="pageSizes.map(String)" :show-size-changer="true"
      size="small" @change="onChange"
    />
  </div>
</template>

<script setup>
import { t } from '@/i18n'

const props = defineProps({
  total: { type: Number, default: 0 },
  page: { type: Number, default: 1 },
  limit: { type: Number, default: 12 },
  pageSizes: { type: Array, default: () => [12, 24, 36, 48, 60] },
  size: { type: String, default: 'small' }
})
const emit = defineEmits(['update:page', 'update:limit', 'pagination'])

function onChange(nextPage, nextSize) {
  emit('update:page', nextPage)
  if (nextSize !== props.limit) emit('update:limit', nextSize)
  emit('pagination', { page: nextPage, limit: nextSize })
}
</script>

<style scoped>
.pg {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 10px 14px;
  background: var(--panel);
  border-top: 1px solid var(--line);
  border-radius: 0 0 var(--r-lg) var(--r-lg);
}
.pg__total { color: var(--ink-3); font-size: 12px; font-variant-numeric: tabular-nums; }
</style>
