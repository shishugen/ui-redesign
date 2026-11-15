<template>
  <component :is="currentHome" />
</template>

<script setup>
import { computed } from 'vue'
import { useSessionStore } from '@/stores/session'
import AdminHome from '@/views/home/admin.vue'
import TeacherHome from '@/views/home/teacher.vue'
import StudentHome from '@/views/home/student.vue'

const session = useSessionStore()
const map = { admin: AdminHome, teacher: TeacherHome, student: StudentHome }
// 首页只按真实账号角色渲染，不提供任何「预览视图」切换
const currentHome = computed(() => map[session.role] || AdminHome)
</script>
