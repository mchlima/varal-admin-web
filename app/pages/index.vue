<script setup lang="ts">
useHead({ title: 'Início' })

const session = useSessionStore()
const firstName = computed(() => session.admin?.name.trim().split(/\s+/)[0] ?? '')
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      :title="firstName ? `Olá, ${firstName}` : 'Início'"
      description="Resumo da plataforma. Os cartões de organizações e os atalhos chegam com os próximos módulos."
    />
    <!-- Alerta de e-mail do plano (RN-01.04, CA-01.09) -->
    <EmailUsagePanel />
  </div>
</template>
