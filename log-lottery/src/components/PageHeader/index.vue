<script setup lang='ts'>
const props = defineProps<{
    title: string
}>()
</script>

<template>
  <header class="min-w-0">
    <h1 class="text-xl font-bold leading-tight tracking-tight text-base-content sm:text-2xl md:text-3xl md:leading-snug">
      {{ props.title }}
    </h1>
    <div class="button-group my-3 min-w-0 sm:my-4">
      <slot name="buttons" />
    </div>
    <div class="divider mt-0" />
    <div>
      <slot name="alerts" />
    </div>
  </header>
</template>

<style scoped>

</style>
