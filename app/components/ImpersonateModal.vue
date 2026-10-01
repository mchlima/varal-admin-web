<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

/**
 * "Entrar como" (spec 02, seção 7): motivo com pelo menos 10 caracteres
 * (RN-02.17) e confirmação. A API abre a sessão de 60 minutos e devolve o
 * link de uso único `{painel}/entrar-como#token=...`, válido por 2 minutos,
 * que é aberto numa nova aba (RN-02.21). O acesso é total (RN-02.18) e fica
 * na auditoria e na lista de acessos do dono.
 */
const props = defineProps<{ organizationId: string; organizationName: string; ownerName: string }>()
const open = defineModel<boolean>('open', { required: true })

const { $api } = useNuxtApp()
const formId = useId()
const reason = ref('')
const formError = ref<string | null>(null)
const submitting = ref(false)
const started = ref<{ url: string; expiresAt: string; opened: boolean } | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) return
  reason.value = ''
  formError.value = null
  started.value = null
})

function validate(): FormError[] {
  const length = reason.value.trim().length
  if (length < IMPERSONATION_REASON_MIN) {
    return [
      {
        name: 'reason',
        message: `Explique o motivo com pelo menos ${IMPERSONATION_REASON_MIN} caracteres.`,
      },
    ]
  }
  if (length > 500) return [{ name: 'reason', message: 'Use no máximo 500 caracteres.' }]
  return []
}

async function submit() {
  // A aba é aberta já no clique, antes da resposta (bloqueio de pop-up)
  const tab = prepareTab()
  submitting.value = true
  formError.value = null
  const result = await apiCall(
    $api.POST('/api/v1/admin/impersonations', {
      body: { organizationId: props.organizationId, reason: reason.value.trim() },
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
    :description="`Abre o painel de ${organizationName} com o acesso do dono por até 60 minutos.`"
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
          O link é de uso único e vale até {{ formatDateTime(started.expiresAt) }} (2 minutos). Para
          encerrar antes do fim, use "Encerrar acesso" no painel ou a tela de acessos de suporte.
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
      <UForm
        v-else
        :id="formId"
        :state="{ reason }"
        :validate="validate"
        :validate-on="['blur']"
        class="flex flex-col gap-4"
        @submit="submit"
      >
        <FormErrorAlert v-if="formError" :message="formError" />
        <p class="text-sm">
          Você vai agir no painel com as mesmas permissões do dono. Tudo o que fizer fica na
          auditoria com o seu nome, e o dono vê este acesso com o motivo.
        </p>
        <ValidatedField
          label="Motivo do acesso"
          name="reason"
          :description="`Pelo menos ${IMPERSONATION_REASON_MIN} caracteres. Ex.: ajudar a cadastrar o cardápio.`"
        >
          <UTextarea v-model="reason" :rows="3" maxlength="500" autoresize class="w-full" />
        </ValidatedField>
      </UForm>
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
          type="submit"
          :form="formId"
          icon="i-lucide-log-in"
          label="Entrar como o dono"
          :loading="submitting"
        />
      </div>
    </template>
  </UModal>
</template>
