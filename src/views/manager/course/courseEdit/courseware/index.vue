<template>
  <div class="cw">
    <FileList :course-id="String(courseId)" :relation-type="2" :can-edit="canEdit" />
  </div>
</template>

<script setup name="CourseWare">
import FileList from '../components/FileList/index.vue'

defineProps({
  courseId: { type: String, default: '0' },
  canEdit: { type: Boolean, default: false }
})
</script>

<style scoped>
.cw {
  background: var(--panel); border: 1px solid var(--line);
  border-radius: var(--r); padding: 14px;
}
</style>
