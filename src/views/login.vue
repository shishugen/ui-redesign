<template>
  <div class="login">
    <LocaleSwitch fixed />
    <!-- 左：品牌区。系统名、接口状态都来自真实后端 -->
    <section class="lg-aside">
      <div class="lg-aside__bg" aria-hidden="true" />

      <div class="lg-aside__top">
        <span class="lg-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 16.4V9.2L12 5l7 4.2v7.2L12 20.6 5 16.4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
            <path d="M12 5v7.6l7 4.3M12 12.6 5 16.9" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="lg-sys">{{ t(systemName || 'AI 大模型培训教学管理系统') }}</span>
      </div>

      <div class="lg-aside__mid">
        <h1>{{ t('课程、实验与算力') }}<br>{{ t('在同一个控制台开课') }}</h1>
        <p class="lg-desc">
          {{ t('面向高校的 AIGC 实训环境。课程编排、模型配额、实验报告与考核记录共用一套账号， 教师与学员看到的是同一份真实数据。') }}
        </p>

        <ul class="lg-feats">
          <li v-for="f in feats" :key="f.t">
            <span class="lg-feats__i" aria-hidden="true" v-html="f.icon" />
            <span>
              <b>{{ t(f.t) }}</b>
              <i>{{ t(f.d) }}</i>
            </span>
          </li>
        </ul>
      </div>

      <div class="lg-aside__foot">
        <div class="lg-facts">
          <div class="lg-facts__i">
            <span class="k">{{ t('接口') }}</span>
            <span class="v"><i class="dot" :class="apiOnline ? 'ok' : 'err'" />{{ apiOnline ? t('已联通') : t('未联通') }}</span>
          </div>
          <div class="lg-facts__i">
            <span class="k">{{ t('验证码') }}</span>
            <span class="v">{{ captchaEnabled ? t('后端下发') : t('已关闭') }}</span>
          </div>
          <div class="lg-facts__i">
            <span class="k">{{ t('版本') }}</span>
            <span class="v">v1.0</span>
          </div>
        </div>
        <p class="lg-copy">
          {{ t('抱抱脸（广州）人工智能科技有限公司 · © 2026 Aibbl.cn ·') }}
          <a href="https://beian.miit.gov.cn" target="_blank" rel="noopener">{{ t('粤ICP备2025433461号-2') }}</a>
        </p>
      </div>
    </section>

    <!-- 右：登录表单 -->
    <section class="lg-form">
      <div class="lg-box">
        <h2>{{ t('欢迎回来') }}</h2>
        <p class="lg-sub">{{ t('使用平台账号进入控制台') }}</p>

        <a-form ref="formRef" :model="form" :rules="rules" layout="vertical" autocomplete="off" @finish="handleLogin">
          <a-form-item :label="t('账号')" name="username">
            <a-input v-model:value="form.username" size="large" :placeholder="t('请输入账号')" allow-clear>
              <template #prefix><UserOutlined /></template>
            </a-input>
          </a-form-item>

          <a-form-item :label="t('密码')" name="password">
            <a-input-password v-model:value="form.password" size="large" :placeholder="t('请输入密码')">
              <template #prefix><LockOutlined /></template>
            </a-input-password>
          </a-form-item>

          <a-form-item v-if="captchaEnabled" :label="t('验证码')" name="code">
            <div class="lg-code">
              <a-input v-model:value="form.code" size="large" :placeholder="t('右侧四位字符')" allow-clear>
                <template #prefix><SecurityScanOutlined /></template>
              </a-input>
              <img v-if="codeUrl" class="lg-code__img" :src="codeUrl" :title="t('点击刷新')" :alt="t('验证码')" @click="refreshCode">
              <button v-else type="button" class="lg-code__empty" @click="refreshCode">{{ t('点击获取') }}</button>
            </div>
          </a-form-item>

          <div class="lg-row">
            <a-checkbox v-model:checked="form.rememberMe">{{ t('记住账号') }}</a-checkbox>
            <span class="lg-row__tip">{{ t('密码不落盘') }}</span>
          </div>

          <a-button type="primary" html-type="submit" size="large" block :loading="loading" class="lg-submit">
            {{ t('进入控制台') }}
          </a-button>
        </a-form>

        <p class="lg-legal">{{ t('登录、验证码、用户信息、菜单与系统名全部请求真实后端；本机只记住账号。') }}</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { t } from '@/i18n'
import LocaleSwitch from '@/components/LocaleSwitch.vue'
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { UserOutlined, LockOutlined, SecurityScanOutlined } from '@ant-design/icons-vue'
import { getCodeImg } from '@/api/login'
import { getConfigKey } from '@/api/system'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const formRef = ref(null)
const loading = ref(false)
const ACCOUNT_KEY = 'aigc-redesign-account'

const form = reactive({ username: '', password: '', code: '', uuid: '', rememberMe: false })

