<template>
  <div class="cl">
    <div class="cl__hd">
      <a-button type="primary" ghost size="small" :disabled="!canEdit" @click="handleAdd">
        <template #icon><PlusOutlined /></template>
        {{ t('新增镜像') }}
      </a-button>
      <a-button type="primary" ghost size="small" :disabled="!canEdit" @click="handleAddTools">
        <template #icon><ToolOutlined /></template>
        {{ t('新增工具') }}
      </a-button>
      <a-button type="primary" ghost size="small" class="cl__refresh" @click="handleQuery">
        <template #icon><SyncOutlined /></template>
        {{ t('刷新') }}
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <!-- 镜像配置 -->
      <draggable v-model="configList" item-key="configId" handle=".cl__drag" ghost-class="cl__ghost">
        <template #item="{ element }">
          <div class="cl__item">
            <span class="cl__drag" aria-hidden="true">⋮⋮</span>
            <a-tag v-if="element.imageSource === 'local'" color="processing">{{ t('本地容器镜像') }}</a-tag>
            <a-tag v-else-if="element.imageSource === 'scnet'" color="success">{{ t('超算容器镜像') }}</a-tag>
            <a-tag v-else-if="element.imageSource === 'notebook'" color="cyan">{{ t('notebook镜像') }}</a-tag>
            <span class="cl__icon">
              <a-image v-if="element.imageSource === 'local' || element.imageSource === 'scnet'"
                       :width="35" :height="35" :preview="false" :fallback="defaultImg"
                       :src="previewUrl + getIconByImageId(element.imageId)" fit="cover" />
            </span>
            <span class="cl__image" :title="element.configName">
              {{ getConfigByImageId(element.imageId, element.imageSource) }}
            </span>
            <span class="cl__cell">{{ element.configName }}</span>
            <span class="cl__cell">{{ t('CPU：{n}（核）', { n: element.cpu }) }}</span>
            <span class="cl__cell">{{ t('GPU：{n}（G）', { n: element.gpu }) }}</span>
            <span class="cl__cell">{{ t('内存：{n}（G）', { n: element.memory }) }}</span>
            <span class="cl__port">
              {{ t('端口：') }}
              <p v-for="(p, i) in element.portList" :key="i">{{ p.protocolType }} : {{ p.port }}</p>
            </span>
            <span class="cl__acts">
              <a-button type="link" size="small" :disabled="!canEdit" @click="handleUpdate(element)">
                <template #icon><FormOutlined /></template>{{ t('修改') }}
              </a-button>
              <a-button type="link" size="small" danger :disabled="!canEdit" @click="handleDelete(element)">
                <template #icon><DeleteOutlined /></template>{{ t('删除') }}
              </a-button>
            </span>
          </div>
        </template>
      </draggable>

      <!-- 工具配置 -->
      <draggable v-model="relationList" item-key="relationId" handle=".cl__drag" ghost-class="cl__ghost">
        <template #item="{ element }">
          <div class="cl__item">
            <span class="cl__drag" aria-hidden="true">⋮⋮</span>
            <a-tag color="warning">{{ t('在线实训工具') }}</a-tag>
            <span class="cl__icon">
              <a-image :width="35" :height="35" :preview="false" :fallback="defaultImg"
                       :src="previewUrl + element.icon" fit="cover" />
            </span>
            <span class="cl__image">{{ element.toolName }}</span>
            <span class="cl__cell" /><span class="cl__cell" /><span class="cl__cell" />
            <span class="cl__port">{{ t('版本：{v}', { v: element.version }) }}</span>
            <span class="cl__acts">
              <a-button type="link" size="small" :disabled="!canEdit" @click="handleUpdateTool(element)">
                <template #icon><FormOutlined /></template>{{ t('修改') }}
              </a-button>
              <a-button type="link" size="small" danger :disabled="!canEdit" @click="handleDeleteTool(element)">
                <template #icon><DeleteOutlined /></template>{{ t('删除') }}
              </a-button>
            </span>
          </div>
        </template>
      </draggable>

      <div v-if="!loading && configList.length === 0 && relationList.length === 0" class="cl__empty" role="status">
        <div class="cl__empty-t">{{ t('暂未配置镜像或工具') }}</div>
        <div class="cl__empty-d">{{ t('实训章节需要先配置容器镜像；在线工具用于章节内的辅助操作。') }}</div>
      </div>
    </a-spin>

    <!-- 镜像配置弹窗 -->
    <a-modal :title="title" v-model:open="open" width="750px" @ok="submitForm" @cancel="cancel">
      <a-form ref="configRef" :model="form" :rules="rules">
        <a-form-item :label="t('镜像来源')" name="imageSource">
          <a-radio-group v-model:value="form.imageSource" button-style="solid" @change="changeSource">
            <a-radio-button value="local">{{ t('本地镜像') }}</a-radio-button>
            <a-radio-button value="scnet">{{ t('超算镜像') }}</a-radio-button>
            <a-radio-button value="notebook">{{ t('超算Notebook镜像') }}</a-radio-button>
          </a-radio-group>
        </a-form-item>

        <a-form-item :label="t('镜像模板')" name="imageId">
          <cascader-plus v-if="form.imageSource === 'local' || form.imageSource === 'scnet'"
                         v-model:value="form.imageId" :options="imageOptions" :field-names="fieldNames"
                         :placeholder="t('请选择镜像模板')" tag-color="blue" />
          <a-select v-else v-model:value="form.imageId" show-search allow-clear
                    :placeholder="t('请选择或搜索镜像')" :filter-option="filterNotebook">
            <a-select-option v-for="img in notebookImageList" :key="img.imageId" :value="img.imageId">
              <div class="cl__opt">
                <div class="cl__opt-t">{{ img.name }}</div>
                <div class="cl__opt-d">{{ img.description }}</div>
              </div>
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-row :gutter="24">
          <a-col :span="12">
            <a-form-item :label="t('配置名称')" name="configName">
              <a-input v-model:value="form.configName" :placeholder="t('请输入配置名')" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item v-if="form.imageSource === 'local'" :label="t('主机名称')" name="hostName">
              <a-input v-model:value="form.hostName" :placeholder="t('请输入主机名')" />
            </a-form-item>
            <a-form-item v-if="form.imageSource === 'scnet'" :label="t('加速器类型')" name="throttleType">
              <a-input v-model:value="form.throttleType" :placeholder="t('加速器类型')" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row v-if="form.imageSource === 'local' || form.imageSource === 'scnet'" :gutter="24">
          <a-col :span="8">
            <a-form-item :label="t('CPU')" name="cpu">
              <a-input-number v-model:value="form.cpu" :min="0.5" :addon-after="t('核')" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="t('GPU')" name="gpu">
              <a-input-number v-model:value="form.gpu" :min="1" :addon-after="t('G')" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="t('内存')" name="memory">
              <a-input-number v-model:value="form.memory" :min="1" :addon-after="t('G')" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item :label="t('序号')" name="sort">
          <a-input-number v-model:value="form.sort" :min="1" />
        </a-form-item>

        <a-button type="primary" size="small" @click="addPorts">
          <template #icon><PlusOutlined /></template>
          {{ t('添加端口') }}
        </a-button>

        <div v-for="(item, index) in portsList" :key="index" class="cl__port-row">
          <span class="cl__port-no">{{ t('端口{n}', { n: index + 1 }) }}</span>
          <a-select v-model:value="item.protocolType" :disabled="item.default" class="cl__port-proto"
                    :placeholder="t('协议')">
            <a-select-option value="HTTP">HTTP</a-select-option>
            <a-select-option value="TCP">TCP</a-select-option>
          </a-select>
          <a-input-number v-model:value="item.port" :min="1" :disabled="item.default" />
          <a-button type="link" danger size="small" :disabled="item.default" @click="removePorts(index)">
            <template #icon><DeleteOutlined /></template>{{ t('删除') }}
          </a-button>
          <a-tag v-if="item.default" color="default">{{ t('镜像默认') }}</a-tag>
        </div>
      </a-form>
    </a-modal>

    <!-- 工具配置弹窗 -->
    <a-modal :title="toolTitle" v-model:open="openTools" width="850px" @ok="submitToolForm" @cancel="cancelTool">
      <a-form ref="relationRef" :model="toolForm" :rules="toolRules">
        <a-form-item :label="t('关联工具')" name="toolId">
          <a-select v-model:value="toolForm.toolId" :placeholder="t('请选择关联工具')">
            <a-select-option v-for="tool in toolList" :key="tool.toolId" :value="tool.toolId">
              {{ tool.toolName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item :label="t('工具序号')" name="sort">
          <a-input-number v-model:value="toolForm.sort" :min="1" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup name="Config">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import draggable from 'vuedraggable'
import { PlusOutlined, SyncOutlined, ToolOutlined, FormOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { findListConfig, getConfig, delConfig, addConfig, updateConfig } from '@/api/course/config.js'
import { findListRelation, addRelation, updateRelation, delRelation, getRelation } from '@/api/course/relation.js'
import { getAllList } from '@/api/kube/tool.js'
import { listImage } from '@/api/kube/image.js'
import { listEnabled } from '@/api/kube/scnetImage.js'
import { previewUrl } from '@/api/cloud/file.js'
import { imageListConvertTree } from '@/utils/index.js'
import { t } from '@/i18n'
import defaultImg from '@/assets/images/default.png'
import CascaderPlus from '@/components/CascaderPlus/index.vue'

const props = defineProps({
  courseId: { type: [String, Number], required: true },
  chapterId: { type: [String, Number], required: false },
  relationType: { type: [String, Number], required: false },
  canEdit: { type: Boolean, default: false }
})

const loading = ref(true)
const configList = ref([])
const relationList = ref([])
const open = ref(false)
const openTools = ref(false)
const title = ref('')
const toolTitle = ref('')
const configRef = ref(null)
const relationRef = ref(null)

const imageList = ref([])
const notebookImageList = ref([])
const toolList = ref([])
const imageOptions = ref([])
const portsList = ref([])

const fieldNames = ref({ value: 'imageId', label: 'imageName', children: 'children' })

const form = ref({})
const toolForm = ref({})

const rules = computed(() => ({
  imageSource: [{ required: true, message: t('请选择镜像来源'), trigger: 'change' }],
  imageId: [{ required: true, message: t('请选择镜像模板'), trigger: 'change' }],
  configName: [{ required: true, message: t('请输入配置名'), trigger: 'change' }],
  hostName: form.value.imageSource === 'local'
    ? [
        { required: true, message: t('请输入主机名'), trigger: 'blur' },
        { pattern: /^([a-z0-9])+$/, message: t('只能输入小写字母、数字'), trigger: 'blur' }
      ]
    : []
}))
const toolRules = computed(() => ({
  toolId: [{ required: true, message: t('请选择工具'), trigger: 'change' }]
}))

const filterNotebook = (input, option) => {
  const hit = notebookImageList.value.find((i) => i.imageId === option.value)
  return String(hit?.name || '').toLowerCase().includes(String(input).toLowerCase())
}

function getIconByImageId(imageId) {
  return imageList.value.find((i) => String(i.imageId) === String(imageId))?.icon || ''
}
function getConfigByImageId(imageId, source) {
  if (source === 'notebook') {
    return notebookImageList.value.find((i) => String(i.imageId) === String(imageId))?.name || ''
  }
  const hit = imageList.value.find((i) => String(i.imageId) === String(imageId))
  return hit ? `${hit.imageName}/${hit.version}` : ''
}

async function getList() {
  loading.value = true
  try {
    const res = await findListConfig({
      orderByColumn: 'sort', isAsc: 'asc',
      courseId: props.courseId, chapterId: props.chapterId, relationType: props.relationType
    })
    configList.value = res?.rows || []
  } catch (e) { configList.value = [] } finally { loading.value = false }
}

async function getCourseToolList() {
  try {
    const res = await findListRelation({
      orderByColumn: 'sort', isAsc: 'asc',
      courseId: props.courseId, chapterId: props.chapterId, relationType: props.relationType
    })
    relationList.value = res?.rows || []
  } catch (e) { relationList.value = [] }
}

function handleQuery() { getList(); getCourseToolList() }

function reset() {
  portsList.value = []
  form.value = {
    configId: null, courseId: null, chapterId: null, configName: null, hostName: null,
    imageId: null, imageSource: 'local', icon: null, cpu: 8, gpu: 1, memory: 20,
    disk: null, ports: null, userName: null, password: null, command: null,
    sort: configList.value.length + 1
  }
}
function cancel() { open.value = false; reset() }

function handleAdd() {
  reset()
  changeSource()
  open.value = true
  title.value = t('添加容器配置')
}

async function handleUpdate(row) {
  reset()
  try {
    const res = await getConfig(row.configId)
    form.value = res?.data || {}
    open.value = true
    title.value = t('修改课程配置')
    imageOptions.value = imageListConvertTree(
      imageList.value.filter((i) => i.imageSource === form.value.imageSource)
    )
    if (row.ports) {
      try { portsList.value = JSON.parse(row.ports) } catch (e) { portsList.value = [] }
    }
    syncImageDefaultPorts(true)
  } catch (e) { /* 拦截器已提示 */ }
}

function changeSource() {
  form.value.configName = ''
  form.value.hostName = ''
  form.value.imageId = undefined
  const src = form.value.imageSource
  const presets = { local: [1, 1, 1], scnet: [8, 1, 20], notebook: [1, 1, 1] }[src] || [1, 1, 1]
  form.value.cpu = presets[0]
  form.value.gpu = presets[1]
  form.value.memory = presets[2]
  if (src === 'scnet') {
    form.value.taskType = 'jupyter'
    form.value.throttleType = 'dcu'
  }
  if (src === 'notebook') {
    form.value.taskType = ''
    form.value.throttleType = ''
  }
  if (src === 'local' || src === 'scnet') {
    imageOptions.value = imageListConvertTree(imageList.value.filter((i) => i.imageSource === src))
  }
}

async function submitForm() {
  // 同一课程下必须使用同一类镜像
  if (configList.value.length) {
    const first = configList.value[0].imageSource
    if (form.value.imageSource !== first) {
      message.warning(t('当前镜像类型{cur}与已有配置的{first}镜像不一致，请配置同一类型的镜像！', {
        cur: form.value.imageSource, first
      }))
      return
    }
  }
  try {
    await configRef.value.validate()
  } catch (e) { return }
  form.value.ports = JSON.stringify(portsList.value.map((i) => ({ protocolType: i.protocolType, port: i.port })))
  form.value.courseId = props.courseId
  form.value.chapterId = props.chapterId
  form.value.relationType = props.relationType
  try {
    if (form.value.configId != null) {
      await updateConfig(form.value)
      message.success(t('修改成功'))
    } else {
      await addConfig(form.value)
      message.success(t('新增成功'))
    }
    open.value = false
    getList()
  } catch (e) { /* 拦截器已提示 */ }
}

function handleDelete(row) {
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认删除容器配置「{name}」吗？', { name: row.configName || '' }),
    okText: t('确定'),
    cancelText: t('取消'),
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await delConfig(row.configId)
        message.success(t('删除成功'))
        getList()
      } catch (e) { /* 拦截器已提示 */ }
    }
  })
}

