<template>
  <section class="card">
    <header v-if="title || $slots.acts" class="card__hd">
      <h2 v-if="title">{{ title }}</h2>
      <span v-if="sub" class="hd-sub">{{ sub }}</span>
      <div class="hd-act"><slot name="acts" /></div>
    </header>
    <div class="card__bd" :class="{ flush }"><slot /></div>
    <footer v-if="$slots.foot" class="card__ft"><slot name="foot" /></footer>
  </section>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  sub: { type: String, default: '' },
  flush: { type: Boolean, default: false }
})
</script>
