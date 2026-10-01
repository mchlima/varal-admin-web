<script setup lang="ts">
/**
 * Convidar usuário do admin (`POST /admin/users`): nome, e-mail, papéis e
 * permissões avulsas. O convidado recebe o e-mail para definir a senha.
 */
const props = defineProps<{ roles: Role[]; groups: PermissionGroup[] }>()
const emit = defineEmits<{ invited: [AdminUser] }>()
const open = defineModel<boolean>('open', { required: true })

const { $api } = useNuxtApp()
const formId = useId()
const state = reactive<InviteAdminForm>({ name: '', email: '' })
const roleIds = ref<string[]>([])
const permissions = ref<Permission[]>([])
const formError = ref<string | null>(null)
const submitting = ref(false)
const form = useTemplateRef('form')

watch(open, (isOpen) => {
  if (!isOpen) return
  state.name = ''
  state.email = ''
  roleIds.value = []
  permissions.value = []
  formError.value = null
})

const roleItems = computed(() =>
  props.roles.map((role) => ({ label: role.name, value: role.id, description: role.description })),
)

async function submit() {
  submitting.value = true
  formError.value = null
  const result = await apiCall(
    $api.POST('/api/v1/admin/users', {
      body: {
        name: state.name.trim(),
        email: state.email.trim().toLowerCase(),
        roleIds: roleIds.value,
        permissions: permissions.value,
      },
    }),
  )
  submitting.value = false
  if (result.ok) {
    open.value = false
    emit('invited', result.data)
    return
  }
  const { fields, message } = result.error
  if (Object.keys(fields).length > 0) form.value?.setErrors(fieldErrors(fields))
  else formError.value = message
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Convidar usuário do admin"
    description="A pessoa recebe um e-mail para definir a senha."
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <UForm
        :id="formId"
        ref="form"
        :state="state"
        :validate="() => validateInviteAdmin(state)"
        :validate-on="['blur']"
        class="flex flex-col gap-4"
        @submit="submit"
      >
        <FormErrorAlert v-if="formError" :message="formError" />
        <ValidatedField label="Nome" name="name">
          <UInput v-model="state.name" maxlength="120" autocomplete="off" class="w-full" />
        </ValidatedField>
        <ValidatedField label="E-mail" name="email">
          <UInput
            v-model="state.email"
            type="email"
            inputmode="email"
            autocomplete="off"
            class="w-full"
          />
        </ValidatedField>
        <ValidatedField label="Papéis" name="roleIds">
          <UCheckboxGroup v-model="roleIds" :items="roleItems" />
        </ValidatedField>
        <details class="rounded-(--radius-control) border border-(--color-border) p-3">
          <summary class="min-h-(--size-touch-min) cursor-pointer content-center font-bold">
            Permissões avulsas (opcional)
          </summary>
          <PermissionChecklist v-model="permissions" :groups="groups" class="mt-3" />
        </details>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="neutral" variant="ghost" label="Cancelar" @click="open = false" />
        <UButton
          type="submit"
          :form="formId"
          icon="i-lucide-send"
          label="Enviar convite"
          :loading="submitting"
        />
      </div>
    </template>
  </UModal>
</template>
