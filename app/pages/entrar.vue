<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

/** Login do admin da plataforma: e-mail e senha (spec 01, seção 7.1). */
definePageMeta({ layout: 'access', access: 'guest' })
useHead({ title: 'Entrar' })

const route = useRoute()
const session = useSessionStore()

const state = reactive({ email: '', password: '' })
const formError = ref<string | null>(null)
const submitting = ref(false)
const form = useTemplateRef('form')

function validate(): FormError[] {
  const errors: FormError[] = []
  if (!state.email.trim()) errors.push({ name: 'email', message: 'Informe o e-mail.' })
  if (!state.password) errors.push({ name: 'password', message: 'Informe a senha.' })
  return errors
}

async function submit() {
  submitting.value = true
  formError.value = null
  const result = await session.login(state.email.trim().toLowerCase(), state.password)
  submitting.value = false

  if (result.ok) {
    await navigateTo(safeRedirect(route.query.voltar), { replace: true })
    return
  }

  const { fields, message } = result.error
  if (Object.keys(fields).length > 0) {
    form.value?.setErrors(Object.entries(fields).map(([name, text]) => ({ name, message: text })))
  } else {
    formError.value = message
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col gap-1">
      <h1 class="text-xl font-extrabold">Entrar</h1>
      <p class="text-(--color-text-muted)">Use o e-mail e a senha da sua conta do admin.</p>
    </div>

    <UForm
      ref="form"
      :state="state"
      :validate="validate"
      :validate-on="['blur']"
      class="flex flex-col gap-4"
      @submit="submit"
    >
      <FormErrorAlert v-if="formError" :message="formError" />

      <ValidatedField label="E-mail" name="email">
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="username"
          inputmode="email"
          autofocus
          class="w-full"
        />
      </ValidatedField>

      <ValidatedField label="Senha" name="password">
        <PasswordInput v-model="state.password" autocomplete="current-password" />
      </ValidatedField>

      <UButton type="submit" label="Entrar" block :loading="submitting" />
    </UForm>

    <UButton
      to="/esqueci-a-senha"
      variant="link"
      color="primary"
      label="Esqueci a senha"
      class="self-center"
    />
  </div>
</template>
