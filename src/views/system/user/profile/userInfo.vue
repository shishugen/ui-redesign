<template>
  <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" class="uf">
    <a-form-item :label="t('用户昵称')" name="nickName">
      <a-input v-model:value="form.nickName" :placeholder="t('请输入用户昵称')" :maxlength="30" />
    </a-form-item>
    <a-form-item :label="t('手机号码')" name="phonenumber">
      <a-input v-model:value="form.phonenumber" :maxlength="11" :placeholder="t('请输入手机号码')" />
    </a-form-item>
    <a-form-item :label="t('电子邮箱')" name="email">
      <a-input v-model:value="form.email" :maxlength="60" :placeholder="t('请输入电子邮箱')" />
    </a-form-item>
    <a-form-item :label="t('用户性别')" name="sex">
      <a-radio-group v-model:value="form.sex">
        <a-radio value="0">{{ t('男性') }}</a-radio>
        <a-radio value="1">{{ t('女性') }}</a-radio>
      </a-radio-group>
    </a-form-item>
    <a-form-item>
      <a-space>
        <a-button type="primary" :loading="saving" @click="submit">{{ t('保存') }}</a-button>
        <a-button danger @click="close">{{ t('关闭') }}</a-button>
      </a-space>
    </a-form-item>
  </a-form>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'
import { updateUserProfile } from '@/api/system/user'
import { useSessionStore } from '@/stores/session'

const props = defineProps({ user: { type: Object, default: () => ({}) } })
const emit = defineEmits(['saved'])
const router = useRouter()
const session = useSessionStore()

const formRef = ref(null)
const saving = ref(false)
const form = ref({})
const rules = computed(() => ({
  nickName: [{ required: true, message: t('用户昵称不能为空'), trigger: 'blur' }],
  email: [
    { required: true, message: t('邮箱地址不能为空'), trigger: 'blur' },
    { type: 'email', message: t('请输入正确的邮箱地址'), trigger: ['blur', 'change'] }
  ],
  phonenumber: [
    { required: true, message: t('手机号码不能为空'), trigger: 'blur' },
    { pattern: /^1[3|4|5|6|7|8|9][0-9]\d{8}$/, message: t('请输入正确的手机号码'), trigger: 'blur' }
  ],
  sex: [{ required: true, message: t('请选择性别'), trigger: 'change' }]
}))

watch(() => props.user, u => {
  if (u) form.value = { nickName: u.nickName, phonenumber: u.phonenumber, email: u.email, sex: u.sex }
}, { immediate: true, deep: true })

async function submit() {
  try { await formRef.value.validate() } catch (e) { return }
  saving.value = true
  try {
    await updateUserProfile(form.value)
    message.success(t('修改成功'))
    // D2：旧页写 useUserStore().user.nickName，新页写 session.user
    session.user.nickName = form.value.nickName
    emit('saved', { phonenumber: form.value.phonenumber, email: form.value.email })
  } catch (e) { /* 拦截器已提示，不伪造成功 */ } finally { saving.value = false }
}

// 旧页 proxy.$router.go(-1)；新项目无 tagsView，关闭 = 返回上一页
function close() { router.back() }
</script>

<style scoped>
.uf { max-width: 460px; padding-top: 14px; }
</style>
