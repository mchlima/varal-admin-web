<script setup lang="ts">
/** Telas de acesso (entrar, esqueci a senha, definir senha): um cartão centralizado. */
</script>

<template>
  <main class="grid min-h-dvh place-items-center px-4 py-8">
    <div class="flex w-full max-w-md flex-col gap-6">
      <div class="flex flex-col items-center gap-1">
        <img src="/logo.svg" alt="Varal" width="190" height="64" class="h-14 w-auto" />
        <span class="text-xs font-bold tracking-wide text-(--color-text-muted) uppercase"
          >Admin da plataforma</span
        >
      </div>
      <UCard>
        <slot />
      </UCard>
    </div>
  </main>
</template>
