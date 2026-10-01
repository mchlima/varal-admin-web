<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

/**
 * Troca de senha logado (spec 01, seção 7.4): encerra as sessões dos outros
 * aparelhos e renova a deste.
 */
const open = defineModel<boolean>('open', { required: true })

const session = useSessionStore()
const toast = useToast()

const state = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const formError = ref<string | null>(null)
const submitting = ref(false)
const form = useTemplateRef('form')

function reset() {
  state.currentPassword = ''
  state.newPassword = ''
  state.confirmPassword = ''
  formError.value = null
}

watch(open, (isOpen) => {
  if (isOpen) reset()
})

function validate(): FormError[] {
  const errors: FormError[] = []
  if (!state.currentPassword)
    errors.push({ name: 'currentPassword', message: 'Informe a senha atual.' })
  if (state.newPassword.length < PASSWORD_MIN_LENGTH)
    errors.push({ name: 'newPassword', message: PASSWORD_TOO_SHORT_MESSAGE })
  else if (state.newPassword.length > PASSWORD_MAX_LENGTH)
    errors.push({ name: 'newPassword', message: PASSWORD_TOO_LONG_MESSAGE })
  if (state.confirmPassword !== state.newPassword)
    errors.push({ name: 'confirmPassword', message: 'As senhas não conferem.' })
  return errors
}

async function submit() {
  submitting.value = true
  formError.value = null
  const result = await session.changePassword(state.currentPassword, state.newPassword)
  submitting.value = false

  if (result.ok) {
    open.value = false
    toast.add({
      title: 'Senha trocada.',
      description: 'As sessões nos outros aparelhos foram encerradas.',
      icon: 'i-lucide-circle-check',
      color: 'success',
    })
    return
  }

  const { code, message, fields } = result.error
  if (code === 'WRONG_CURRENT_PASSWORD') {
    form.value?.setErrors([{ name: 'currentPassword', message }])
  } else if (Object.keys(fields).length > 0) {
    form.value?.setErrors(Object.entries(fields).map(([name, text]) => ({ name, message: text })))
  } else {
    formError.value = message
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Trocar senha"
    description="Depois da troca, os outros aparelhos saem do admin."
  >
    <template #body>
      <UForm
        id="trocar-senha"
        ref="form"
        :state="state"
        :validate="validate"
        :validate-on="['blur']"
        class="flex flex-col gap-4"
        @submit="submit"
      >
        <FormErrorAlert v-if="formError" :message="formError" />
        <ValidatedField label="Senha atual" name="currentPassword">
          <PasswordInput v-model="state.currentPassword" autocomplete="current-password" />
        </ValidatedField>
        <ValidatedField label="Nova senha" name="newPassword" :description="PASSWORD_HELP">
          <PasswordInput v-model="state.newPassword" autocomplete="new-password" />
        </ValidatedField>
        <ValidatedField label="Confirme a nova senha" name="confirmPassword">
          <PasswordInput v-model="state.confirmPassword" autocomplete="new-password" />
        </ValidatedField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="neutral" variant="ghost" label="Cancelar" @click="open = false" />
        <UButton type="submit" form="trocar-senha" label="Trocar senha" :loading="submitting" />
      </div>
    </template>
  </UModal>
</template>
