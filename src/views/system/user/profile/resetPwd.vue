<template>
  <a-form ref="formRef" :model="user" :rules="rules" layout="vertical" class="pf-form">
    <a-form-item :label="t('旧 密 码')" name="oldPassword">
      <a-input-password v-model:value="user.oldPassword" :placeholder="t('请输入旧密码')" />
    </a-form-item>
    <a-form-item :label="t('新 密 码')" name="newPassword">
      <a-input-password v-model:value="user.newPassword" :placeholder="t('请输入新密码')" />
    </a-form-item>
    <a-form-item :label="t('确认密码')" name="confirmPassword">
      <a-input-password v-model:value="user.confirmPassword" :placeholder="t('请确认新密码')" />
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
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { t } from '@/i18n'
import { updateUserPwd } from '@/api/system/user'

const router = useRouter()
const formRef = ref(null)
const saving = ref(false)
const user = reactive({ oldPassword: undefined, newPassword: undefined, confirmPassword: undefined })

const equalToPassword = (rule, value) => {
  if (user.newPassword !== value) return Promise.reject(new Error(t('两次输入的密码不一致')))
  return Promise.resolve()
}

const rules = computed(() => ({
  oldPassword: [{ required: true, message: t('旧密码不能为空'), trigger: 'blur' }],
  newPassword: [
    { required: true, message: t('新密码不能为空'), trigger: 'blur' },
    { min: 6, max: 20, message: t('长度在 6 到 20 个字符'), trigger: 'blur' },
    { pattern: /^[^<>"'|\\]+$/, message: t('不能包含非法字符或特殊符号'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('确认密码不能为空'), trigger: 'blur' },
    { validator: equalToPassword, trigger: 'blur' }
  ]
}))

async function submit() {
  try { await formRef.value.validate() } catch (e) { return }
  saving.value = true
  try {
    await updateUserPwd(user.oldPassword, user.newPassword)
    message.success(t('修改成功'))
    user.oldPassword = user.newPassword = user.confirmPassword = undefined
    formRef.value.resetFields()
  } catch (e) { /* 拦截器已提示 */ } finally { saving.value = false }
}

// 旧页 proxy.$tab.closePage()；新项目无 tagsView，关闭 = 回首页
function close() { router.push('/index') }
</script>

<style scoped>
.pf-form { max-width: 460px; padding-top: 14px; }
</style>
