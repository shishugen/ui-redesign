<template>
  <div class="cc2">
    <!-- 头部工具栏 -->
    <div class="cc2__hd">
      <div class="cc2__hd-l">
        <a-button type="primary" size="small" :disabled="!canEdit" @click="handleAdd('', '', 0)">
          <template #icon><PlusOutlined /></template>
          {{ t('添加章节') }}
        </a-button>
        <a-button type="primary" size="small" @click="getList">
          <template #icon><SyncOutlined /></template>
          {{ t('刷新章节') }}
        </a-button>
      </div>
      <div class="cc2__hd-r">
        <template v-if="!sortFlag">
          <a-button type="primary" ghost size="small" :disabled="!chapterData.length" @click="openSort">
            {{ t('设置排序') }}
          </a-button>
        </template>
        <template v-else>
          <a-button type="primary" ghost size="small" @click="confirmSort">{{ t('确认排序') }}</a-button>
          <a-button ghost danger size="small" @click="closeSort">{{ t('关闭排序') }}</a-button>
        </template>
        <a-button size="small" :disabled="!chapterData.length" :aria-label="expandLabel" @click="handleExpand">
          <template #icon>
            <UpOutlined v-if="!forceCollapse" />
            <DownOutlined v-else />
          </template>
          {{ forceCollapse ? t('展开') : t('折叠') }}
        </a-button>
      </div>
    </div>

    <!-- 章节树 -->
    <div class="cc2__body">
      <ChapterTreeItems
        v-for="(chapter, index) in chapterTreeData"
        :key="chapter.chapterId"
        show-type="chapter"
        :chapter="chapter"
        :course-classify="currCourse.classify"
        :chapter-index="String(index + 1)"
        :sort-flag="sortFlag"
        :force-collapse="forceCollapse"
        :force-collapse-level="forceCollapseLevel"
        :parent-name="currCourse.courseName"
        :can-edit="canEdit"
        :callback-add="handleAdd"
        :callback-view="handleView"
        :callback-update="handleUpdate"
        :callback-delete="handleDelete"
        :callback-set-sort="handleSetSort"
        :callback-set-config="handleSetConfig"
      />
      <div v-if="!chapterTreeData.length" class="cc2__empty" role="status">
        <div class="cc2__empty-t">{{ t('还没有章节') }}</div>
        <div class="cc2__empty-d">{{ t('点「添加章节」建立第一级章节，再在章节上「添加子级」建下级。') }}</div>
      </div>
    </div>

    <!-- 章节预览抽屉 -->
    <a-drawer v-model:open="viewDrawer" :title="viewTitle" :width="drawerWidth" @close="cancelView">
      <div class="cc2__view" :style="{ height: drawerHeight + 'px' }">
        <Preview v-if="viewForm.content" :content="viewForm.content" :height="drawerHeight" />
        <div v-else class="cc2__empty" role="status">
          <div class="cc2__empty-t">{{ t('暂无内容') }}</div>
          <div class="cc2__empty-d">{{ t('该章节还没有正文。') }}</div>
        </div>
      </div>
      <template #extra>
        <a-button danger @click="cancelView">{{ t('关闭') }}</a-button>
      </template>
    </a-drawer>

    <!-- 章节编辑抽屉 -->
    <a-drawer v-model:open="open" :title="dialogTitle" :width="drawerWidth"
              :closable="false" :mask-closable="false" @close="cancel">
      <a-form ref="chapterRef" class="cc2__form" :model="form" :rules="rules" layout="inline"
              :style="{ height: drawerHeight + 'px' }">
        <a-form-item :label="t('章节名称')" name="chapterName">
          <a-input ref="chapterNameRef" v-model:value="form.chapterName" :placeholder="t('请输入名称')"
                   style="width: 300px" />
        </a-form-item>
        <a-form-item :label="t('序号')" name="sort">
          <a-input-number v-model:value="form.sort" :min="1" style="width: 84px" />
        </a-form-item>

        <a-form-item>
          <a-upload :accept="mdAccept" :show-upload-list="false" :before-upload="handleBeforeUpload">
            <a-button>
              <template #icon><ImportOutlined /></template>
              {{ t('Markdown 文件导入') }}
            </a-button>
          </a-upload>
        </a-form-item>
        <a-form-item>
          <a-button :disabled="!form.content" @click="openImportImg">
            <template #icon><FileImageOutlined /></template>
            {{ t('Markdown 图片导入') }}
          </a-button>
        </a-form-item>

        <div class="cc2__editor" :style="{ height: ueditorHeight + 'px' }">
          <vue-ueditor-wrap v-if="open" :editor-id="editorId" v-model="form.content"
                            :config="editorConfig"
                            :editor-dependencies="['ueditor.config.js', 'ueditor.all.js']"
                            @ready="ready" />
        </div>
      </a-form>
      <template #extra>
        <a-space>
          <a-button type="primary" disabled :title="t('AI 生成组件将在后续批次迁移')"
                    :aria-label="t('AI 生成内容（待迁移）')">
            <template #icon><RobotOutlined /></template>
            {{ t('AI 生成内容') }}
          </a-button>
          <a-button type="primary" disabled :title="t('AI 生成组件将在后续批次迁移')"
                    :aria-label="t('AI 一键生成（待迁移）')">
            <template #icon><RobotOutlined /></template>
            {{ t('AI 一键生成') }}
          </a-button>
          <a-button danger size="small" :title="t('关闭')" style="margin-left: 28px" @click="cancel">
            <template #icon><CloseOutlined /></template>
          </a-button>
        </a-space>
      </template>
      <template #footer>
        <div class="cc2__ft">
          <a-button type="primary" @click="submitForm">{{ t('保存章节') }}</a-button>
          <div class="cc2__ft-r">
            <a-button type="primary" ghost :disabled="!form.chapterName || !form.content" @click="openSaveCopy">
              {{ t('保存副本') }}
            </a-button>
            <a-button type="primary" ghost :disabled="!form.chapterId" @click="openCopyView">
              {{ t('查看副本') }}
            </a-button>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- Markdown 图片导入 -->
    <a-modal v-model:open="importImgState" :title="t('Markdown 图片导入')" :footer="null" @cancel="closeImportImg">
      <p class="cc2__hint">{{ t('上传图片后会按文件名自动替换正文里同名的 Markdown 图片引用。') }}</p>
      <upload-chunk :options="options" :attrs="attrs" :unique-id="String(form.chapterId || '')"
                    :upload-call-back="uploadResult" :close-btn="true" :close-call-back="closeImportImg" />
    </a-modal>

    <!-- 保存副本 -->
    <a-modal v-model:open="copyModal" :title="t('系统提示')" :width="550" :mask-closable="false"
             @ok="confirmCopy" @cancel="closeSaveCopy">
      <h2 class="cc2__copy-title">{{ t('确定保存当前章节内容为副本吗？') }}</h2>
      <a-form ref="copyRef" :model="copyForm" :rules="copyRules">
        <a-form-item :label="t('副本标题')" name="title">
          <a-input v-model:value="copyForm.title" :placeholder="t('请输入标题')" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 副本列表 -->
    <a-modal v-model:open="copyViewVisible" :title="t('章节副本')" :width="previewWidth"
             :footer="null" style="top: 30px" @cancel="closeCopyView">
      <a-tabs v-model:activeKey="currPreviewKey" @change="handleTabChange">
        <a-tab-pane v-for="item in copyList" :key="item.contentId" :tab="item.title" />
      </a-tabs>
      <div v-if="!copyList.length" class="cc2__empty" role="status">
        <div class="cc2__empty-t">{{ t('暂无副本') }}</div>
        <div class="cc2__empty-d">{{ t('在章节编辑里点「保存副本」后，这里会列出历史版本。') }}</div>
      </div>

      <div v-else-if="currCopy.contentId" class="cc2__copy">
        <div class="cc2__copy-hd">
          <span class="cc2__copy-time">{{ t('于 {time} 创建', { time: currCopy.createTime }) }}</span>
          <div class="cc2__copy-titlebox">
            <span v-if="!currCopy.hasEdit">{{ currCopy.title }}</span>
            <template v-else>
              <a-input v-model:value="currCopy.title" :placeholder="t('请输入标题')" style="width: 200px" />
              <a-button type="primary" size="small" @click="confirmSaveCopy">{{ t('确认') }}</a-button>
              <a-button type="primary" danger size="small" @click="cancelEditCopy">{{ t('取消') }}</a-button>
            </template>
          </div>
          <div class="cc2__copy-acts">
            <a-button type="primary" size="small" @click="useVersion">{{ t('采用') }}</a-button>
            <a-button type="primary" size="small" :disabled="currCopy.hasEdit" @click="toEditCopy">
              {{ t('编辑') }}
            </a-button>
            <a-button type="primary" danger size="small" @click="deleteCopy">{{ t('删除') }}</a-button>
          </div>
        </div>
        <div ref="copyContentPanel" class="cc2__copy-body" @scroll="handleCopyScroll">
          <div v-if="!currCopy.hasEdit" v-html="renderMarkdown(currCopy.content)" />
          <vue-ueditor-wrap v-else :editor-id="copyEditorId" v-model="currCopy.content"
                            :config="editorConfig"
                            :editor-dependencies="['ueditor.config.js', 'ueditor.all.js']"
                            @ready="copyReady" />
        </div>
      </div>
    </a-modal>

    <!-- 删除确认 -->
    <a-modal v-model:open="deleteModal" :title="t('删除章节')" :width="560" @ok="confirmDelete" @cancel="cancelDelete">
      <p>{{ deleteTips }}</p>
      <a-form v-if="deleteForm.chapterId" ref="deleteChapterRef" :model="deleteForm" :rules="deleteRules">
        <a-form-item :label="t('请输入章节名确认')" name="confirmTxt">
          <a-input v-model:value="deleteForm.confirmTxt" :placeholder="deleteForm.chapterName" />
        </a-form-item>
      </a-form>
      <p v-if="deleteForm.chapterId" class="cc2__hint">{{ t('该章节含子章节，删除会连带删除全部子级。') }}</p>
    </a-modal>
  </div>
