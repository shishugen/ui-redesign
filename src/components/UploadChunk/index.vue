<template>
  <div class="up">
    <uploader ref="uploaderRef" class="up__box" :options="uploadOptions" :auto-start="autoStart"
              :file-status-text="fileStatusText"
              @file-added="onFileAdded" @file-success="onFileSuccess"
              @file-progress="onFileProgress" @file-error="onFileError">
      <uploader-unsupport>{{ t('您的浏览器不支持上传组件') }}</uploader-unsupport>
      <uploader-drop>
        <div>
          <uploader-btn :attrs="attrs">{{ t('点击选择附件') }}</uploader-btn>
          <button v-if="closeBtn" class="up__btn" type="button" @click="closeCallBack">{{ t('关闭') }}</button>
          <button class="up__btn" type="button" @click="cleanAllUpload">{{ t('清空') }}</button>

          <p class="up__tip">{{ t('将文件拖拽到此处区域，或点击上传') }}</p>
          <p class="up__tip">
            {{ t('文档上限：{doc}MB、视频上限：{video}MB', { doc: documentMaxSize / 1024 / 1024, video: videoMaxSize / 1024 / 1024 }) }}
          </p>
          <p v-if="attrs.accept" class="up__tip">{{ t('仅上传 {ext} 文件', { ext: attrs.accept }) }}</p>
          <p v-if="errorMessage" class="up__err" role="alert">{{ errorMessage }}</p>
        </div>
      </uploader-drop>
      <uploader-list />
    </uploader>
  </div>
</template>

<script setup name="UploadChunk">
import { computed, reactive, ref } from 'vue'
import { md5 } from 'js-md5'
import { getToken } from '@/utils/auth'
import { t } from '@/i18n'

const props = defineProps({
  // 是否自动上传
  autoStart: { type: Boolean, default: true },
  // 唯一标识（参与分片校验）
  uniqueId: { type: String, default: '' },
  // 上传参数
  options: { type: Object, default: () => ({}) },
  // 上传格式（不填默认全部）
  attrs: { type: Object, default: () => ({ accept: '' }) },
  // 默认附件大小 50M
  defaultMaxSize: { type: Number, default: 52428800 },
  // 文档上限 50M
  documentMaxSize: { type: Number, default: 52428800 },
  // 视频上限 500M
  videoMaxSize: { type: Number, default: 524288000 },
  // 图片上限 10M
  imgMaxSize: { type: Number, default: 10485760 },
  // 上传成功回调
  uploadCallBack: { type: Function, default: () => {} },
  closeBtn: { type: Boolean, default: false },
  closeCallBack: { type: Function, default: () => {} }
})

const uploaderRef = ref(null)
const errorMessage = ref('')
const fileStatusText = reactive({
  success: t('上传完成'),
  error: t('上传失败'),
  uploading: t('上传中'),
  paused: t('暂停'),
  waiting: t('等待上传')
})

const uploadOptions = computed(() => ({
  target: '',
  query: {},
  headers: { Authorization: 'Bearer ' + getToken() },
  testChunks: true, // 开启服务器分片校验
  maxChunkRetries: 2,
  simultaneousUploads: 1,
  singleFile: false,
  method: 'multipart',
  allowDuplicateUploads: false,
  chunkSize: '5242880', // 5MB 一片
  forceChunkSize: true,
  limitSize: 0,
  checkChunkUploadedByResponse: checkChunkUploaded,
  processResponse: uploadProcess,
  ...props.options
}))

// 断点续传：后端已存在的分片直接跳过
function checkChunkUploaded(chunk, message) {
  let body = {}
  try { body = JSON.parse(message) } catch (e) { return false }
  if (body.code === 200) return (body.data || []).indexOf(chunk.offset + 1) >= 0
  errorMessage.value = message
  return false
}

