<template>
  <div class="fl">
    <div class="fl__hd">
      <template v-if="!showUpload">
        <a-button type="primary" ghost size="small" :disabled="!canEdit" @click="handleShow">
          <template #icon><CloudUploadOutlined /></template>
          {{ t('上传附件') }}
        </a-button>
        <a-button size="small" @click="getList">
          <template #icon><SyncOutlined /></template>
          {{ t('刷新') }}
        </a-button>
        <div class="fl__hd-r">
          <a-button v-if="!sortFlag" type="primary" ghost size="small"
                    :disabled="fileList.length === 0" @click="openSort">{{ t('设置排序') }}</a-button>
          <a-button v-if="sortFlag" type="primary" ghost size="small" @click="confirmSort">{{ t('确认排序') }}</a-button>
          <a-button v-if="sortFlag" ghost danger size="small" @click="closeSort">{{ t('关闭排序') }}</a-button>
        </div>
      </template>
      <upload-chunk v-if="showUpload" :options="uploadOptions" :document-max-size="10485760"
                    :upload-call-back="handleUploadSuccess" :close-btn="true" :close-call-back="handleHidden" />
    </div>

    <a-spin :spinning="loading">
      <!-- 视频附件 -->
      <template v-if="videoList.length">
        <div class="fl__title">{{ t('视频附件') }}</div>
        <draggable v-model="videoList" item-key="fileId" handle=".fl__drag" ghost-class="fl__ghost">
          <template #item="{ element }">
            <div class="fl__item">
              <span class="fl__drag" :title="t('拖拽调整顺序')" aria-hidden="true">⋮⋮</span>
              <button type="button" class="fl__name" :title="element.fileName" @click="handleView(element)">
                <VideoCameraOutlined v-if="element.fileType == 3" />
                <FilePdfOutlined v-else />
                <span>{{ element.fileName }}</span>
              </button>
              <span class="fl__type">{{ element.fileSuffix }}</span>
              <span class="fl__size">{{ t('大小：') }}{{ formatFileSize(element.fileSize) }}</span>
              <span class="fl__dur">
                <i v-if="element.fileType == 3">{{ t('时长：') }}{{ formatDuration(element.duration) }}</i>
              </span>
              <span class="fl__sort">
                <a-input-number v-if="sortFlag" v-model:value="element.sort" :min="1"
                                :aria-label="t('排序号')" @change="changeSort(element)" />
              </span>
              <span class="fl__acts">
                <a-button type="link" size="small" :disabled="!canEdit" @click="handleView(element)">
                  <template #icon><EyeOutlined /></template>{{ t('预览') }}
                </a-button>
                <a-button type="link" size="small" :disabled="!canEdit" @click="handleUpdate(element)">
                  <template #icon><FormOutlined /></template>{{ t('修改') }}
                </a-button>
                <a-button type="link" danger size="small" :disabled="!canEdit" @click="handleDelete(element)">
                  <template #icon><DeleteOutlined /></template>{{ t('删除') }}
                </a-button>
              </span>
            </div>
          </template>
        </draggable>
      </template>

      <!-- 文档附件 -->
      <template v-if="documentList.length">
        <div class="fl__title">{{ t('文档附件') }}</div>
        <draggable v-model="documentList" item-key="fileId" handle=".fl__drag" ghost-class="fl__ghost">
          <template #item="{ element }">
            <div class="fl__item">
              <span class="fl__drag" :title="t('拖拽调整顺序')" aria-hidden="true">⋮⋮</span>
              <button type="button" class="fl__name" :title="element.fileName" @click="handleView(element)">
                <FilePdfOutlined v-if="element.fileType == 1" />
                <VideoCameraOutlined v-else />
                <span>{{ element.fileName }}</span>
              </button>
              <span class="fl__type">{{ element.fileSuffix }}</span>
              <span class="fl__size">{{ t('大小：') }}{{ formatFileSize(element.fileSize) }}</span>
              <span class="fl__dur" />
              <span class="fl__sort">
                <a-input-number v-if="sortFlag" v-model:value="element.sort" :min="1"
                                :aria-label="t('排序号')" @change="changeSort(element)" />
              </span>
              <span class="fl__acts">
                <a-button type="link" size="small" :disabled="!canEdit" @click="handleView(element)">
                  <template #icon><EyeOutlined /></template>{{ t('预览') }}
                </a-button>
                <a-button type="link" size="small" :disabled="!canEdit" @click="handleUpdate(element)">
                  <template #icon><FormOutlined /></template>{{ t('修改') }}
                </a-button>
                <a-button type="link" danger size="small" :disabled="!canEdit" @click="handleDelete(element)">
                  <template #icon><DeleteOutlined /></template>{{ t('删除') }}
                </a-button>
              </span>
            </div>
          </template>
        </draggable>
      </template>

      <div v-if="!loading && fileList.length === 0" class="fl__empty" role="status">
        <div class="fl__empty-t">{{ t('暂未上传附件') }}</div>
        <div class="fl__empty-d">{{ t('点「上传附件」选择文件，支持分片续传；视频与文档会自动分区显示。') }}</div>
      </div>
    </a-spin>

    <!-- 修改附件信息 -->
    <a-modal :title="title" v-model:open="open" width="650px" @ok="submitForm" @cancel="cancel">
      <a-form ref="fileRef" :model="form">
        <a-form-item :label="t('文件名称')" name="fileName">
          <a-input v-model:value="form.fileName" :placeholder="t('请输入文件名称')" />
        </a-form-item>
        <a-form-item :label="t('排列序号')" name="sort">
          <a-input-number v-model:value="form.sort" :min="1" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 预览抽屉 -->
    <a-drawer :title="drawerTitle" :width="1000" :open="drawer" @close="handleDrawer">
      <file-preview v-if="drawer && currFile.fileType == 1" :file-path="currFile.filePath" :ratio="0.8" />
      <video-player v-if="drawer && currFile.fileType == 3" :video-options="videoOptions" />
    </a-drawer>
  </div>