</template>

<script setup name="CourseChapter">
import { ref, reactive, computed, onMounted, toRefs } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined, SyncOutlined, UpOutlined, DownOutlined, RobotOutlined,
  CloseOutlined, ImportOutlined, FileImageOutlined
} from '@ant-design/icons-vue'
import { VueUeditorWrap } from 'vue-ueditor-wrap'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import {
  getChapter, addChapter, updateChapter, delChapterById
} from '@/api/course/chapter.js'
import { addContent, findListContent, updateContent, delContent } from '@/api/course/chapterContent.js'
import * as courseCreationApi from '@/api/apt/courseCreation'
import { previewUrl, uploadChunkUrl, ueditorUrl } from '@/api/cloud/file.js'
import { getToken } from '@/utils/auth.js'
import { getUserId } from '@/utils/user'
import { t } from '@/i18n'
import Preview from '@/components/Preview/index.vue'
import UploadChunk from '@/components/UploadChunk/index.vue'
import ChapterTreeItems from '../components/ChapterTreeItems.vue'

const props = defineProps({
  currCourse: { type: Object, default: () => ({ courseId: '', courseName: '', classify: 0 }), required: true },
  chapterData: { type: Array, default: () => [] },
  chapterTreeData: { type: Array, default: () => [] },
  canEdit: { type: Boolean, default: false },
  callBackRefreshChapter: { type: Function, default: () => {} }
})

