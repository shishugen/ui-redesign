<template>
  <div class="av">
    <button type="button" class="av__btn" :title="t('修改头像')" :aria-label="t('修改头像')" @click="openDialog">
      <img v-if="avatarUrl && !imgFailed" :src="avatarUrl" :alt="t('头像')" @error="imgFailed = true" />
      <span v-else>{{ initials }}</span>
    </button>
    <div class="av__tip">{{ t('点击头像可更换') }}</div>

    <a-modal
      v-model:open="open" :title="t('修改头像')" :ok-text="t('保存')" :cancel-text="t('取消')"
      :confirm-loading="uploading" :ok-button-props="{ disabled: !options.img }"
      width="800px" @ok="uploadImg" @cancel="closeDialog"
    >
      <div class="crop">
        <div class="crop__stage">
          <VueCropper
            v-if="open && options.img" ref="cropperRef"
            :img="options.img"
            :info="true"
            :auto-crop="options.autoCrop"
            :auto-crop-width="options.autoCropWidth"
            :auto-crop-height="options.autoCropHeight"
            :fixed-box="options.fixedBox"
            :fixed="options.fixed"
            :can-move-box="true"
            :output-type="options.outputType"
            @realTime="realTime"
          />
          <div v-else class="crop__empty" role="status">{{ t('请先选择一张图片') }}</div>
        </div>

        <div class="crop__side">
          <a-upload :show-upload-list="false" :before-upload="beforeUpload" accept="image/*">
            <a-button block><CloudUploadOutlined />{{ t('选择图片') }}</a-button>
          </a-upload>

          <div class="crop__ops">
            <a-button :title="t('放大')" :aria-label="t('放大')" @click="changeScale(1)"><PlusOutlined /></a-button>
            <a-button :title="t('缩小')" :aria-label="t('缩小')" @click="changeScale(-1)"><MinusOutlined /></a-button>
            <a-button :title="t('向左旋转')" :aria-label="t('向左旋转')" @click="rotateLeft"><RotateLeftOutlined /></a-button>
            <a-button :title="t('向右旋转')" :aria-label="t('向右旋转')" @click="rotateRight"><RotateRightOutlined /></a-button>
            <a-button :title="t('重置')" :aria-label="t('重置')" @click="refreshCrop"><ReloadOutlined /></a-button>
          </div>

          <div class="crop__hint">
            {{ t('拖动裁框可自由调整选区大小，拖动图片可平移，支持旋转与缩放，输出 PNG。') }}
          </div>

          <div class="crop__thumb">
            <span>{{ t('效果预览') }}</span>
            <div class="crop__round">
              <img v-if="previews.url" :src="previews.url" :style="previews.img" :alt="t('效果预览')" />
              <span v-else>—</span>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined, MinusOutlined, RotateLeftOutlined, RotateRightOutlined,
  CloudUploadOutlined, ReloadOutlined
} from '@ant-design/icons-vue'
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import { t } from '@/i18n'
import { previewUrl, uploadByBase64 } from '@/api/cloud/file'
import { updateAvatar } from '@/api/system/user'
import { useSessionStore } from '@/stores/session'

const props = defineProps({ user: { type: Object, default: () => ({}) } })
const emit = defineEmits(['changed'])
const session = useSessionStore()

const open = ref(false)
const uploading = ref(false)
const imgFailed = ref(false)
const cropperRef = ref(null)
const localPath = ref('')

// fixedBox=false + fixed=false → 裁框可自由拖拽调整大小（旧页 fixedBox=true 为固定框）
const options = reactive({
  img: '',
  autoCrop: true,
  autoCropWidth: 200,
  autoCropHeight: 200,
  fixedBox: false,
  fixed: false,
  outputType: 'png'
})
const previews = ref({ url: '', img: {} })

const avatarUrl = computed(() => {
  const p = localPath.value || props.user?.avatar
  return p ? `${previewUrl}${p}` : ''
})
const initials = computed(() => {
  const n = props.user?.nickName || props.user?.userName || 'U'
  return /^[a-zA-Z]/.test(n) ? n.slice(0, 2).toUpperCase() : n.slice(0, 1)
})
watch(() => props.user?.avatar, () => { imgFailed.value = false })

function openDialog() {
  options.img = avatarUrl.value || ''
  previews.value = { url: options.img, img: {} }
  open.value = true
}
function closeDialog() { open.value = false }

/** 覆盖默认上传行为，只把文件读成 dataURL 交给裁剪器 */
function beforeUpload(file) {
  if (!file.type.startsWith('image/')) {
    message.error(t('文件格式错误，请上传图片类型,如：JPG，PNG后缀的文件。'))
    return false
  }
  const reader = new FileReader()
  reader.onload = () => {
    options.img = String(reader.result)
    previews.value = { url: options.img, img: {} }
    nextTick(() => cropperRef.value?.refresh?.())
  }
  reader.readAsDataURL(file)
  return false
}

function rotateLeft() { cropperRef.value?.rotateLeft?.() }
function rotateRight() { cropperRef.value?.rotateRight?.() }
function changeScale(num) { cropperRef.value?.changeScale?.(num || 1) }
function refreshCrop() { cropperRef.value?.refresh?.() }
function realTime(data) { previews.value = data || { url: '', img: {} } }

/** 与旧页一致：code=base64 + watermark=0 → filePath → updateAvatar */
async function uploadImg() {
  if (!options.img || !cropperRef.value) return
  uploading.value = true
  cropperRef.value.getCropData(async data => {
    try {
      const formData = new FormData()
      formData.append('code', data)
      formData.append('watermark', 0)
      const res = await uploadByBase64(formData)
      const filePath = res?.data?.filePath
      if (!filePath) { message.error(t('上传失败')); return }
      await updateAvatar(filePath)
      localPath.value = filePath
      imgFailed.value = false
      // D2：旧页写 useUserStore().user.avatar，新页写 session.user
      session.user.avatar = filePath
      emit('changed', filePath)
      message.success(t('更新成功'))
      open.value = false
    } catch (e) {
      message.error(e?.message || t('上传失败'))
    } finally {
      uploading.value = false
    }
  })
}
</script>

<style scoped>
.av { text-align: center; padding: 18px 0 6px; }
.av__btn {
  width: 92px; height: 92px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--pri-50); color: var(--pri); font-size: 30px; font-weight: 600;
  display: inline-grid; place-items: center; overflow: hidden; cursor: pointer; padding: 0;
}
.av__btn img { width: 100%; height: 100%; object-fit: cover; }
.av__tip { font-size: 11.5px; color: var(--ink-4); margin-top: 8px; }
.crop { display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 18px; }
.crop__stage {
  height: 350px; border-radius: var(--r); background: var(--bg);
  border: 1px solid var(--line-2); overflow: hidden;
}
.crop__empty {
  height: 100%; display: grid; place-items: center;
  font-size: 12.5px; color: var(--ink-4);
}
.crop__side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.crop__ops { display: flex; gap: 6px; flex-wrap: wrap; }
.crop__hint { font-size: 11.5px; color: var(--ink-4); line-height: 1.8; }
.crop__thumb { display: flex; align-items: center; gap: 12px; font-size: 11.5px; color: var(--ink-3); margin-top: auto; }
.crop__round {
  width: 88px; height: 88px; border-radius: 50%; border: 1px solid var(--line);
  background: var(--bg); overflow: hidden; display: grid; place-items: center; flex: none;
}
.crop__round img { max-width: none; }
@media (max-width: 700px) { .crop { grid-template-columns: 1fr; } }
</style>