</template>

<script setup name="FileList">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import draggable from 'vuedraggable'
import {
  SyncOutlined, CloudUploadOutlined, FilePdfOutlined, VideoCameraOutlined,
  DeleteOutlined, EyeOutlined, FormOutlined
} from '@ant-design/icons-vue'
import { getFile, updateFile, delFile, addFile, findListFile } from '@/api/course/file.js'
import { uploadChunkUrl, previewUrl } from '@/api/cloud/file.js'
import { getToken } from '@/utils/auth.js'
import { formatDuration, formatFileSize } from '@/utils/aigc.js'
import { t } from '@/i18n'
import FilePreview from '@/components/FilePreview/index.vue'
import VideoPlayer from '@/components/VideoPlay/index.vue'
import UploadChunk from '@/components/UploadChunk/index.vue'

const props = defineProps({
  courseId: { type: [String, Number], required: true },
  chapterId: { type: [String, Number], required: false },
  relationType: { type: [String, Number], required: false, default: 0 },
  fileType: { type: Number, default: 0 },
  canEdit: { type: Boolean, default: false }
})

const loading = ref(false)
const showUpload = ref(false)
const open = ref(false)
const title = ref('')
const drawer = ref(false)
const drawerTitle = ref('')
const fileRef = ref(null)
const sortFlag = ref(false)

const fileList = ref([])
const documentList = ref([])
const videoList = ref([])
const currFile = ref({ fileId: '', fileType: 0, filePath: '' })

const videoOptions = reactive({
  width: document.documentElement.clientWidth * 0.5 + 'px',
  height: document.documentElement.clientHeight - 200 + 'px',
  currentTime: 0,
  autoPlay: false,
  src: '',
  type: 'video/mp4'
})

const uploadOptions = reactive({ target: uploadChunkUrl })

const form = ref({})

function handleShow() { showUpload.value = true }
function handleHidden() { showUpload.value = false }

async function getList() {
  loading.value = true
  try {
    const res = await findListFile({
      orderByColumn: 'sort',
      isAsc: 'asc',
      courseId: props.courseId,
      chapterId: props.chapterId,
      relationType: props.relationType
    })
    fileList.value = res?.rows || []
    documentList.value = fileList.value.filter((i) => i.fileType == 1)
    videoList.value = fileList.value.filter((i) => i.fileType == 3)
  } catch (e) {
    fileList.value = []; documentList.value = []; videoList.value = []
  } finally { loading.value = false }
}

