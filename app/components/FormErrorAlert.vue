<script setup lang="ts">
/** Erro de formulário: texto vermelho com ícone, nunca só cor (spec 08, seção 4). */
defineProps<{ message: string }>()
</script>

<template>
  <div
    role="alert"
    class="flex items-start gap-2 rounded-(--radius-control) border border-(--color-error) bg-(--color-surface) p-3 text-(--color-error)"
  >
    <UIcon name="i-lucide-circle-alert" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
    <p class="text-sm font-bold">{{ message }}</p>
  </div>
</template>
