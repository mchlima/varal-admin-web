<script setup lang="ts">
/** Estado vazio honesto: diz o que não há e, quando faz sentido, o que fazer. */
defineProps<{ icon?: string; title: string; description?: string }>()
</script>

<template>
  <section
    class="flex flex-col items-center gap-2 rounded-(--radius-card) border border-dashed border-(--color-border-strong) bg-(--color-surface) px-6 py-10 text-center"
    data-testid="empty-state"
  >
    <UIcon
      :name="icon ?? 'i-lucide-inbox'"
      class="size-8 text-(--color-text-muted)"
      aria-hidden="true"
    />
    <h2 class="text-lg font-semibold">{{ title }}</h2>
    <p v-if="description" class="max-w-prose text-(--color-text-muted)">{{ description }}</p>
    <slot />
  </section>
</template>
