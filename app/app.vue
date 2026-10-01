<script setup lang="ts">
import { pt_br } from '@nuxt/ui/locale'

useHead({
  titleTemplate: (title) => (title ? `${title} · Varal Admin` : 'Varal Admin'),
})
</script>

<template>
  <UApp :locale="pt_br" :toaster="{ position: 'top-center' }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
