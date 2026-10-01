<script setup lang="ts">
/** Falha ao carregar: mensagem da API e botão para tentar de novo. */
defineProps<{ message: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <FormErrorAlert :message="message" />
    <UButton
      color="primary"
      variant="outline"
      icon="i-lucide-refresh-cw"
      label="Tentar de novo"
      @click="$emit('retry')"
    />
  </div>
</template>
