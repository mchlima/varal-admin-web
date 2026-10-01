<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <UCard aria-busy="true">
    <p class="flex items-center gap-2 text-(--color-text-muted)">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" aria-hidden="true" />
      {{ label ?? 'Carregando…' }}
    </p>
  </UCard>
</template>
