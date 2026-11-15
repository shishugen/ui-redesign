<template>
  <a-config-provider :locale="antdLocale" :theme="themeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import enUS from 'ant-design-vue/es/locale/en_US'
import { themeConfig } from './theme'
import { useI18n } from './i18n'

const { locale } = useI18n()
// antd 内置文案（分页、日期、空状态、确认框等）跟着一起切
const antdLocale = computed(() => (locale.value === 'en-US' ? enUS : zhCN))
</script>