const userId = ref(getUserId())

/* ---------- 状态 ---------- */
const open = ref(false)
const dialogTitle = ref('')
const viewDrawer = ref(false)
const viewTitle = ref('')
const drawerWidth = ref(0)
const drawerHeight = ref(0)
const ueditorHeight = ref(0)
const previewWidth = ref(0)
const sortFlag = ref(false)
const forceCollapse = ref(true)
const forceCollapseLevel = ref(0)

const importImgState = ref(false)
const copyModal = ref(false)
const copyViewVisible = ref(false)
const currPreviewKey = ref('')
const copyList = ref([])
const currCopy = ref({})
const deleteModal = ref(false)
const deleteTips = ref('')
const deleteChapterIds = ref(null)

const chapterRef = ref(null)
const chapterNameRef = ref(null)
const copyRef = ref(null)
const deleteChapterRef = ref(null)
const copyContentPanel = ref(null)
const editorInstance = ref(null)
const editorId = ref('chapter-editor-' + Date.now())
const copyEditorId = ref('copy-editor-' + Date.now())
const contentChange = ref(0)
const tempName = ref('')
const tempContent = ref('')

const data = reactive({
  form: {},
  viewForm: {},
  deleteForm: { chapterId: '', chapterName: '', confirmTxt: '' },
  copyForm: {},
  rules: {
    chapterName: [{ required: true, message: t('请输入章节名称'), trigger: 'blur' }]
  },
  deleteRules: {
    confirmTxt: [{ required: true, trigger: 'blur', validator: checkConfirm }]
  },
  copyRules: {
    title: [{ required: true, message: t('请输入副本标题'), trigger: 'blur' }]
  }
})
const { form, viewForm, deleteForm, copyForm, rules, deleteRules, copyRules } = toRefs(data)

