<template>
  <!-- B02 同名新写：保留 callbackBase64Data(原图, 截图) 契约，裁剪器沿用已装的 vue-cropper -->
  <div class="ic">
    <div class="ic__bar">
      <a-upload :before-upload="beforeUpload" :show-upload-list="false" accept="image/*">
        <a-button><UploadOutlined />{{ t('选择图片') }}</a-button>
      </a-upload>
      <a-button aria-label="缩小" @click="changeScale(-1)"><MinusOutlined /></a-button>
      <a-button aria-label="放大" @click="changeScale(1)"><PlusOutlined /></a-button>
      <a-button aria-label="向左旋转" @click="rotateLeft"><RotateLeftOutlined /></a-button>
      <a-button aria-label="向右旋转" @click="rotateRight"><RotateRightOutlined /></a-button>
      <a-button type="primary" :disabled="!options.img" @click="confirm">{{ t('确认裁剪') }}</a-button>
    </div>

    <div class="ic__crop" :style="{ height: defaultHeight + 'px' }">
      <VueCropper
        v-if="options.img" ref="cropperRef"
        :img="options.img" :auto-crop="true"
        :auto-crop-width="cropWidth" :auto-crop-height="cropHeight"
        :fixed-box="false" :fixed="false" :can-move-box="true" :center-box="true"
        output-type="png" :full="true"
      />
      <div v-else class="ic__empty">{{ t('先选择一张图片，再拖动裁剪框。') }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import {
  UploadOutlined, PlusOutlined, MinusOutlined, RotateLeftOutlined, RotateRightOutlined
} from '@ant-design/icons-vue'
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import { t } from '@/i18n'

const props = defineProps({
  previewUrl: { type: String, default: '' },
  defaultImg: { type: String, default: '' },
  defaultHeight: { type: Number, default: 400 },
  cropWidth: { type: Number, default: 400 },
  cropHeight: { type: Number, default: 180 },
  callbackBase64Data: { type: Function, default: () => {} }
})

const cropperRef = ref(null)
const options = reactive({
  img: props.defaultImg ? props.previewUrl + props.defaultImg : '',
  filename: 'cover.png'
})

function beforeUpload(file) {
  if (!String(file.type || '').startsWith('image/')) {
    message.error(t('请选择图片文件'))
    return false
  }
  const reader = new FileReader()
  reader.onload = () => { options.img = reader.result; options.filename = file.name }
  reader.readAsDataURL(file)
  return false
}
const rotateLeft = () => cropperRef.value?.rotateLeft()
const rotateRight = () => cropperRef.value?.rotateRight()
const changeScale = (n) => cropperRef.value?.changeScale(n)
function confirm() {
  cropperRef.value?.getCropData(data => props.callbackBase64Data(options.img, data))
}
</script>

<style scoped>
.ic { display: flex; flex-direction: column; gap: 12px; }
.ic__bar { display: flex; flex-wrap: wrap; gap: 8px; }
.ic__crop {
  background: var(--bg-soft); border: 1px solid var(--line);
  border-radius: var(--r); overflow: hidden;
}
.ic__empty { display: grid; place-items: center; height: 100%; color: var(--ink-4); font-size: 12px; }
</style>
