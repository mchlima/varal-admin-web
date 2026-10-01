<script setup lang="ts">
/**
 * Estado vazio honesto das telas que ainda não têm API: diz o que a tela vai
 * mostrar e que ainda não está pronta.
 */
defineProps<{
  /** O que a tela vai ter quando estiver pronta (spec 02, seção 11). */
  description: string
}>()
</script>

<template>
  <section
    class="flex flex-col items-center gap-3 rounded-(--radius-card) border border-dashed border-(--color-border-strong) bg-(--color-surface) px-6 py-12 text-center"
    aria-labelledby="em-construcao"
  >
    <UIcon name="i-lucide-hammer" class="size-8 text-(--color-text-muted)" aria-hidden="true" />
    <h2 id="em-construcao" class="text-lg font-semibold">Em construção</h2>
    <p class="max-w-prose text-(--color-text-muted)">{{ description }}</p>
  </section>
</template>