const expandLabel = computed(() => (forceCollapse.value ? t('展开全部章节') : t('折叠全部章节')))

/* ---------- UEditor 配置 ---------- */
const editorConfig = ref({
  UEDITOR_HOME_URL: '/UEditorPlus/',
  UEDITOR_CORS_URL: '/UEditorPlus/',
  initialStyle: 'body p{line-height:1.8em; margin: 0 ;} h1,h2,h3,h4,blockquote{margin: 0 ;} body table{margin: 0 ;}',
  autoFloatEnabled: false,
  initialFrameWidth: 1000,
  initialFrameHeight: 320,
  autoHeightEnabled: false,
  maximumWords: 1000000,
  serverUrl: ueditorUrl,
  serverHeaders: { Authorization: 'Bearer ' + getToken(), Token: getToken() },
  imageConfig: { disableOnline: true },
  // UEditorPlus 的 simpleupload 插件会读 imageAllowFiles 并 .join()，
  // 默认配置里没有该项 → 打开编辑器抛 TypeError。这里显式给值（旧页同样报错，未处理）
  imageAllowFiles: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
  // UEditorPlus 的 simpleupload 插件会读 imageAllowFiles 并 .join()，
  // 默认配置里没有该项 → 打开编辑器抛 TypeError。这里显式给值（旧页同样报错，未处理）
  imageAllowFiles: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
  toolbars: [[
    'fullscreen', 'source', 'undo', 'redo', '|',
    'bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript',
    'removeformat', 'autotypeset', 'pasteplain', '|',
    'forecolor', 'backcolor', 'insertorderedlist', 'insertunorderedlist', 'cleardoc', '|',
    'paragraph', 'fontfamily', 'fontsize', 'insertcode', 'indent', '|',
    'justifyleft', 'justifycenter', 'justifyright', 'justifyjustify', '|',
    'touppercase', 'tolowercase', '|',
    'link', 'unlink', 'simpleupload', 'insertimage', 'emotion', 'pagebreak',
    'template', 'background', 'formula', '|',
    'horizontal', 'spechars', 'inserttable', 'contentimport', 'preview', 'searchreplace', 'help'
  ]],
  shortcutMenu: [],
  focus: true
})

/* ---------- 上传 / MD ---------- */
const mdAccept = ref('.md')
const options = reactive({ target: uploadChunkUrl, query: {}, headers: { Authorization: 'Bearer ' + getToken() } })
const attrs = reactive({ accept: '.png,.jpg,.jpeg' })
const markdownImgList = ref([])
const imgSrcList = ref([])

/* ---------- 基础操作 ---------- */
function handleExpand() { forceCollapse.value = !forceCollapse.value }
function openSort() { sortFlag.value = true }
function confirmSort() { message.success(t('操作成功')); sortFlag.value = false; getList() }
function closeSort() { sortFlag.value = false }
function getList() { props.callBackRefreshChapter() }