// 上传过程中的错误由后端 code 决定
function uploadProcess(raw, done) {
  let body = {}
  try { body = JSON.parse(raw) } catch (e) { done(e ?? raw, raw); return }
  if (body.code === 200) done(null, raw)
  else done(raw, raw)
}

function cleanAllUpload() {
  errorMessage.value = ''
  // 触发组件自带的移除按钮，等价于逐条清空列表
  const els = document.getElementsByClassName('uploader-file-remove')
  Array.prototype.forEach.call(els, (el) => el.click())
}

const DOC_EXT = new Set(['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf', '.txt', '.md', '.csv', '.rtf', '.wps'])
const VIDEO_EXT = new Set(['.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.rmvb', '.m4v', '.webm'])
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'])

function getFileExt(file) {
  const name = file?.name || ''
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.substring(idx).toLowerCase()
}
function getFileType(file) {
  const ext = getFileExt(file)
  if (DOC_EXT.has(ext)) return 'doc'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (IMAGE_EXT.has(ext)) return 'image'
  return 'unknown'
}

// 文件校验：返回前先 pause，通过后再 resume
function onFileAdded(file) {
  errorMessage.value = ''
  file.pause()

  const suffix = getFileExt(file)
  if (props.attrs.accept && !props.attrs.accept.includes(suffix)) {
    errorMessage.value = t('抱歉，此附件格式不支持上传，请上传以下格式的附件：（{ext}）', { ext: props.attrs.accept })
    return
  }

  const type = getFileType(file)
  const rules = {
    doc: [props.documentMaxSize, '抱歉，此文档附件大小超出限制，请上传少于（{mb}）MB的文档'],
    video: [props.videoMaxSize, '抱歉，此视频大小超出限制，请上传少于（{mb}）MB的视频文件'],
    image: [props.imgMaxSize, '抱歉，此图片大小超出限制，请上传少于（{mb}）MB的图片'],
    unknown: [props.defaultMaxSize, '抱歉，此附件大小超出限制，请上传少于（{mb}）MB的附件']
  }[type]

  if (rules && file.size > rules[0]) {
    errorMessage.value = t(rules[1], { mb: rules[0] / 1024 / 1024 })
    return
  }

  // 分片指纹：加盐 uniqueId 后再 md5，避免不同业务同名文件串片
  file.uniqueIdentifier = md5(props.uniqueId + file.uniqueIdentifier)
  file.resume()
}

function onFileSuccess(rootFile, file, response) {
  let body = {}
  try { body = JSON.parse(response) } catch (e) { errorMessage.value = t('上传失败！'); return }
  if (body.code === 200 && body.data) props.uploadCallBack(body)
  else errorMessage.value = body.message || t('上传失败！')
}

function onFileProgress() { /* 进度条由组件渲染 */ }

function onFileError(rootFile, file, response) {
  let body = {}
  try { body = JSON.parse(response) } catch (e) { body = {} }
  errorMessage.value = t('上传失败') + (body.msg ? '：' + body.msg : '')
}
</script>

<style scoped>
.up { width: 100%; }
.up__box {
  padding: 10px; margin: 0 auto; font-size: 12px;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r); box-shadow: var(--sh-1);
}
.up__box :deep(.uploader-btn) {
  display: inline-block; margin-right: 4px; padding: 5px 10px;
  font-size: 12px; line-height: 1; color: #fff; white-space: nowrap;
  background: var(--pri); border: 1px solid var(--pri); border-radius: var(--r-xs);
  cursor: pointer;
}
.up__box :deep(.uploader-list) { max-height: 440px; overflow: auto; }
.up__btn {
  float: right; margin: 0 5px; padding: 4px 10px;
  color: #fff; background: var(--pri-600); border: 0; border-radius: var(--r-xs);
  cursor: pointer; font-size: 12px;
}
.up__tip { margin: 8px 5px; color: var(--ink-3); line-height: 1.6; }
.up__err { margin: 8px 5px; color: var(--danger); }
</style>
