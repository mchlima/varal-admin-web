<script setup lang="ts">
/** Próxima página de uma lista por cursor. */
defineProps<{ loading: boolean }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <div class="flex justify-center">
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-chevrons-down"
      label="Carregar mais"
      :loading="loading"
      @click="$emit('click')"
    />
  </div>
</template>
