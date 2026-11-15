<template>
  <a-popover placement="bottomRight" trigger="click" overlay-class-name="src-pop">
    <button class="src-badge" :class="{ 'is-bad': bad }" :title="t('查看本次请求的每个后端接口状态')">
      <span class="dot" :class="bad ? 'err' : 'ok'" />
      <span>{{ okCount }}/{{ apis.length }} {{ t('接口正常') }}</span>
      <span v-if="updatedAt" class="src-badge__time">{{ updatedAt }}</span>
    </button>

    <template #content>
      <div class="sp">
        <div class="sp__hd">
          <b>{{ t('本次页面数据来源') }}</b>
          <span>{{ t('全部为真实后端接口，失败项显示「—」') }}</span>
        </div>
        <div class="sp__list">
          <div v-for="a in apis" :key="a.name" class="sp__i">
            <span class="dot" :class="a.ok ? 'ok' : 'err'" />
            <span class="sp__n">{{ t(a.name) }}</span>
            <span class="sp__s" :class="{ 'is-bad': !a.ok }">{{ a.ok ? 'OK' : 'FAIL' }}</span>
          </div>
        </div>
        <div v-if="bad" class="sp__ft">
          {{ t('失败原因取自后端返回体；菜单/权限失效请重新登录。') }}
        </div>
      </div>
    </template>
  </a-popover>
</template>

<script setup>
import { t } from '@/i18n'
import { computed } from 'vue'

const props = defineProps({
  apis: { type: Array, default: () => [] },
  updatedAt: { type: String, default: '' }
})

const okCount = computed(() => props.apis.filter(a => a.ok).length)
const bad = computed(() => props.apis.some(a => !a.ok))
</script>

<style lang="scss" scoped>
.src-badge {
  display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 11px;
  border: 1px solid var(--line); border-radius: 99px; background: var(--panel);
  color: var(--ink-3); font-size: 12.5px; cursor: pointer; white-space: nowrap;
  transition: .15s ease;
}
.src-badge:hover { border-color: var(--pri-200); color: var(--pri); background: var(--pri-50); }
.src-badge.is-bad { border-color: var(--danger-line); color: var(--danger); background: var(--danger-soft); }
.src-badge__time { color: var(--ink-4); font-variant-numeric: tabular-nums; }

.sp { width: 306px; }
.sp__hd { display: flex; flex-direction: column; gap: 3px; padding-bottom: 10px; border-bottom: 1px solid var(--line-3); }
.sp__hd b { font-size: 13px; color: var(--ink); }
.sp__hd span { font-size: 11.5px; color: var(--ink-4); }
.sp__list { display: flex; flex-direction: column; padding: 6px 0; max-height: 300px; overflow: auto; }
.sp__i { display: flex; align-items: center; gap: 8px; padding: 5px 0; }
.sp__n { flex: 1; min-width: 0; font-size: 12.5px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp__s { font-size: 11px; color: var(--ok); font-weight: 600; letter-spacing: .04em; }
.sp__s.is-bad { color: var(--danger); }
.sp__ft { padding-top: 9px; border-top: 1px solid var(--line-3); font-size: 11.5px; color: var(--ink-4); line-height: 1.6; }
</style>