function reset() {
  form.value = {
    chapterId: null,
    courseId: props.currCourse.courseId,
    chapterName: '',
    parentId: '0',
    level: 0,
    period: 5,
    content: '',
    hasConfig: 0,
    hasFile: 0,
    sort: 1
  }
}

function handleAdd(row, parentName, sort) {
  reset()
  if (row && row.chapterId) {
    form.value.parentId = row.chapterId
    form.value.level = Number(row.level || 0) + 1
    form.value.sort = sort
    dialogTitle.value = t('添加章节：{parent}', { parent: parentName })
  } else {
    dialogTitle.value = t('添加章节：{parent}', { parent: props.currCourse.courseName || '' })
    form.value.sort = props.chapterTreeData.length + 1
  }
  contentChange.value = 0
  open.value = true
}

function handleView(row, parentName) {
  viewForm.value = {}
  viewTitle.value = t('预览：{parent}', { parent: parentName })
  getChapter(row.chapterId)
    .then((res) => { viewForm.value = res?.data || {}; viewDrawer.value = true })
    .catch(() => { /* 拦截器已提示 */ })
}
function cancelView() { viewForm.value = {}; viewDrawer.value = false }

function handleUpdate(row, parentName) {
  reset()
  dialogTitle.value = t('编辑：{parent}', { parent: parentName })
  getChapter(row.chapterId)
    .then((res) => {
      form.value = res?.data || {}
      matchMdImg()
      contentChange.value = 0
      open.value = true
    })
    .catch(() => { /* 拦截器已提示 */ })
}

function handleDelete(row) {
  deleteTips.value = t('确认删除章节《{name}》吗？', { name: row.chapterName || '' })
  deleteChapterIds.value = row.chapterId
  if (row.children && row.children.length > 0) {
    deleteForm.value.chapterId = row.chapterId
    deleteForm.value.chapterName = row.chapterName
  }
  deleteModal.value = true
}

function checkConfirm(rule, value, callback) {
  if (!deleteForm.value.confirmTxt || deleteForm.value.confirmTxt !== deleteForm.value.chapterName) {
    callback(new Error(t('请输入正确的内容')))
  } else callback()
}

function confirmDelete() {
  if (deleteForm.value.chapterId) {
    deleteChapterRef.value.validate().then(toDelete).catch(() => {})
  } else toDelete()
}

function cancelDelete() {
  deleteChapterIds.value = ''
  deleteForm.value = { chapterId: '', chapterName: '', confirmTxt: '' }
  deleteModal.value = false
}

function toDelete() {
  const id = deleteChapterIds.value
  delChapterById(id)
    .then(() => {
      message.success(t('删除成功'))
      getList()
      handleDeleteAi(id)
      cancelDelete()
    })
    .catch(() => { /* 拦截器已提示 */ })
}

// 顺手清理 AI 生成的同名章节映射（旧页逻辑，失败不影响主流程）
function handleDeleteAi(chapterId) {
  if (!chapterId) return
  courseCreationApi.getChapterByChapterId(chapterId)
    .then((res) => { if (res?.data?.id) courseCreationApi.deleteCourseChapter(res.data.id) })
    .catch(() => {})
}

function handleSetSort(row) {
  updateChapter(row).catch(() => { /* 拦截器已提示 */ })
}

function handleSetConfig(row) {
  const payload = { ...row, hasConfig: Number(row.hasConfig) === 1 ? 0 : 1 }
  updateChapter(payload)
    .then(() => { row.hasConfig = payload.hasConfig; message.success(t('操作成功')) })
    .catch(() => { /* 拦截器已提示 */ })
}

function submitForm() {
  chapterRef.value.validate()
    .then(() => {
      if (!form.value.chapterName) {
        message.warning(t('请输入章节名称'))
        chapterNameRef.value?.focus()
        return
      }
      const req = form.value.chapterId != null ? updateChapter(form.value) : addChapter(form.value)
      return req.then(() => {
        message.success(form.value.chapterId != null ? t('修改成功') : t('新增成功'))
        open.value = false
        getList()
      })
    })
    .catch(() => { /* 校验或接口失败 */ })
}