const captchaEnabled = ref(true)
const codeUrl = ref('')
const apiOnline = ref(false)
const systemName = ref('')

const feats = [
  {
    t: '一套账号打通三个端',
    d: '管理端、实训端与学员空间共用权限与菜单',
    icon: '<svg viewBox="0 0 20 20" fill="none"><circle cx="7" cy="7" r="2.6" stroke="currentColor" stroke-width="1.4"/><path d="M2.6 16c0-2.3 2-4 4.4-4s4.4 1.7 4.4 4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M13.4 4.6a2.6 2.6 0 0 1 0 4.8M14.6 12c1.7.5 2.8 1.9 2.8 3.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
  },
  {
    t: '真实数据，不预置演示值',
    d: '课程、班级、排课、报告均读后端接口',
    icon: '<svg viewBox="0 0 20 20" fill="none"><ellipse cx="10" cy="5.4" rx="6" ry="2.4" stroke="currentColor" stroke-width="1.4"/><path d="M4 5.4v9.2c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4V5.4" stroke="currentColor" stroke-width="1.4"/><path d="M4 10c0 1.3 2.7 2.4 6 2.4s6-1.1 6-2.4" stroke="currentColor" stroke-width="1.4"/></svg>'
  },
  {
    t: '菜单随权限变化',
    d: '菜单树由后端下发，前端只负责摆放在顶部或左侧',
    icon: '<svg viewBox="0 0 20 20" fill="none"><rect x="2.6" y="3.4" width="14.8" height="3.4" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="2.6" y="9" width="5" height="7.6" rx="1.2" stroke="currentColor" stroke-width="1.4"/><rect x="9.4" y="9" width="8" height="7.6" rx="1.2" stroke="currentColor" stroke-width="1.4"/></svg>'
  }
]

async function refreshCode() {
  try {
    const res = await getCodeImg()
    captchaEnabled.value = res.captchaEnabled !== false
    if (captchaEnabled.value) {
      codeUrl.value = 'data:image/jpeg;base64,' + res.img
      form.uuid = res.uuid
    }
    apiOnline.value = true
  } catch (e) {
    apiOnline.value = false
  }
}

async function loadSystemName() {
  try {
    const res = await getConfigKey('aigc_system_name')
    systemName.value = res.msg || ''
  } catch (e) { /* 非关键接口 */ }
}

const rules = computed(() => ({
  username: [{ required: true, message: t('请输入账号'), trigger: 'blur' }],
  password: [{ required: true, message: t('请输入密码'), trigger: 'blur' }],
  ...(captchaEnabled.value ? { code: [{ required: true, message: t('请输入验证码'), trigger: 'blur' }] } : {})
}))

async function handleLogin() {
  loading.value = true
  try {
    await session.login({ username: form.username, password: form.password, code: form.code, uuid: form.uuid })
    try {
      if (form.rememberMe) localStorage.setItem(ACCOUNT_KEY, form.username.trim())
      else localStorage.removeItem(ACCOUNT_KEY)
    } catch (e) { /* 忽略 */ }
    message.success(t('欢迎回来，{name}', { name: session.displayName }))
    router.push(route.query.redirect || '/index')
  } catch (e) {
    form.code = ''
    form.uuid = ''
    refreshCode()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshCode()
  loadSystemName()
  try {
    const saved = localStorage.getItem(ACCOUNT_KEY)
    if (saved) { form.username = saved; form.rememberMe = true }
  } catch (e) { /* 忽略 */ }
})
</script>

<style lang="scss" scoped>
.login {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 44%);
  min-height: 100vh; background: var(--panel);
}

/* —— 左：品牌区 —— */
.lg-aside {
  position: relative; overflow: hidden;
  padding: 34px 46px 30px;
  display: flex; flex-direction: column;
  background: #1B2A6E;
  color: #fff;
}
.lg-aside__bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(860px 540px at 4% 0%, rgba(120, 150, 255, .5), transparent 60%),
    radial-gradient(720px 600px at 96% 100%, rgba(146, 92, 246, .46), transparent 62%),
    linear-gradient(154deg, #16205A 0%, #2945CE 54%, #4630B4 100%);
}
.lg-aside__bg::after {
  content: ""; position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, .055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, .055) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(900px 620px at 30% 20%, #000 30%, transparent 78%);
}
.lg-aside > *:not(.lg-aside__bg) { position: relative; z-index: 1; }

.lg-aside__top { display: flex; align-items: center; gap: 10px; }
.lg-logo {
  width: 34px; height: 34px; border-radius: 10px; flex: none;
  display: grid; place-items: center; color: #fff;
  background: rgba(255, 255, 255, .16);
  border: 1px solid rgba(255, 255, 255, .22);
  backdrop-filter: blur(6px);
}
.lg-logo svg { width: 20px; height: 20px; }
.lg-sys { font-size: 13px; color: rgba(255, 255, 255, .86); letter-spacing: .01em; }

