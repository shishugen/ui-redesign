<template>
  <div class="lang" :class="{ 'lang--fixed': fixed }" role="group" :aria-label="label">
    <button
      v-for="l in locales" :key="l.value" type="button"
      class="lang__b" :class="{ on: locale === l.value }"
      :title="l.name" :aria-label="l.name" :aria-pressed="locale === l.value"
      @click="setLocale(l.value)"
    >{{ l.label }}</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '@/i18n'

defineProps({ fixed: { type: Boolean, default: false } })

const { locale, setLocale, locales, t } = useI18n()
const label = computed(() => t('语言切换'))
</script>

<style scoped>
.lang {
  display: inline-flex; flex: none; gap: 2px; padding: 3px;
  background: var(--bg); border: 1px solid var(--line); border-radius: var(--r-sm);
}
.lang--fixed { position: fixed; top: 18px; right: 20px; z-index: 60; background: var(--panel); }
.lang__b {
  min-width: 30px; height: 24px; padding: 0 7px;
  border: 0; border-radius: 6px; background: transparent;
  color: var(--ink-4); font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
  cursor: pointer; transition: color .15s ease, background .15s ease, box-shadow .15s ease;
}
.lang__b:hover { color: var(--ink-2); }
.lang__b.on { background: var(--panel); color: var(--pri); box-shadow: var(--sh-1); }
</style>
