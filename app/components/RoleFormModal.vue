<script setup lang="ts">
/** Novo papel personalizado (RN-02.07): nome, descrição e permissões. */
defineProps<{ groups: PermissionGroup[] }>()
const emit = defineEmits<{ created: [Role] }>()
const open = defineModel<boolean>('open', { required: true })

const { $api } = useNuxtApp()
const formId = useId()
const state = reactive<RoleForm>({ name: '', description: '' })
const permissions = ref<Permission[]>([])
const formError = ref<string | null>(null)
const submitting = ref(false)
const form = useTemplateRef('form')

watch(open, (isOpen) => {
  if (!isOpen) return
  state.name = ''
  state.description = ''
  permissions.value = []
  formError.value = null
})

async function submit() {
  submitting.value = true
  formError.value = null
  const result = await apiCall(
    $api.POST('/api/v1/admin/roles', {
      body: {
        name: state.name.trim(),
        description: state.description.trim(),
        permissions: permissions.value,
      },
    }),
  )
  submitting.value = false
  if (result.ok) {
    open.value = false
    emit('created', result.data)
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
    title="Novo papel"
    description="Um grupo de permissões para dar aos usuários do admin."
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <UForm
        :id="formId"
        ref="form"
        :state="state"
        :validate="() => validateRole(state)"
        :validate-on="['blur']"
        class="flex flex-col gap-4"
        @submit="submit"
      >
        <FormErrorAlert v-if="formError" :message="formError" />
        <ValidatedField label="Nome" name="name">
          <UInput v-model="state.name" maxlength="60" class="w-full" />
        </ValidatedField>
        <ValidatedField label="Descrição" name="description" hint="Opcional">
          <UTextarea
            v-model="state.description"
            maxlength="300"
            :rows="2"
            autoresize
            class="w-full"
          />
        </ValidatedField>
        <PermissionChecklist v-model="permissions" :groups="groups" />
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="neutral" variant="ghost" label="Cancelar" @click="open = false" />
        <UButton type="submit" :form="formId" label="Criar papel" :loading="submitting" />
      </div>
    </template>
  </UModal>
</template>
