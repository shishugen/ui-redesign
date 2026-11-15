<template>
  <header class="page-hd">
    <div class="page-hd__main">
      <div v-if="crumb.length" class="page-hd__crumb">
        <template v-for="(p, i) in crumb" :key="i">
          <i v-if="i">/</i>
          <b v-if="i === crumb.length - 1">{{ p }}</b>
          <span v-else>{{ p }}</span>
        </template>
      </div>
      <h1>{{ title }}</h1>
      <div v-if="sub" class="page-hd__sub">{{ sub }}</div>
    </div>
    <div class="page-hd__acts">
      <slot name="meta" />
      <slot name="acts" />
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  sub: { type: String, default: '' },
  crumb: { type: Array, default: () => [] }
})
</script>
