<template>
  <!--
    学习中心「作业」入口：师生共用同一个菜单项，组件内按角色分流（设计文档 §5.5）。
    学生看自己的完成清单；老师与管理员看**同一个**完成看板（2026-10-01 定稿）。
    管理员不单独分支：数据范围在后端 boardOwner() 一处放开，前端连角色判断都不留。
  -->
  <TeacherBoard v-if="teacher" />
  <StudentComplete v-else />
</template>

<script setup name="HomeworkIndex">
import { computed } from 'vue'
import { isAdminOrTeacher } from '@/utils/user'
import StudentComplete from './student.vue'
import TeacherBoard from './teacher.vue'

// 取登录人的角色，不依赖后端权限键 —— 学生即使被勾了菜单也只会看到自己的清单
const teacher = computed(() => isAdminOrTeacher())
</script>
