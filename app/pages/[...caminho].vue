<script setup lang="ts">
useHead({ title: 'Página não encontrada' })
</script>

<template>
  <div class="flex flex-col items-start gap-4">
    <PageHeader
      title="Página não encontrada"
      description="O endereço não existe ou mudou de lugar."
    />
    <UButton
      to="/"
      color="primary"
      variant="outline"
      icon="i-lucide-house"
      label="Voltar ao início"
    />
  </div>
</template>
