<template>
  <!-- 案例管理（菜单 component = manager/course/case/index）：与课程管理共用列表，只是分类不同 -->
  <div class="cl-shell">
    <CourseList :course-classify="1" :course-title="t('案例')" />
  </div>
</template>

<script setup name="Course">
import { t } from '@/i18n'
import CourseList from '@/views/manager/course/courseList/index.vue'
</script>

<style scoped>
/* 固定 100% + overflow:hidden 会裁掉超一屏的列表，主内容区滚动条滚不动 */
.cl-shell { min-height: 100%; }
</style>
