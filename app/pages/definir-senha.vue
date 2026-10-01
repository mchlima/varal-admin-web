<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

/**
 * Convite e redefinição de senha do admin (spec 01, seção 7.4). O link é
 * `/definir-senha#token=...&tipo=convite|redefinicao`: o token vem no
 * fragmento, é guardado só em memória e apagado da barra de endereço.
 */
definePageMeta({ layout: 'access', access: 'public' })

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const { $api } = useNuxtApp()

const link = parsePasswordLink(route.hash)
const kind = link?.kind ?? 'redefinicao'

useHead({ title: kind === 'convite' ? 'Criar senha' : 'Definir nova senha' })

onMounted(() => {
  // Tira o token da URL (histórico, favoritos, compartilhamento de tela).
  if (route.hash) void router.replace({ path: route.path, query: route.query, hash: '' })
})

const state = reactive({ password: '', confirmPassword: '' })
const formError = ref<string | null>(null)
const invalidToken = ref(false)
const done = ref(false)
const submitting = ref(false)
const form = useTemplateRef('form')

function validate(): FormError[] {
  const errors: FormError[] = []
  if (state.password.length < PASSWORD_MIN_LENGTH)
    errors.push({ name: 'password', message: PASSWORD_TOO_SHORT_MESSAGE })
  else if (state.password.length > PASSWORD_MAX_LENGTH)
    errors.push({ name: 'password', message: PASSWORD_TOO_LONG_MESSAGE })
  if (state.confirmPassword !== state.password)
    errors.push({ name: 'confirmPassword', message: 'As senhas não conferem.' })
  return errors
}

async function submit() {
  if (!link) return
  submitting.value = true
  formError.value = null
  try {
    const { response, error } = await $api.POST('/api/v1/admin/auth/password/reset', {
      body: { token: link.token, password: state.password },
    })
    if (response.ok) {
      // A redefinição encerra todas as sessões desse usuário.
      session.clear()
      done.value = true
      return
    }
    const info = toApiError(error)
    if (info.code === 'INVALID_PASSWORD_TOKEN' || 'token' in info.fields) {
      invalidToken.value = true
      formError.value = info.message
    } else if ('password' in info.fields) {
      form.value?.setErrors([{ name: 'password', message: info.fields.password ?? info.message }])
    } else {
      formError.value = info.message
    }
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
      <h1 class="text-xl font-extrabold">
        {{ kind === 'convite' ? 'Criar sua senha' : 'Definir nova senha' }}
      </h1>
      <p v-if="link && !done && !invalidToken" class="text-(--color-text-muted)">
        {{
          kind === 'convite'
            ? 'Boas-vindas ao admin do Varal. Crie a senha para entrar.'
            : 'Escolha uma senha nova. Depois disso, todos os aparelhos saem do admin.'
        }}
      </p>
    </div>

    <!-- Sem token no link -->
    <div v-if="!link" class="flex flex-col gap-4">
      <FormErrorAlert
        message="Este link está incompleto. Abra de novo o link do e-mail ou peça um novo."
      />
      <UButton
        to="/esqueci-a-senha"
        color="primary"
        variant="outline"
        label="Pedir um novo link"
        block
      />
    </div>

    <!-- Senha definida -->
    <div v-else-if="done" role="status" class="flex flex-col gap-4">
      <p class="flex items-start gap-2">
        <UIcon name="i-lucide-circle-check" class="mt-1 size-5 shrink-0" aria-hidden="true" />
        <span>Senha definida. Entre com o seu e-mail e a nova senha.</span>
      </p>
      <UButton to="/entrar" label="Entrar" block />
    </div>

    <!-- Link vencido, usado ou trocado -->
    <div v-else-if="invalidToken" class="flex flex-col gap-4">
      <FormErrorAlert :message="formError ?? 'Este link não vale mais.'" />
      <p class="text-(--color-text-muted)">
        {{
          kind === 'convite'
            ? 'Peça um novo convite a um administrador do Varal.'
            : 'Peça um novo link em "Esqueci a senha". O link vale por 1 hora e só pode ser usado uma vez.'
        }}
      </p>
      <UButton
        v-if="kind !== 'convite'"
        to="/esqueci-a-senha"
        color="primary"
        variant="outline"
        label="Pedir um novo link"
        block
      />
    </div>

    <UForm
      v-else
      ref="form"
      :state="state"
      :validate="validate"
      :validate-on="['blur']"
      class="flex flex-col gap-4"
      @submit="submit"
    >
      <FormErrorAlert v-if="formError" :message="formError" />
      <UFormField label="Nova senha" name="password" :help="PASSWORD_HELP">
        <PasswordInput v-model="state.password" autocomplete="new-password" />
      </UFormField>
      <UFormField label="Confirme a nova senha" name="confirmPassword">
        <PasswordInput v-model="state.confirmPassword" autocomplete="new-password" />
      </UFormField>
      <UButton
        type="submit"
        :label="kind === 'convite' ? 'Criar senha' : 'Definir senha'"
        block
        :loading="submitting"
      />
    </UForm>
  </div>
</template>
