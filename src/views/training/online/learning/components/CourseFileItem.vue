<template>
  <section v-if="learnData.fileList && learnData.fileList.length" class="cgroup">
    <button
      type="button"
      class="cgroup__hd"
      :aria-expanded="!collapsed"
      :title="collapsed ? t('展开《{name}》', { name: learnData.name }) : t('收起《{name}》', { name: learnData.name })"
      @click.stop="toggle()"
    >
      <span class="cgroup__caret" aria-hidden="true">
        <DownOutlined v-if="!collapsed" />
        <RightOutlined v-else />
      </span>
      <span class="cgroup__tag" :class="tagClass">{{ groupLabel }}</span>
      <span v-if="chapterIndex" class="cgroup__idx">{{ chapterIndex }}</span>
      <span class="cgroup__name">{{ learnData.name }}</span>
      <span class="chip cgroup__count">{{ learnData.fileList.length }}</span>
    </button>

    <div v-show="!collapsed" class="cgroup__bd">
      <FileList
        :file-list="learnData.fileList"
        :curr-file="currFile"
        :file-type="fileType"
        :left-width="leftWidth"
        :show-search-list="showSearchList"
        :call-back-learn-file="callBackLearnFile"
      />
    </div>
  </section>
</template>

<script setup name="CourseFileItem">
// 附件分组（课程级 / 章节级 / 课件组）：分组标题可折叠，内部是 FileList。
// 旧页这里有个 `hasChildren` computed 读的是不存在的 props.chapter，且模板从未用到，
// 属于死代码，新页删掉；expandParent 保留为显式方法，供父级将来调用。
import { computed, ref, watch } from 'vue'
import { DownOutlined, RightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import FileList from './FileList/index.vue'

const props = defineProps({
  learnData: {
    type: Object,
    required: true,
    default: () => ({ id: '', name: '', relationType: 0, fileList: [] })
  },
  chapterIndex: { type: [String, Number], default: undefined },
  fileType: { type: Number, default: 0 },
  currFile: { type: Object, default: () => ({ fileId: '' }) },
  leftWidth: { type: Number, default: 100 },
  // 全局展开/折叠开关：null 表示不接管
  forceCollapse: { type: Boolean, default: null },
  // 旧页此处同样未参与判断，保留 prop 只为契约不变
  forceCollapseLevel: { type: Number, default: null },
  showSearchList: { type: Array, default: () => [] },
  callBackLearnFile: { type: Function, default: () => {} }
})

const collapsed = ref(true)

const RELATION = {
  0: { cls: 'pri', label: t('课程') },
  1: { cls: 'ok', label: t('章节') },
  2: { cls: 'warn', label: t('课件') }
}
const meta = computed(() => RELATION[Number(props.learnData.relationType)] || { cls: '', label: '' })
const tagClass = computed(() => meta.value.cls)
const groupLabel = computed(() => meta.value.label)

function toggle() {
  collapsed.value = !collapsed.value
}

/** 展开当前分组（父级递归展开定位时调用） */
function expandParent() {
  collapsed.value = false
}
defineExpose({ expandParent })

watch(
  () => props.forceCollapse,
  (val) => {
    if (val !== null && val !== undefined) collapsed.value = val
  },
  { immediate: true }
)
</script>

<style scoped>
.cgroup + .cgroup { margin-top: 2px; }

.cgroup__hd {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 6px 8px; border: 0; border-radius: var(--r-sm);
  background: transparent; font: inherit; text-align: left; cursor: pointer;
  transition: background .14s ease;
}
.cgroup__hd:hover { background: var(--bg-soft); }
.cgroup__caret { flex: none; display: grid; place-items: center; width: 13px; color: var(--ink-4); font-size: 11px; }

.cgroup__tag {
  flex: none; padding: 1px 6px; border-radius: var(--r-xs);
  font-size: 10.5px; line-height: 15px; font-weight: 500;
  border: 1px solid var(--line-2); background: var(--bg-soft); color: var(--ink-3);
}
.cgroup__tag.pri { border-color: var(--pri-200); background: var(--pri-50); color: var(--pri); }
.cgroup__tag.ok { border-color: var(--ok-line); background: var(--ok-soft); color: var(--ok); }
.cgroup__tag.warn { border-color: var(--warn-line); background: var(--warn-soft); color: var(--warn); }

.cgroup__idx { flex: none; font-family: var(--mono); font-size: 11px; color: var(--ink-4); }
.cgroup__name {
  flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: var(--ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cgroup__count { flex: none; height: 17px; min-width: 18px; font-size: 10.5px; }

.cgroup__bd { padding: 1px 0 4px 19px; }
</style>
