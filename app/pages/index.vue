<script setup lang="ts">
// Página provisória da fase 0: prova o tema do Nuxt UI com a spec 08.
// As telas do admin (spec 02) entram nas próximas fases.
</script>

<template>
  <main class="grid min-h-dvh place-items-center px-4 py-8">
    <UCard class="w-full max-w-md" :ui="{ body: 'flex flex-col items-center gap-6 text-center' }">
      <img src="/logo.svg" alt="Varal" width="190" height="64" class="h-16 w-auto" />
      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-extrabold">Em breve.</h1>
        <p class="text-muted">O admin da plataforma Varal está em construção.</p>
      </div>
      <UButton label="Entrar" block disabled />
    </UCard>
  </main>
</template>
