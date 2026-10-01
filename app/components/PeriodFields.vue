<script setup lang="ts">
/** Período em dias de Brasília para os filtros (de/até, inclusive). */
const from = defineModel<string>('from', { required: true })
const to = defineModel<string>('to', { required: true })
</script>

<template>
  <UFormField label="De" name="from">
    <UInput v-model="from" type="date" :max="to || undefined" class="w-full" />
  </UFormField>
  <UFormField label="Até" name="to">
    <UInput v-model="to" type="date" :min="from || undefined" class="w-full" />
  </UFormField>
</template>