function cancel() {
  if (contentChange.value > 1) {
    Modal.confirm({
      title: t('系统提示'),
      content: t('章节内容已发生改变，是否确认保存当前内容？'),
      okText: t('保存'),
      cancelText: t('不保存'),
      onOk: () => submitForm(),
      onCancel: () => { open.value = false; reset() }
    })
  } else {
    open.value = false
    reset()
  }
}

/* ---------- Markdown ---------- */
function renderMarkdown(content) {
  if (!content) return ''
  return marked.parse(content)
}

function ready(editor) {
  editorInstance.value = editor
  contentChange.value = 0
  editor.addListener('contentchange', () => { contentChange.value++ })
}
function copyReady(editor) { editorInstance.value = editor }

// 前端读 .md → HTML → 追加进编辑器（多文件可依次导入）
function handleBeforeUpload(file) {
  if (!/\.md$/i.test(file.name)) {
    message.error(t('仅支持上传 .md 格式的 Markdown 文件'))
    return false
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    const html = renderMarkdown(e.target?.result || '')
    const prev = editorInstance.value ? editorInstance.value.getContent() : (form.value.content || '')
    const next = prev + (prev ? '<p><br/></p>' : '') + html
    if (editorInstance.value) editorInstance.value.setContent(next)
    form.value.content = next
    message.success(t('已导入：{name}', { name: file.name }))
  }
  reader.onerror = () => message.error(t('文件读取失败，请重试'))
  reader.readAsText(file, 'UTF-8')
  return false
}

function openImportImg() { importImgState.value = true }
function closeImportImg() { importImgState.value = false }

// 记录正文里已有的 MD 图片引用与 <img src>，供上传后按文件名替换
function matchMdImg() {
  markdownImgList.value = []
  imgSrcList.value = []
  const text = form.value.content || ''
  if (!text) return
  markdownImgList.value = text.match(/\]\(([\s\S]*?)\)/g) || []
  imgSrcList.value = text.match(/(?<=(img src="))[^"]*?(?=")/gims) || []
}

function fileNameOf(raw) {
  const s = String(raw)
  if (s.lastIndexOf('\\') > -1) return s.substring(s.lastIndexOf('\\') + 1).replace(/\)$/, '')
  if (s.lastIndexOf('/') > -1) return s.substring(s.lastIndexOf('/') + 1).replace(/\)$/, '')
  return s.substring(s.lastIndexOf('(') + 1).replace(/\)$/, '')
}

function applyUploadedImage(uploadFilePath, fileName) {
  markdownImgList.value.some((item) => {
    if (fileNameOf(item) === fileName) {
      form.value.content = form.value.content.replace(item, '](' + uploadFilePath + ')')
      return true
    }
    return false
  })
  imgSrcList.value.some((img) => {
    if (fileNameOf(img) === fileName) {
      form.value.content = form.value.content.replace(img, uploadFilePath)
      return true
    }
    return false
  })
}

function uploadResult(obj) {
  if (obj?.code !== 200 || !obj.data) return
  const uploadFilePath = previewUrl + obj.data.filePath
  applyUploadedImage(uploadFilePath, obj.data.fileName)
  message.success(t('上传图片《{name}》成功！', { name: obj.data.fileName }))
}

/* ---------- 副本 ---------- */
function openSaveCopy() {
  copyForm.value = {
    chapterId: form.value.chapterId,
    title: form.value.chapterName,
    content: form.value.content,
    type: 0,
    userId: userId.value
  }
  copyModal.value = true
}
function closeSaveCopy() { copyForm.value = {}; copyModal.value = false }

function confirmCopy() {
  copyRef.value.validate()
    .then(() => addContent(copyForm.value))
    .then((res) => { if (res?.data) { message.success(t('保存副本完成')); closeSaveCopy() } })
    .catch(() => { /* 校验或接口失败 */ })
}

