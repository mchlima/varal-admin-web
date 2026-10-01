<script setup lang="ts">
/** Chip de status com texto e ícone, nunca só cor (spec 08, princípio 3). */
defineProps<{ status: StatusDisplay; size?: 'sm' | 'md' | 'lg' }>()
</script>

<template>
  <UBadge
    :color="status.color"
    :variant="status.color === 'primary' ? 'solid' : 'soft'"
    :size="size ?? 'md'"
    :icon="status.icon"
    :label="status.label"
    class="shrink-0"
  />
</template>
