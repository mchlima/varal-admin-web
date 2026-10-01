<script setup lang="ts">
/**
 * "Entrar como" (spec 02, seção 7): só a confirmação, sem motivo e sem prazo
 * (RN-02.17); o acesso dura até o admin encerrar. A API devolve o link de uso
 * único `{painel}/entrar-como#token=...`, válido por 2 minutos, que é aberto
 * numa nova aba (RN-02.21). O acesso é total (RN-02.18) e fica na auditoria e
 * na lista de acessos do dono.
 */
const props = defineProps<{ organizationId: string; organizationName: string; ownerName: string }>()
const open = defineModel<boolean>('open', { required: true })

const { $api } = useNuxtApp()
const formError = ref<string | null>(null)
const submitting = ref(false)
const started = ref<{ url: string; expiresAt: string; opened: boolean } | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) return
  formError.value = null
  started.value = null
})

async function submit() {
  // A aba é aberta já no clique, antes da resposta (bloqueio de pop-up)
  const tab = prepareTab()
  submitting.value = true
  formError.value = null
  const result = await apiCall(
    $api.POST('/api/v1/admin/impersonations', {
      body: { organizationId: props.organizationId },
    }),
  )
  submitting.value = false
  if (!result.ok) {
    tab.close()
    formError.value = result.error.message
    return
  }
  const opened = tab.navigate(result.data.handoffUrl)
  started.value = { url: result.data.handoffUrl, expiresAt: result.data.handoffExpiresAt, opened }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Entrar como ${ownerName}`"
    :description="`Abre o painel de ${organizationName} com o acesso do dono, até você encerrar.`"
  >
    <template #body>
      <div v-if="started" class="flex flex-col gap-4" data-testid="impersonation-started">
        <p class="flex items-start gap-2 font-bold">
          <UIcon
            name="i-lucide-circle-check"
            class="mt-1 size-5 shrink-0 text-(--color-status-ready-text)"
            aria-hidden="true"
          />
          <span v-if="started.opened">O painel foi aberto numa nova aba.</span>
          <span v-else>O acesso foi aberto. Use o botão abaixo para entrar no painel.</span>
        </p>
        <p class="text-sm text-(--color-text-muted)">
          O link é de uso único e vale até {{ formatDateTime(started.expiresAt) }} (2 minutos). O
          acesso não tem prazo: para encerrar, use "Encerrar acesso" no painel ou a tela de acessos
          de suporte.
        </p>
        <UButton
          :to="started.url"
          target="_blank"
          rel="noopener noreferrer"
          external
          color="primary"
          :variant="started.opened ? 'outline' : 'solid'"
          icon="i-lucide-external-link"
          label="Abrir o painel"
          data-testid="impersonation-link"
        />
      </div>
      <div v-else class="flex flex-col gap-4">
        <FormErrorAlert v-if="formError" :message="formError" />
        <p class="text-sm">
          Você vai agir no painel com as mesmas permissões do dono, até encerrar o acesso. Tudo o
          que fizer fica na auditoria com o seu nome, e o dono vê este acesso na conta dele.
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton
          color="neutral"
          variant="ghost"
          :label="started ? 'Fechar' : 'Cancelar'"
          @click="open = false"
        />
        <UButton
          v-if="!started"
          icon="i-lucide-log-in"
          label="Entrar como o dono"
          :loading="submitting"
          @click="submit"
        />
      </div>
    </template>
  </UModal>
</template>
