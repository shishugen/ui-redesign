<template>
  <!-- B02 同名新写：保留旧组件契约（value 为逗号拼接编码串，multiple 时多选） -->
  <a-cascader
    v-model:value="fullPathArr"
    class="cascader-plus"
    :class="tagColor ? 'tag-' + tagColor : ''"
    :options="options"
    :field-names="fieldNames"
    :multiple="multiple"
    :show-search="{ filter: filterOption }"
    :placeholder="placeholder"
    :expand-trigger="expandTrigger"
    :size="size"
    :style="cascaderStyle"
    :dropdown-style="dropdownStyle"
    allow-clear
    @change="handleCascaderChange"
  >
    <template #suffixIcon><component :is="customIcon" /></template>
  </a-cascader>
</template>

<script setup>
import { ref, watch } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  value: { type: String, default: '' },
  options: { type: Array, required: true },
  fieldNames: {
    type: Object,
    default: () => ({ value: 'value', label: 'label', children: 'children' })
  },
  multiple: { type: Boolean, default: false },
  placeholder: { type: String, default: '请选择' },
  expandTrigger: { type: String, default: 'hover' },
  size: { type: String, default: 'default' },
  cascaderStyle: { type: Object, default: () => ({}) },
  dropdownStyle: { type: Object, default: () => ({}) },
  tagColor: { type: String, default: '' },
  customIcon: { type: [Function, Object], default: () => SearchOutlined }
})
const emit = defineEmits(['update:value', 'change'])

const fullPathArr = ref([])
const getFieldKeys = () => {
  const { value: valKey, label: labKey, children: childKey } = props.fieldNames
  return { valKey, labKey, childKey }
}
const getFullPathByCode = (tree, targetCode, path = []) => {
  const { valKey, childKey } = getFieldKeys()
  for (const node of tree || []) {
    const currPath = [...path, node[valKey]]
    if (String(node[valKey]) === String(targetCode)) return currPath
    if (node[childKey]?.length) {
      const res = getFullPathByCode(node[childKey], targetCode, currPath)
      if (res) return res
    }
  }
  return null
}
const filterOption = (input, option) => {
  const { labKey } = getFieldKeys()
  return String(option[labKey] ?? '').toLowerCase().indexOf(String(input).toLowerCase()) >= 0
}
const handleCascaderChange = (pathArr) => {
  fullPathArr.value = pathArr || []
  if (!pathArr?.length) {
    emit('update:value', '')
    emit('change', '')
    return
  }
  const lastCodes = props.multiple
    ? pathArr.map(item => item.at(-1))
    : [pathArr.at(-1)]
  emit('update:value', lastCodes.join(','))
  emit('change', lastCodes.join(','))
}
watch(() => props.value, (newVal) => {
  if (!newVal) { fullPathArr.value = []; return }
  const codeList = String(newVal).split(',').filter(Boolean)
  fullPathArr.value = props.multiple
    ? codeList.map(code => getFullPathByCode(props.options, code)).filter(Boolean)
    : (getFullPathByCode(props.options, codeList[0]) || [])
}, { immediate: true })
</script>

<style scoped>
.cascader-plus { width: 100%; }
:deep(.ant-select-selection-item) { background: var(--pri-50); border-color: var(--pri-100); }
</style>
