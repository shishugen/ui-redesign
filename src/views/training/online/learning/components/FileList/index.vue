<template>
  <ul v-if="visibleFiles.length" class="flist">
    <li v-for="file in visibleFiles" :key="file.fileId">
      <button
        type="button"
        class="flist__row"
        :class="{ 'is-active': String(currFile.fileId) === String(file.fileId) }"
        :aria-current="String(currFile.fileId) === String(file.fileId) ? 'true' : 'false'"
        :title="t('点击学习《{name}》', { name: file.fileName })"
        @click.stop="callBackLearnFile(file.fileId)"
      >
        <span class="flist__ico" aria-hidden="true"><component :is="getFileIcon(file.fileSuffix)" /></span>
        <span class="flist__name">{{ file.fileName }}</span>
      </button>
    </li>
  </ul>
  <div v-else class="flist__empty" role="status">{{ t('暂无附件') }}</div>
</template>

<script setup name="FileList">
// 附件行列表：文件名 + 后缀图标 + 当前选中态。
// 旧页用 div + @click，键盘不可达；这里换成原生 button（回车/空格都能打开）。
import { computed } from 'vue'
import {
  FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FileImageOutlined,
  FileJpgOutlined, VideoCameraOutlined, FileZipOutlined, FolderOutlined, FilePptOutlined
} from '@ant-design/icons-vue'
import { t } from '@/i18n'

const props = defineProps({
  fileList: { type: Array, default: () => [] },
  currFile: { type: Object, default: () => ({ fileId: '' }) },
  leftWidth: { type: Number, default: 100 },
  // 搜索命中的 fileId 集合；空数组表示不过滤（与旧页口径一致）
  showSearchList: { type: Array, default: () => [] },
  callBackLearnFile: { type: Function, default: () => {} }
})

const ICONS = {
  pdf: FilePdfOutlined,
  doc: FileWordOutlined,
  docx: FileWordOutlined,
  xls: FileExcelOutlined,
  xlsx: FileExcelOutlined,
  ppt: FilePptOutlined,
  pptx: FilePptOutlined,
  png: FileImageOutlined,
  jpg: FileJpgOutlined,
  jpeg: FileJpgOutlined,
  gif: FileImageOutlined,
  mp4: VideoCameraOutlined,
  mov: VideoCameraOutlined,
  zip: FileZipOutlined,
  rar: FileZipOutlined
}
const getFileIcon = (suffix) => ICONS[String(suffix || '').toLowerCase()] || FolderOutlined

const visibleFiles = computed(() => {
  const list = props.fileList || []
  const hit = props.showSearchList || []
  if (!hit.length) return list
  return list.filter((f) => hit.includes(f.fileId))
})
</script>

<style scoped>
.flist { list-style: none; margin: 0; padding: 0; }

.flist__row {
  display: flex; align-items: center; gap: 7px; width: 100%;
  padding: 6px 8px; margin-bottom: 2px;
  border: 0; border-radius: var(--r-sm); background: transparent;
  font: inherit; font-size: 12.5px; color: var(--ink-2);
  text-align: left; cursor: pointer;
  transition: background .14s ease, color .14s ease;
}
.flist__row:hover { background: var(--pri-50); color: var(--pri-ink); }
.flist__row.is-active { background: var(--pri-100); color: var(--pri-ink); font-weight: 600; }

.flist__ico { flex: none; display: grid; place-items: center; width: 15px; color: var(--pri); font-size: 13px; }
.flist__row.is-active .flist__ico { color: var(--pri-600); }
.flist__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.flist__empty { padding: 14px 10px; font-size: 12px; color: var(--ink-4); text-align: center; }
</style>
