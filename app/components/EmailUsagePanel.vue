<script setup lang="ts">
/** Busca `GET /admin/emails/usage` e mostra o cartão, com carregando e erro. */
const { $api } = useNuxtApp()

const usage = ref<EmailUsage | null>(null)
const error = ref<string | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data, error: apiError } = await $api.GET('/api/v1/admin/emails/usage')
    if (data) usage.value = data
    else error.value = toApiError(apiError).message
  } catch (cause) {
    error.value = toApiError(cause).message
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <EmailUsageCard v-if="usage" :usage="usage" />
  <UCard v-else-if="loading" aria-busy="true">
    <p class="text-(--color-text-muted)">Carregando o consumo de e-mails…</p>
  </UCard>
  <UCard v-else>
    <div class="flex flex-col items-start gap-3">
      <FormErrorAlert :message="error ?? UNKNOWN_ERROR_MESSAGE" />
      <UButton
        color="primary"
        variant="outline"
        icon="i-lucide-refresh-cw"
        label="Tentar de novo"
        @click="load"
      />
    </div>
  </UCard>
</template>
