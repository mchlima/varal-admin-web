<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

/**
 * Usuário do admin (spec 02, seção 3): nome, ativo, papéis, permissões
 * avulsas e a lista de permissões efetivas (RN-02.02), e o link de
 * redefinição de senha. Regras mostradas na tela e garantidas pela API:
 * ninguém altera os próprios papéis, permissões ou situação (RN-02.06,
 * `CANNOT_CHANGE_OWN_ACCESS`) e sempre fica um Super admin ativo (RN-02.05,
 * `LAST_SUPER_ADMIN`). Mudanças valem na próxima requisição (RN-02.08).
 */
definePageMeta({ permission: 'admin.users:manage' })

const { $api } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const session = useSessionStore()
const { roles, load: loadRoles } = useRoles()
const { groups, descriptions } = usePermissionCatalog()

const id = computed(() => String(route.params.id))
const user = ref<AdminUser | null>(null)
const loadError = ref<string | null>(null)
const loading = ref(true)

useHead({ title: () => user.value?.name ?? 'Usuário do admin' })

const isSelf = computed(() => user.value?.id === session.admin?.id)

const name = ref('')
const roleIds = ref<string[]>([])
const extraPermissions = ref<Permission[]>([])

function apply(next: AdminUser) {
  user.value = next
  name.value = next.name
  roleIds.value = next.roles.map((role) => role.id)
  extraPermissions.value = [...next.extraPermissions]
}

async function load() {
  loading.value = true
  loadError.value = null
  const result = await apiCall(
    $api.GET('/api/v1/admin/users/{id}', { params: { path: { id: id.value } } }),
  )
  loading.value = false
  if (result.ok) apply(result.data)
  else loadError.value = result.error.message
}

onMounted(() => {
  void load()
  void loadRoles()
})

function saved(next: AdminUser, message: string) {
  apply(next)
  toast.add({ title: message, icon: 'i-lucide-circle-check', color: 'success' })
  // O próprio nome aparece no menu do usuário
  if (next.id === session.admin?.id) void session.refreshProfile()
}

// Nome
const nameForm = useTemplateRef('nameForm')
const savingName = ref(false)
const nameError = ref<string | null>(null)
function validateName(): FormError[] {
  const errors: FormError[] = []
  requireLength(errors, 'name', name.value, 'o nome', 2, 120)
  return errors
}
async function saveName() {
  savingName.value = true
  nameError.value = null
  const result = await apiCall(
    $api.PATCH('/api/v1/admin/users/{id}', {
      params: { path: { id: id.value } },
      body: { name: name.value.trim() },
    }),
  )
  savingName.value = false
  if (result.ok) saved(result.data, 'Nome salvo.')
  else if (Object.keys(result.error.fields).length > 0)
    nameForm.value?.setErrors(fieldErrors(result.error.fields))
  else nameError.value = result.error.message
}

// Ativo
const activeOpen = ref(false)
async function toggleActive() {
  const next = !(user.value?.active ?? true)
  const result = await apiCall(
    $api.PATCH('/api/v1/admin/users/{id}', {
      params: { path: { id: id.value } },
      body: { active: next },
    }),
  )
  if (result.ok) saved(result.data, next ? 'Usuário reativado.' : 'Usuário desativado.')
  return result
}

// Papéis
const savingRoles = ref(false)
const rolesError = ref<string | null>(null)
const rolesChanged = computed(() => {
  const current = new Set(user.value?.roles.map((role) => role.id) ?? [])
  return (
    roleIds.value.length !== current.size || roleIds.value.some((roleId) => !current.has(roleId))
  )
})
const roleItems = computed(() =>
  roles.value.map((role) => ({ label: role.name, value: role.id, description: role.description })),
)
async function saveRoles() {
  savingRoles.value = true
  rolesError.value = null
  const result = await apiCall(
    $api.PUT('/api/v1/admin/users/{id}/roles', {
      params: { path: { id: id.value } },
      body: { roleIds: roleIds.value },
    }),
  )
  savingRoles.value = false
  if (result.ok) saved(result.data, 'Papéis salvos.')
  else rolesError.value = result.error.message
}

