<script setup lang="ts">
useHead({ title: 'E-mails' })
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="E-mails" description="Consumo do mês no plano de envio e histórico." />
    <!-- Consumo do mês (RN-01.04) -->
    <EmailUsagePanel />
    <UnderConstruction
      description="Aqui vai ficar o histórico de envios, com destinatário, tipo e situação de cada e-mail."
    />
  </div>
</template>