function addPorts() { portsList.value.push({ protocolType: 'HTTP', port: 80 }) }
function removePorts(index) {
  if (portsList.value[index]?.default) return
  portsList.value.splice(index, 1)
}

function parseImageDefaultPorts(image) {
  if (!image?.ports) return []
  try {
    const arr = JSON.parse(image.ports)
    return Array.isArray(arr) ? arr : []
  } catch (e) { return [] }
}

// 镜像默认端口置顶且不可删；keepCustom=true 时保留已有自定义端口
function syncImageDefaultPorts(keepCustom = false) {
  const current = form.value.imageSource === 'notebook'
    ? notebookImageList.value.find((i) => String(i.imageId) === String(form.value.imageId))
    : imageList.value.find((i) => String(i.imageId) === String(form.value.imageId))
  const defaults = parseImageDefaultPorts(current).map((i) => ({
    protocolType: i.protocolType, port: i.port, default: true
  }))
  if (!keepCustom) { portsList.value = defaults; return }
  const seen = new Set(defaults.map((d) => d.protocolType + ':' + d.port))
  const custom = portsList.value
    .filter((i) => !seen.has(i.protocolType + ':' + i.port))
    .map((i) => ({ protocolType: i.protocolType, port: i.port }))
  portsList.value = [...defaults, ...custom]
}