function searchCopy(chapterId) {
  copyList.value = []
  currCopy.value = {}
  findListContent({
    chapterId, type: 0, userId: userId.value, orderByColumn: 'create_time', isAsc: 'asc'
  })
    .then((res) => {
      copyList.value = res?.rows || []
      if (copyList.value.length) {
        currCopy.value = copyList.value[0]
        currPreviewKey.value = copyList.value[0].contentId
      }
    })
    .catch(() => { /* 拦截器已提示 */ })
}

function openCopyView() { searchCopy(form.value.chapterId); copyViewVisible.value = true }
function closeCopyView() { copyViewVisible.value = false; currCopy.value = {}; currPreviewKey.value = '' }
function handleTabChange(key) {
  const hit = copyList.value.find((i) => i.contentId == key)
  if (hit) currCopy.value = hit
}
function toEditCopy() {
  currCopy.value.hasEdit = true
  tempName.value = currCopy.value.title
  tempContent.value = currCopy.value.content
}
function cancelEditCopy() {
  currCopy.value.hasEdit = false
  currCopy.value.title = tempName.value
  currCopy.value.content = tempContent.value
}
function confirmSaveCopy() {
  updateContent(currCopy.value)
    .then(() => { message.success(t('操作成功')); currCopy.value.hasEdit = false })
    .catch(() => { /* 拦截器已提示 */ })
}
function deleteCopy() {
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认删除名为《{name}》的副本吗？', { name: currCopy.value.title || '' }),
    okText: t('确定'), cancelText: t('取消'), okButtonProps: { danger: true },
    onOk: () => delContent(currCopy.value.contentId).then(() => {
      message.success(t('删除成功'))
      copyList.value = copyList.value.filter((i) => i.contentId !== currCopy.value.contentId)
      if (copyList.value.length) {
        currCopy.value = copyList.value[0]
        currPreviewKey.value = copyList.value[0].contentId
      } else currCopy.value = {}
    }).catch(() => {})
  })
}
function useVersion() {
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认采用此副本内容作为当前章节吗？'),
    okText: t('确定'), cancelText: t('取消'),
    onOk: () => {
      form.value.content = renderMarkdown(currCopy.value.content)
      closeCopyView()
    }
  })
}
function handleCopyScroll() { /* 预留：副本预览滚动位置 */ }

/* ---------- 尺寸 ---------- */
function handleResize() {
  drawerWidth.value = document.documentElement.clientWidth * 0.98
  drawerHeight.value = document.documentElement.clientHeight - 130
  previewWidth.value = document.documentElement.clientWidth * 0.8
  ueditorHeight.value = document.documentElement.clientHeight - 170
  editorConfig.value.initialFrameHeight = document.documentElement.clientHeight * 0.56
  editorConfig.value.initialFrameWidth = document.documentElement.clientWidth * 0.95
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})
</script>

<style scoped>
.cc2 { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 14px; }
.cc2__hd { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.cc2__hd-l, .cc2__hd-r { display: flex; align-items: center; gap: 6px; }
.cc2__body { margin-top: 8px; }
.cc2__empty { padding: 34px 12px; text-align: center; }
.cc2__empty-t { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.cc2__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }

.cc2__view { overflow-y: hidden; }
.cc2__form { padding: 5px; overflow: hidden; }
.cc2__form :deep(.ant-form-item) { margin-bottom: 12px; }
.cc2__editor { width: 100%; overflow: auto; }

.cc2__ft { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cc2__ft-r { display: flex; gap: 8px; }
.cc2__hint { font-size: 12px; color: var(--ink-4); margin: 6px 0 0; }
.cc2__copy-title { text-align: center; font-size: 15px; color: var(--pri); margin: 4px 0 14px; }

.cc2__copy { margin-top: 4px; }
.cc2__copy-hd {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 10px; background: var(--bg-soft); border-radius: var(--r-sm);
}
.cc2__copy-time { font-size: 12px; color: var(--ink-4); }
.cc2__copy-titlebox { flex: 1; display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 12.5px; color: var(--ink); }
.cc2__copy-acts { display: flex; gap: 6px; }
.cc2__copy-body { margin-top: 10px; max-height: 60vh; overflow-y: auto; padding: 4px 2px; }
</style>
