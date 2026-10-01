<script setup lang="ts">
/**
 * Papel (RN-02.04 e RN-02.07): o Super admin tem sempre todas as permissões
 * e não muda; os outros papéis do sistema mantêm o nome, mas descrição e
 * permissões podem mudar; os personalizados mudam tudo e podem ser
 * excluídos se ninguém os tiver (`ROLE_IN_USE`). Sem `admin.roles:manage`,
 * só leitura.
 */
definePageMeta({ permission: ['admin.roles:manage', 'admin.users:manage'] })

const { $api } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { can } = usePermissions()
const { roles, error: loadError, loading, load } = useRoles()
const { groups } = usePermissionCatalog()

const id = computed(() => String(route.params.id))
const role = computed(() => roles.value.find((item) => item.id === id.value) ?? null)
useHead({ title: () => role.value?.name ?? 'Papel' })

const state = reactive<RoleForm>({ name: '', description: '' })
const permissions = ref<Permission[]>([])
const formError = ref<string | null>(null)
const saving = ref(false)
const deleteOpen = ref(false)
const form = useTemplateRef('form')

watch(
  role,
  (current) => {
    if (!current) return
    state.name = current.name
    state.description = current.description
    permissions.value = [...current.permissions]
  },
  { immediate: true },
)

onMounted(load)

const canManage = computed(() => can('admin.roles:manage'))
const editable = computed(() => canManage.value && (role.value?.editable ?? false))
const isSuperAdmin = computed(() => role.value?.systemKey === SUPER_ADMIN_KEY)

async function save() {
  if (!role.value) return
  saving.value = true
  formError.value = null
  const result = await apiCall(
    $api.PATCH('/api/v1/admin/roles/{id}', {
      params: { path: { id: id.value } },
      body: {
        ...(role.value.isSystem ? {} : { name: state.name.trim() }),
        description: state.description.trim(),
        permissions: permissions.value,
      },
    }),
  )
  saving.value = false
  if (result.ok) {
    roles.value = roles.value.map((item) => (item.id === result.data.id ? result.data : item))
    toast.add({
      title: 'Papel salvo.',
      description: 'Vale na próxima ação de cada usuário com este papel.',
      icon: 'i-lucide-circle-check',
      color: 'success',
    })
    return
  }
  const { fields, message } = result.error
  if (Object.keys(fields).length > 0) form.value?.setErrors(fieldErrors(fields))
  else formError.value = message
}

async function remove() {
  const result = await apiCall(
    $api.DELETE('/api/v1/admin/roles/{id}', { params: { path: { id: id.value } } }),
  )
  if (result.ok) {
    toast.add({ title: 'Papel excluído.', icon: 'i-lucide-trash-2', color: 'success' })
    await navigateTo('/papeis')
  }
  return result
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UButton
      to="/papeis"
      color="neutral"
      variant="link"
      icon="i-lucide-arrow-left"
      label="Papéis"
      class="self-start px-0"
    />

    <LoadError v-if="loadError" :message="loadError" @retry="load" />
    <LoadingCard v-else-if="loading && !role" label="Carregando o papel…" />
    <EmptyState
      v-else-if="!role"
      icon="i-lucide-shield-question"
      title="Papel não encontrado"
      description="Ele pode ter sido excluído."
    />

    <template v-else>
      <header class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-xl font-extrabold lg:text-2xl">{{ role.name }}</h1>
          <StatusBadge
            :status="
              role.isSystem
                ? { label: 'Do sistema', icon: 'i-lucide-lock', color: 'neutral' }
                : { label: 'Personalizado', icon: 'i-lucide-pencil', color: 'primary' }
            "
          />
        </div>
        <p class="text-(--color-text-muted)">
          {{ plural(role.userCount, 'usuário tem', 'usuários têm') }} este papel.
        </p>
        <p
          v-if="isSuperAdmin"
          class="flex items-start gap-2 rounded-(--radius-control) bg-(--color-surface-muted) p-3 text-sm"
          data-testid="role-locked"
        >
          <UIcon name="i-lucide-lock" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          O Super admin tem sempre todas as permissões, inclusive as que forem criadas depois, e não
          pode ser alterado nem excluído.
        </p>
        <p
          v-else-if="role.isSystem && canManage"
          class="flex items-start gap-2 rounded-(--radius-control) bg-(--color-surface-muted) p-3 text-sm"
        >
          <UIcon name="i-lucide-info" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          Papel do sistema: o nome fica fixo e ele não pode ser excluído, mas a descrição e as
          permissões podem mudar.
        </p>
        <p
          v-else-if="!canManage"
          class="flex items-start gap-2 rounded-(--radius-control) bg-(--color-surface-muted) p-3 text-sm"
        >
          <UIcon name="i-lucide-eye" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          Você pode ver este papel, mas alterar papéis exige a permissão de gerenciar papéis.
        </p>
      </header>

      <UForm
        ref="form"
        :state="state"
        :validate="() => validateRole(state)"
        :validate-on="['blur']"
        class="flex flex-col gap-6"
        @submit="save"
      >
        <FormErrorAlert v-if="formError" :message="formError" />
        <UCard>
          <div class="flex flex-col gap-4">
            <UFormField
              label="Nome"
              name="name"
              :help="
                role.isSystem && editable ? 'O nome dos papéis do sistema não muda.' : undefined
              "
            >
              <UInput
                v-model="state.name"
                maxlength="60"
                :disabled="!editable || role.isSystem"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Descrição" name="description">
              <UTextarea
                v-model="state.description"
                maxlength="300"
                :rows="2"
                autoresize
                :disabled="!editable"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header><h2 class="text-lg font-semibold">Permissões</h2></template>
          <PermissionChecklist
            v-model="permissions"
            :groups="groups"
            :disabled="!editable"
            class="grid gap-3 lg:grid-cols-2"
            data-testid="role-permissions"
          />
        </UCard>

        <div v-if="canManage" class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            <UButton
              v-if="!role.isSystem"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              label="Excluir papel"
              :disabled="!role.deletable"
              @click="deleteOpen = true"
            />
            <p v-if="!role.isSystem && !role.deletable" class="text-sm text-(--color-text-muted)">
              Para excluir, tire este papel dos usuários que o têm.
            </p>
          </div>
          <UButton v-if="editable" type="submit" label="Salvar papel" :loading="saving" />
        </div>
      </UForm>

      <ConfirmModal
        v-model:open="deleteOpen"
        title="Excluir papel"
        :description="`O papel ${role.name} deixa de existir. Nenhum usuário o tem hoje.`"
        confirm-label="Excluir"
        destructive
        :action="remove"
      />
    </template>
  </div>
</template>