watch(() => form.value.imageId, () => syncImageDefaultPorts())

/* ---------- 工具配置 ---------- */
function resetTools() {
  toolForm.value = { relationId: null, courseId: null, chapterId: null, toolId: null, sort: 1 }
}
function handleAddTools() {
  resetTools()
  openTools.value = true
  toolTitle.value = t('添加工具配置')
}
async function handleUpdateTool(row) {
  resetTools()
  try {
    const res = await getRelation(row.relationId)
    toolForm.value = res?.data || {}
    openTools.value = true
    toolTitle.value = t('修改课程工具')
  } catch (e) { /* 拦截器已提示 */ }
}
function handleDeleteTool(row) {
  Modal.confirm({
    title: t('系统提示'),
    content: t('确认删除课程工具「{name}」吗？', { name: row.toolName || '' }),
    okText: t('确定'),
    cancelText: t('取消'),
    okButtonProps: { danger: true },
    onOk: async () => {
      try {
        await delRelation(row.relationId)
        message.success(t('删除成功'))
        getCourseToolList()
      } catch (e) { /* 拦截器已提示 */ }
    }
  })
}
function cancelTool() { openTools.value = false; resetTools() }
async function submitToolForm() {
  try { await relationRef.value.validate() } catch (e) { return }
  toolForm.value.courseId = props.courseId
  toolForm.value.chapterId = props.chapterId
  toolForm.value.relationType = props.relationType
  try {
    if (toolForm.value.relationId != null) {
      await updateRelation(toolForm.value)
      message.success(t('修改成功'))
    } else {
      await addRelation(toolForm.value)
      message.success(t('新增成功'))
    }
    openTools.value = false
    getCourseToolList()
  } catch (e) { /* 拦截器已提示 */ }
}