// Permissões avulsas
const savingPermissions = ref(false)
const permissionsError = ref<string | null>(null)
/** Permissões que já vêm dos papéis (efetivas que não são avulsas). */
const fromRoles = computed(() => {
  const extras = new Set(user.value?.extraPermissions ?? [])
  return new Set((user.value?.permissions ?? []).filter((permission) => !extras.has(permission)))
})
const permissionsChanged = computed(() => {
  const current = new Set(user.value?.extraPermissions ?? [])
  return (
    extraPermissions.value.length !== current.size ||
    extraPermissions.value.some((permission) => !current.has(permission))
  )
})
async function savePermissions() {
  savingPermissions.value = true
  permissionsError.value = null
  const result = await apiCall(
    $api.PUT('/api/v1/admin/users/{id}/permissions', {
      params: { path: { id: id.value } },
      body: { permissions: extraPermissions.value },
    }),
  )
  savingPermissions.value = false
  if (result.ok) saved(result.data, 'Permissões avulsas salvas.')
  else permissionsError.value = result.error.message
}

const effectiveGroups = computed(() => {
  const effective = new Set(user.value?.permissions ?? [])
  return groups.value
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter((info) => effective.has(info.key)),
    }))
    .filter((group) => group.permissions.length > 0)
})

// Link de senha
const linkOpen = ref(false)
async function sendPasswordLink() {
  const result = await apiCall(
    $api.POST('/api/v1/admin/users/{id}/password-link', { params: { path: { id: id.value } } }),
  )
  if (result.ok) {
    toast.add({
      title: result.data.kind === 'invite' ? 'Convite reenviado.' : 'Link de redefinição enviado.',
      description: `Vale até ${formatDateTime(result.data.expiresAt)}.`,
      icon: 'i-lucide-circle-check',
      color: 'success',
    })
  }
  return result
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UButton
      to="/usuarios"
      color="neutral"
      variant="link"
      icon="i-lucide-arrow-left"
      label="Usuários do admin"
      class="self-start px-0"
    />

    <LoadError v-if="loadError" :message="loadError" @retry="load" />
    <LoadingCard v-else-if="loading && !user" label="Carregando o usuário…" />

    <template v-else-if="user">
      <header class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-xl font-extrabold lg:text-2xl">{{ user.name }}</h1>
          <StatusBadge
            :status="
              user.active
                ? { label: 'Ativo', icon: 'i-lucide-circle-check', color: 'success' }
                : { label: 'Desativado', icon: 'i-lucide-circle-minus', color: 'neutral' }
            "
            data-testid="admin-user-status"
          />
          <StatusBadge
            v-if="user.invitePending"
            :status="{ label: 'Convite pendente', icon: 'i-lucide-mail', color: 'warning' }"
          />
        </div>
        <p class="break-all text-(--color-text-muted)">
          {{ user.email }} · último acesso {{ formatDateTime(user.lastLoginAt, 'nunca') }}
        </p>
        <p
          v-if="isSelf"
          class="flex items-start gap-2 rounded-(--radius-control) bg-(--color-surface-muted) p-3 text-sm"
          data-testid="self-notice"
        >
          <UIcon name="i-lucide-info" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          Este é o seu usuário. Você pode mudar o seu nome, mas papéis, permissões e a situação só
          outra pessoa com acesso a usuários pode alterar.
        </p>
      </header>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard>
          <template #header><h2 class="text-lg font-semibold">Dados</h2></template>
          <UForm
            ref="nameForm"
            :state="{ name }"
            :validate="validateName"
            class="flex flex-col gap-4"
            @submit="saveName"
          >
            <FormErrorAlert v-if="nameError" :message="nameError" />
            <UFormField label="Nome" name="name">
              <UInput v-model="name" maxlength="120" class="w-full" />
            </UFormField>
            <div class="flex flex-wrap gap-2">
              <UButton
                type="submit"
                color="primary"
                variant="outline"
                label="Salvar nome"
                :loading="savingName"
                :disabled="name.trim() === user.name"
              />
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-key-round"
                :label="user.invitePending ? 'Reenviar convite' : 'Enviar link de redefinição'"
                @click="linkOpen = true"
              />
            </div>
          </UForm>
          <div v-if="!isSelf" class="mt-4 border-t border-(--color-border) pt-4">
            <UButton
              v-if="user.active"
              color="error"
              variant="ghost"
              icon="i-lucide-user-x"
              label="Desativar usuário"
              @click="activeOpen = true"
            />
            <UButton
              v-else
              color="primary"
              variant="outline"
              icon="i-lucide-user-check"
              label="Reativar usuário"
              @click="activeOpen = true"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Papéis</h2>
            <p class="text-sm text-(--color-text-muted)">Cada papel é um grupo de permissões.</p>
          </template>
          <div class="flex flex-col gap-4">
            <FormErrorAlert v-if="rolesError" :message="rolesError" />
            <UCheckboxGroup
              v-model="roleIds"
              :items="roleItems"
              :disabled="isSelf"
              data-testid="user-roles"
            />
            <UButton
              v-if="!isSelf"
              color="primary"
              variant="outline"
              label="Salvar papéis"
              class="self-start"
              :loading="savingRoles"
              :disabled="!rolesChanged"
              @click="saveRoles"
            />
          </div>
        </UCard>

        <UCard class="lg:col-span-2">
          <template #header>
            <h2 class="text-lg font-semibold">Permissões avulsas</h2>
            <p class="text-sm text-(--color-text-muted)">
              Somam-se às dos papéis. As que já vêm de um papel aparecem marcadas e travadas.
            </p>
          </template>
          <div class="flex flex-col gap-4">
            <FormErrorAlert v-if="permissionsError" :message="permissionsError" />
            <PermissionChecklist
              v-model="extraPermissions"
              :groups="groups"
              :locked="fromRoles"
              locked-hint="vem de um papel"
              :disabled="isSelf"
              class="grid gap-3 lg:grid-cols-2"
            />
            <UButton
              v-if="!isSelf"
              color="primary"
              variant="outline"
              label="Salvar permissões avulsas"
              class="self-start"
              :loading="savingPermissions"
              :disabled="!permissionsChanged"
              @click="savePermissions"
            />
          </div>
        </UCard>

        <UCard class="lg:col-span-2">
          <template #header>
            <h2 class="text-lg font-semibold">Permissões efetivas</h2>
            <p class="text-sm text-(--color-text-muted)">
              O que este usuário pode fazer hoje: papéis + avulsas.
            </p>
          </template>
          <p v-if="effectiveGroups.length === 0" class="text-(--color-text-muted)">
            Nenhuma permissão: o usuário entra no admin, mas não vê nenhuma tela.
          </p>
          <ul v-else class="grid gap-3 sm:grid-cols-2" data-testid="effective-permissions">
            <li v-for="group in effectiveGroups" :key="group.resource">
              <p class="text-sm font-bold tracking-wide text-(--color-text-muted) uppercase">
                {{ group.label }}
              </p>
              <ul class="flex flex-col gap-1">
                <li
                  v-for="info in group.permissions"
                  :key="info.key"
                  class="flex items-start gap-2"
                >
                  <UIcon name="i-lucide-check" class="mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span>{{ descriptions.get(info.key) ?? info.key }}</span>
                </li>
              </ul>
            </li>
          </ul>
        </UCard>
      </div>

      <ConfirmModal
        v-model:open="activeOpen"
        :title="user.active ? 'Desativar usuário' : 'Reativar usuário'"
        :description="
          user.active
            ? `${user.name} sai do admin na hora e não consegue mais entrar. Nenhum dado é apagado.`
            : `${user.name} volta a poder entrar no admin com os papéis atuais.`
        "
        :confirm-label="user.active ? 'Desativar' : 'Reativar'"
        :destructive="user.active"
        :action="toggleActive"
      />
      <ConfirmModal
        v-model:open="linkOpen"
        :title="user.invitePending ? 'Reenviar convite' : 'Enviar link de redefinição'"
        :description="`Um e-mail com o link para definir a senha vai para ${user.email}.`"
        confirm-label="Enviar"
        :action="sendPasswordLink"
      />
    </template>
  </div>
</template>
