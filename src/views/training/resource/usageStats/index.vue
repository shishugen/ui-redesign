<template>
  <div class="usage-stats-shell">
    <UsageStats />
  </div>
</template>

<script setup>
// 资源中心下的「用量统计」入口：整页就是后台配额页那个 usageStats 组件，这里只补一层壳。
//
// 为什么是壳而不是复制一份 —— 那页一千多行里全是口径：窗口边界切在次日零点、那批没关机的
// carryover 怎么算、四档使用范围互斥、台数可加而人数不可加、计量新鲜度超 5 分钟要变黄。
// 复制等于把同一套口径维护两遍，漏改一遍就会出现「两个入口两个数」，而那正是最难查的 bug。
// 项目里已有同方向的先例：班级用量页就是 import 了 quotaUserTable.vue 与 runningHistory.js。
//
// 权限与后台那个入口完全一致，因为本来就是同一个组件：取数要 kube:resourceAllocation:list，
// 「补齐历史统计」那颗按钮另要 kube:resourceAllocation:backfill。
// 迁移说明：旧页用 v-hasPermi 指令做按钮级判定，新项目未注册该指令（D17），
// 组件内已改成同一份判据的 checkPermi()。
//
// 这条菜单没往任何角色上挂：超管在后端按 user_id 直接取整棵菜单树，看得见；教师 / 学生角色
// 没被授过，不会突然在自己的资源中心里多出一页全校账目 —— 这页摆的是按人列的额度与消耗，
// 本来就不该出现在学习端。
import UsageStats from '@/views/manager/kube/quota/usageStats.vue'
</script>

<style scoped>
/* 壳不自带留白：被包住的那一页自己带卡片间距，套一层 padding 会多出一圈空白 */
.usage-stats-shell {
  padding: 0 0 20px;
}
</style>
