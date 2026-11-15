<template>
  <!-- 前端案例显示（菜单 component = training/course/case/index）：与课程共用列表 -->
  <div class="cl-shell">
    <CourseList :course-classify="1" :course-title="t('案例')" />
  </div>
</template>

<script setup name="Case">
import { t } from '@/i18n'
import CourseList from '@/views/training/course/courseList/index.vue'
</script>

<style scoped>
/* 固定 100% + overflow:hidden 会裁掉超一屏的列表，主内容区滚动条滚不动 */
.cl-shell { min-height: 100%; }
</style>