async function getImagesList() {
  try { const res = await listImage({}); imageList.value = res?.rows || [] } catch (e) { imageList.value = [] }
}
async function getEnabledImages() {
  try { const res = await listEnabled(); notebookImageList.value = res?.data || [] } catch (e) { notebookImageList.value = [] }
}
async function getKubeToolList() {
  try { const res = await getAllList({}); toolList.value = res?.rows || [] } catch (e) { toolList.value = [] }
}

onMounted(() => {
  getList()
  getCourseToolList()
  getImagesList()
  getEnabledImages()
  getKubeToolList()
})
</script>

<style scoped>
.cl {
  margin-top: 5px; padding: 14px;
  background: var(--bg-soft); border: 1px solid var(--line-3); border-radius: var(--r);
}
.cl__hd { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.cl__refresh { margin-left: auto; }

.cl__item {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 9px; margin-bottom: 8px;
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r-sm); font-size: 12px; color: var(--ink-2);
}
.cl__drag { flex: none; color: var(--ink-4); cursor: move; letter-spacing: -2px; padding: 0 4px; }
.cl__ghost { opacity: .45; }
.cl__icon { flex: none; width: 35px; }
.cl__image {
  flex: none; width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12px; color: var(--ink);
}
.cl__cell { flex: none; width: 96px; white-space: nowrap; }
.cl__port { flex: none; width: 150px; line-height: 1.5; }
.cl__port p { margin: 0; }
.cl__acts { flex: none; display: flex; gap: 2px; margin-left: auto; }
.cl__opt { padding: 2px 0; }
.cl__opt-t { font-size: 12.5px; color: var(--ink); }
.cl__opt-d { font-size: 11.5px; color: var(--ink-4); }
.cl__port-row { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.cl__port-no { width: 62px; font-size: 12.5px; color: var(--ink-3); }
.cl__port-proto { width: 100px; }
.cl__empty { padding: 30px 12px; text-align: center; }
.cl__empty-t { font-size: 13px; font-weight: 600; color: var(--ink-2); }
.cl__empty-d { margin-top: 6px; font-size: 12px; color: var(--ink-4); }

@media (max-width: 1280px) {
  .cl__cell { display: none; }
}
</style>