.lg-aside__mid { margin: auto 0; padding: 40px 0 32px; max-width: 520px; }
.lg-aside h1 {
  margin: 0; font-size: 38px; line-height: 1.34; font-weight: 650;
  letter-spacing: -.01em; color: #fff;
}
.lg-desc {
  margin: 20px 0 0; font-size: 13.5px; line-height: 1.95;
  color: rgba(255, 255, 255, .74); max-width: 430px;
}
.lg-feats {
  list-style: none; margin: 32px 0 0; padding: 0;
  display: flex; flex-direction: column; gap: 16px;
}
.lg-feats li { display: flex; align-items: flex-start; gap: 12px; }
.lg-feats__i {
  width: 30px; height: 30px; border-radius: 8px; flex: none;
  display: grid; place-items: center; color: #fff;
  background: rgba(255, 255, 255, .13);
  border: 1px solid rgba(255, 255, 255, .18);
}
.lg-feats__i svg { width: 16px; height: 16px; }
.lg-feats b { display: block; font-size: 13.5px; font-weight: 600; color: #fff; }
.lg-feats i {
  display: block; font-style: normal; font-size: 12.5px;
  color: rgba(255, 255, 255, .64); margin-top: 3px;
}

.lg-aside__foot { border-top: 1px solid rgba(255, 255, 255, .16); padding-top: 18px; }
.lg-facts { display: flex; gap: 34px; flex-wrap: wrap; }
.lg-facts__i { display: flex; flex-direction: column; gap: 5px; }
.lg-facts__i .k { font-size: 11px; color: rgba(255, 255, 255, .52); letter-spacing: .05em; }
.lg-facts__i .v {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; color: rgba(255, 255, 255, .9);
}
.lg-copy {
  margin: 16px 0 0; font-size: 11px; line-height: 1.9;
  color: rgba(255, 255, 255, .48);
}
.lg-copy a { color: rgba(255, 255, 255, .62); }

/* —— 右：表单 —— */
.lg-form {
  display: flex; align-items: center; justify-content: center;
  padding: 48px 32px; background: var(--panel);
}
.lg-box { width: 100%; max-width: 356px; }
.lg-box h2 { margin: 0; font-size: 26px; font-weight: 650; letter-spacing: -.01em; color: var(--ink); }
.lg-sub { margin: 8px 0 28px; font-size: 13px; color: var(--ink-3); }

.lg-code { display: flex; gap: 10px; }
.lg-code :deep(.ant-input-affix-wrapper) { flex: 1; min-width: 0; }
.lg-code__img {
  width: 112px; height: 42px; flex: none; display: block;
  border: 1px solid var(--line); border-radius: var(--r-sm);
  background: var(--bg-soft); object-fit: contain;
  cursor: pointer; user-select: none;
}
.lg-code__empty {
  width: 112px; height: 42px; flex: none;
  border: 1px dashed var(--line-2); border-radius: var(--r-sm);
  background: var(--bg-soft); color: var(--ink-4);
  font-size: 12.5px; cursor: pointer;
}

.lg-row {
  display: flex; align-items: center; justify-content: space-between;
  margin: -2px 0 22px;
}
.lg-row :deep(.ant-checkbox-wrapper) { font-size: 13px; color: var(--ink-3); }
.lg-row__tip { font-size: 12px; color: var(--ink-4); }
.lg-submit {
  height: 44px; font-size: 14.5px; font-weight: 550;
  border-radius: var(--r); letter-spacing: .02em;
  box-shadow: 0 8px 20px rgba(47, 84, 235, .26) !important;
}
.lg-legal {
  margin-top: 22px; font-size: 11.5px; line-height: 1.9;
  color: var(--ink-4); text-align: center;
}

:deep(.ant-form-item-label) { padding-bottom: 6px; }
:deep(.ant-form-item-label > label) { font-size: 13px; color: var(--ink-2); }
/* 高度只给外层 wrapper；内部 input 交给 antd 自己按内容区排版。
   之前把 .ant-input-lg 也设成 42px，会撑破 42px 的 wrapper（内容区仅 40px），
   叠加全局圆角后在图标下方露出一段横线。 */
:deep(.ant-input-affix-wrapper-lg) { height: 42px; font-size: 14px; }
:deep(.ant-input-affix-wrapper) { align-items: center; }
:deep(.ant-input-affix-wrapper .ant-input-lg) { height: auto; font-size: 14px; }
:deep(.ant-input-prefix) { margin-inline-end: 8px; }
:deep(.ant-input-affix-wrapper .anticon) { color: var(--ink-4); }

@media (max-width: 1000px) {
  .login { grid-template-columns: 1fr; }
  .lg-aside { min-height: 280px; padding: 22px 24px; }
  .lg-aside__mid { padding: 28px 0 20px; }
  .lg-aside h1 { font-size: 26px; }
  .lg-desc, .lg-feats, .lg-copy { display: none; }
  .lg-form { padding: 34px 24px 48px; }
}
</style>
