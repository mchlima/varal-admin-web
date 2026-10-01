<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

/**
 * Editar organização (`organizations:update`): nome e nome e e-mail do dono.
 * Trocar o e-mail de um dono que ainda não definiu a senha manda um convite
 * novo para o e-mail novo (API).
 */
const props = defineProps<{ organization: OrganizationDetail }>()
const emit = defineEmits<{ saved: [OrganizationDetail] }>()
const open = defineModel<boolean>('open', { required: true })

const { $api } = useNuxtApp()
const formId = useId()
const state = reactive({ name: '', ownerName: '', ownerEmail: '' })
const formError = ref<string | null>(null)
const submitting = ref(false)
const form = useTemplateRef('form')

watch(open, (isOpen) => {
  if (!isOpen) return
  state.name = props.organization.name
  state.ownerName = props.organization.owner?.name ?? ''
  state.ownerEmail = props.organization.owner?.email ?? ''
  formError.value = null
})

const hasOwner = computed(() => props.organization.owner !== null)
const emailChanged = computed(
  () =>
    hasOwner.value &&
    state.ownerEmail.trim().toLowerCase() !== props.organization.owner?.email.toLowerCase(),
)

function validate(): FormError[] {
  const errors: FormError[] = []
  requireLength(errors, 'name', state.name, 'o nome da organização', 2, 120)
  if (hasOwner.value) {
    requireLength(errors, 'owner.name', state.ownerName, 'o nome do dono', 2, 120)
    requireEmail(errors, 'owner.email', state.ownerEmail)
  }
  return errors
}

async function submit() {
  submitting.value = true
  formError.value = null
  const owner = props.organization.owner
  const ownerChanges: { name?: string; email?: string } = {}
  if (owner && state.ownerName.trim() !== owner.name) ownerChanges.name = state.ownerName.trim()
  if (owner && emailChanged.value) ownerChanges.email = state.ownerEmail.trim().toLowerCase()
  const result = await apiCall(
    $api.PATCH('/api/v1/admin/organizations/{id}', {
      params: { path: { id: props.organization.id } },
      body: {
        ...(state.name.trim() !== props.organization.name ? { name: state.name.trim() } : {}),
        ...(Object.keys(ownerChanges).length > 0 ? { owner: ownerChanges } : {}),
      },
    }),
  )
  submitting.value = false
  if (result.ok) {
    open.value = false
    emit('saved', result.data)
    return
  }
  const { code, message, fields } = result.error
  if (code === 'OWNER_EMAIL_TAKEN') form.value?.setErrors([{ name: 'owner.email', message }])
  else if (Object.keys(fields).length > 0) form.value?.setErrors(fieldErrors(fields))
  else formError.value = message
}
</script>

<template>
  <UModal v-model:open="open" title="Editar organização">
    <template #body>
      <UForm
        :id="formId"
        ref="form"
        :state="state"
        :validate="validate"
        :validate-on="['blur']"
        class="flex flex-col gap-4"
        @submit="submit"
      >
        <FormErrorAlert v-if="formError" :message="formError" />
        <UFormField label="Nome da organização" name="name">
          <UInput v-model="state.name" maxlength="120" class="w-full" />
        </UFormField>
        <template v-if="hasOwner">
          <UFormField label="Nome do dono" name="owner.name">
            <UInput v-model="state.ownerName" maxlength="120" class="w-full" />
          </UFormField>
          <UFormField
            label="E-mail do dono"
            name="owner.email"
            :help="
              emailChanged && organization.owner?.inviteStatus !== 'accepted'
                ? 'Um convite novo vai para o e-mail novo.'
                : undefined
            "
          >
            <UInput v-model="state.ownerEmail" type="email" inputmode="email" class="w-full" />
          </UFormField>
        </template>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="neutral" variant="ghost" label="Cancelar" @click="open = false" />
        <UButton type="submit" :form="formId" label="Salvar" :loading="submitting" />
      </div>
    </template>
  </UModal>
</template>
