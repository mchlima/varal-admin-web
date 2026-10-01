<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

/**
 * Pedido de redefinição de senha do admin. A resposta é sempre a mesma,
 * exista ou não o e-mail (RN-01.03).
 */
definePageMeta({ layout: 'access', access: 'public' })
useHead({ title: 'Esqueci a senha' })

const { $api } = useNuxtApp()

const state = reactive({ email: '' })
const sent = ref(false)
const formError = ref<string | null>(null)
const submitting = ref(false)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(): FormError[] {
  return EMAIL.test(state.email.trim())
    ? []
    : [{ name: 'email', message: 'Informe um e-mail válido.' }]
}

async function submit() {
  submitting.value = true
  formError.value = null
  try {
    const { response, error } = await $api.POST('/api/v1/admin/auth/password/forgot', {
      body: { email: state.email.trim().toLowerCase() },
    })
    // Só limite de requisições e erros do servidor aparecem; o resto é
    // sempre a mesma mensagem de "enviamos se existir" (RN-01.03).
    if (response.status === 429 || response.status >= 500)
      formError.value = toApiError(error).message
    else sent.value = true
  } catch (cause) {
    formError.value = toApiError(cause).message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col gap-1">
      <h1 class="text-xl font-extrabold">Esqueci a senha</h1>
      <p v-if="!sent" class="text-(--color-text-muted)">
        Informe o e-mail da sua conta do admin. Se ele tiver cadastro, enviamos um link para definir
        uma nova senha.
      </p>
    </div>

    <div v-if="sent" role="status" class="flex flex-col gap-4">
      <p class="flex items-start gap-2">
        <UIcon name="i-lucide-mail-check" class="mt-1 size-5 shrink-0" aria-hidden="true" />
        <span>
          Se <strong>{{ state.email.trim().toLowerCase() }}</strong> tiver cadastro no admin,
          enviamos um link para definir uma nova senha. O link vale por 1 hora. Confira também a
          caixa de spam.
        </span>
      </p>
      <UButton to="/entrar" color="primary" variant="outline" label="Voltar para entrar" block />
    </div>

    <template v-else>
      <UForm
        :state="state"
        :validate="validate"
        :validate-on="['blur']"
        class="flex flex-col gap-4"
        @submit="submit"
      >
        <FormErrorAlert v-if="formError" :message="formError" />
        <UFormField label="E-mail" name="email">
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="username"
            inputmode="email"
            autofocus
            class="w-full"
          />
        </UFormField>
        <UButton type="submit" label="Enviar link" block :loading="submitting" />
      </UForm>
      <UButton
        to="/entrar"
        variant="link"
        color="primary"
        label="Voltar para entrar"
        class="self-center"
      />
    </template>
  </div>
</template>
