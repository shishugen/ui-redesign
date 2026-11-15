<template>
  <div v-if="loading" class="state"><a-spin /><p>{{ t('正在加载个人资料…') }}</p></div>
  <div v-else-if="error" class="state">
    <a-empty :description="t('个人资料加载失败')" />
    <p class="state__d">{{ error }}</p>
    <a-button @click="load">{{ t('重试') }}</a-button>
  </div>
  <div v-else class="pfd">
    <section class="card card--user">
      <div class="card__hd">{{ t('个人信息') }}</div>
      <UserAvatar :user="user" @changed="onAvatarChanged" />
      <ul class="kv">
        <li v-for="i in infoRows" :key="i.k">
          <span class="kv__k">{{ t(i.k) }}</span>
          <span class="kv__v">{{ i.v || '—' }}</span>
        </li>
      </ul>
    </section>

    <section class="card">
      <div class="card__hd">{{ t('基本资料') }}</div>
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="userinfo" :tab="t('基本资料')"><UserInfo :user="user" @saved="onProfileSaved" /></a-tab-pane>
        <a-tab-pane key="resetPwd" :tab="t('修改密码')"><ResetPwd /></a-tab-pane>
      </a-tabs>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { t } from '@/i18n'
import { getUserProfile } from '@/api/system/user'
import UserAvatar from './userAvatar.vue'
import UserInfo from './userInfo.vue'
import ResetPwd from './resetPwd.vue'

const loading = ref(true)
const error = ref('')
const user = ref({})
const roleGroup = ref('')
const postGroup = ref('')
const activeTab = ref('userinfo')

const infoRows = computed(() => [
  { k: '用户名称', v: user.value.userName },
  { k: '手机号码', v: user.value.phonenumber },
  { k: '用户邮箱', v: user.value.email },
  { k: '所属部门', v: user.value.dept ? `${user.value.dept.deptName}${postGroup.value ? ' / ' + postGroup.value : ''}` : '' },
  { k: '所属角色', v: roleGroup.value },
  { k: '创建日期', v: user.value.createTime }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await getUserProfile()
    user.value = res.data || {}
    roleGroup.value = res.roleGroup || ''
    postGroup.value = res.postGroup || ''
  } catch (e) {
    user.value = {}
    error.value = e?.message || t('接口不可用')
  } finally {
    loading.value = false
  }
}

function onProfileSaved(patch) {
  Object.assign(user.value, patch)
}
function onAvatarChanged(filePath) {
  user.value.avatar = filePath
}

onMounted(load)
</script>

<style scoped>
.state {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  box-shadow: var(--sh-1); padding: 72px 24px; text-align: center; color: var(--ink-3);
}
.state p { font-size: 13px; margin-top: 12px; }
.state__d { color: var(--ink-4); font-size: 12px; }
.pfd { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr); gap: 16px; align-items: start; }
.card {
  background: var(--panel); border: 1px solid var(--line); border-radius: var(--r-lg);
  box-shadow: var(--sh-1); padding: 18px; min-width: 0;
}
.card__hd { font-size: 14px; font-weight: 600; color: var(--ink); padding-bottom: 14px; border-bottom: 1px solid var(--line-3); }
.kv { list-style: none; margin: 0; padding: 0; }
.kv li {
  display: flex; justify-content: space-between; gap: 16px; padding: 11px 0;
  border-bottom: 1px solid var(--line-3); font-size: 12.5px;
}
.kv li:last-child { border-bottom: 0; }
.kv__k { color: var(--ink-3); flex: none; }
.kv__v { color: var(--ink); text-align: right; word-break: break-all; }
@media (max-width: 900px) { .pfd { grid-template-columns: 1fr; } }
</style>