function reset() {
  form.value = {
    fileId: null, courseId: null, chapterId: null, fileName: null,
    fileType: null, fileSize: null, fileSuffix: null, duration: null,
    filePath: null, sort: null
  }
  fileRef.value?.clearValidate?.()
}
function cancel() { open.value = false; reset() }

function handleView(row) {
  drawer.value = true
  drawerTitle.value = t('预览')
  currFile.value = row
  const { protocol, host } = window.location
  videoOptions.src = protocol + '//' + host + previewUrl + row.filePath
}
function handleDrawer() {
  currFile.value = { fileId: '', fileType: 0, filePath: '' }
  videoOptions.src = ''
  drawer.value = false
}

async function handleUpdate(row) {
  reset()
  try {
    const res = await getFile(row.fileId)
    form.value = res?.data || {}
    open.value = true
    title.value = t('修改课程附件')
  } catch (e) { /* 拦截器已提示 */ }
}

async function handleDelete(row) {
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认删除附件「{name}」吗？', { name: row.fileName || '' }),
    okText: t('确定'),
    cancelText: t('取消'),
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await delFile(row.fileId)
        message.success(t('删除成功'))
        getList()
      } catch (e) { /* 拦截器已提示 */ }
    }
  })
}

async function submitForm() {
  try {
    await fileRef.value.validate()
    if (form.value.fileId != null) {
      await updateFile(form.value)
      message.success(t('修改成功'))
    } else {
      await addFile(form.value)
      message.success(t('新增成功'))
    }
    open.value = false
    getList()
  } catch (e) { /* 校验或接口失败，拦截器已提示 */ }
}

// 分片上传成功后落库
async function handleUploadSuccess(res) {
  if (res?.code != 200 || !res.data) return
  const payload = {
    courseId: props.courseId,
    chapterId: props.chapterId,
    relationType: props.relationType,
    fileName: res.data.fileName,
    fileType: res.data.fileType,
    fileSize: res.data.fileSize,
    fileSuffix: res.data.fileSuffix,
    duration: res.data.duration,
    filePath: res.data.filePath,
    sort: fileList.value.length + 1
  }
  try {
    await addFile(payload)
    message.success(t('上传成功'))
    getList()
  } catch (e) { /* 拦截器已提示 */ }
}

// 排序号即时保存（旧页同一行为：拖拽不落库，序号输入立即 updateFile）
function changeSort(file) {
  updateFile(file).catch(() => { /* 拦截器已提示 */ })
}

function openSort() { sortFlag.value = true }
function confirmSort() { message.success(t('操作成功')); sortFlag.value = false; getList() }
function closeSort() { sortFlag.value = false }

onMounted(() => { if (props.courseId) getList() })
</script>

<style scoped>
.fl {
  margin-top: 5px; margin-bottom: 5px; padding: 14px;
  background: var(--bg-soft); border: 1px solid var(--line-3); border-radius: var(--r);
}
.fl__hd { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.fl__hd-r { margin-left: auto; display: flex; gap: 6px; }
.fl__title { margin: 8px 4px 8px; font-size: 12.5px; font-weight: 650; color: var(--pri); }

.fl__item {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 9px; margin-bottom: 8px;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-sm); transition: border-color .16s ease;
}
.fl__item:hover { border-color: var(--pri-200); }
.fl__drag { flex: none; color: var(--ink-4); cursor: move; letter-spacing: -2px; padding: 0 4px; }
.fl__ghost { opacity: .45; }
.fl__name {
  flex: 1; min-width: 160px; display: flex; align-items: center; gap: 6px;
  background: none; border: 0; padding: 0; cursor: pointer; text-align: left;
  font-size: 13px; color: var(--pri-ink);
}
.fl__name span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fl__name:hover span { text-decoration: underline; }
.fl__type, .fl__size, .fl__dur { flex: none; width: 100px; font-size: 12px; color: var(--ink-3); }
.fl__dur { width: 140px; }
.fl__sort { flex: none; width: 90px; }
.fl__acts { flex: none; display: flex; gap: 2px; padding-left: 8px; }
.fl__empty { padding: 30px 12px; text-align: center; }
.fl__empty-t { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.fl__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }

@media (max-width: 1180px) {
  .fl__dur { display: none; }
}
</style>
