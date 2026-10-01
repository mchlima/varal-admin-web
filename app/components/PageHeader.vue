<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <header class="flex flex-col gap-1">
    <h1 class="text-xl font-extrabold lg:text-2xl">{{ title }}</h1>
    <p v-if="description" class="text-(--color-text-muted)">{{ description }}</p>
  </header>
</template>
