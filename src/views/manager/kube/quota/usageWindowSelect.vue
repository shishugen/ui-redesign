<template>
  <a-select
    :value="modelValue"
    :options="options"
    :loading="loading"
    option-label-prop="label"
    :placeholder="t(placeholder)"
    :allow-clear="clearable"
    :style="{ width: width }"
    show-search
    :filter-option="filterOption"
    @change="handleChange">
    <!-- 角标挂在档位名后面：这一档能不能选与它完不完整是两件事，
         禁用会把「能看但只有这么多天的账」说成「这个功能不能用」 -->
    <template #option="opt">
      <span class="w-item">
        <span class="w-name">{{ opt.label }}</span>
        <span v-if="opt.badge" class="w-badge">{{ opt.badge }}</span>
      </span>
    </template>
  </a-select>
</template>

<script setup>
/**
 * 统计窗口下拉：档位清单与「这一档只有几天数据」的角标都由调用方从 useUsageWindow() 给。
 * <p>
 * 抽成组件是因为三处页面（角色用量、班级用量、学生「我的资源」）都要它，
 * 而角标的算法只要有一份 —— 各自算的话，同一个「近一年」在三个页面上会标出三个天数。
 */
import { t } from '@/i18n'

const props = defineProps({
  /** 当前天数，undefined = 没选窗口 */
  modelValue: { type: Number, default: undefined },
  /** useUsageWindow().windowOptions */
  options: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  placeholder: { type: String, default: '统计窗口' },
  width: { type: String, default: '170px' },
  /** 清空就是「不要窗口列」：与后端 days=null 的老行为一一对应，所以默认允许清 */
  clearable: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'change'])

function filterOption(input, option) {
  return String(option.label || '').includes(input)
}

function handleChange(value) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.w-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* 角标：比档位名轻一档，一眼能看出「这档不全」但不与档位名抢注意力 */
.w-badge {
  font-size: 11.5px;
  color: var(--ink-4);
  background: var(--bg-soft);
  border: 1px solid var(--line-3);
  border-radius: var(--r-xs);
  padding: 0 5px;
  white-space: nowrap;
}

.w-name {
  color: var(--ink-2);
}
</style>
