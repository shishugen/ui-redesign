<template>
  <!-- 课程管理（菜单 component = manager/course/course/index）：壳页，内容在 courseList -->
  <div class="cl-shell">
    <CourseList :course-classify="0" />
  </div>
</template>

<script setup name="Course">
import CourseList from '@/views/manager/course/courseList/index.vue'
</script>

<style scoped>
/* 固定 100% + overflow:hidden 会裁掉超一屏的列表，主内容区滚动条滚不动 */
.cl-shell { min-height: 100%; }
</style>
