<script setup lang="ts">
/** Tela aberta sem a permissão exigida (RN-02.01): diz o motivo e o que fazer. */
</script>

<template>
  <section
    class="flex flex-col items-start gap-3 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-6"
    aria-labelledby="sem-permissao"
    data-testid="no-permission"
  >
    <UIcon name="i-lucide-lock" class="size-8 text-(--color-text-muted)" aria-hidden="true" />
    <h1 id="sem-permissao" class="text-xl font-extrabold">Sem acesso a esta tela</h1>
    <p class="max-w-prose text-(--color-text-muted)">
      O seu usuário não tem a permissão necessária. Se você precisa deste acesso, peça a um Super
      admin para ajustar os seus papéis.
    </p>
    <UButton
      to="/"
      color="primary"
      variant="outline"
      icon="i-lucide-house"
      label="Voltar ao início"
    />
  </section>
</template>
