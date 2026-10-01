<script setup lang="ts">
/** Usuários do admin (spec 02, seção 3): lista, busca e convite. */
definePageMeta({ permission: 'admin.users:manage' })
useHead({ title: 'Usuários do admin' })

const { $api } = useNuxtApp()
const toast = useToast()
const session = useSessionStore()
const { roles, load: loadRoles } = useRoles()
const { groups } = usePermissionCatalog()

const search = ref('')
const active = ref<'all' | 'true' | 'false'>('true')
const activeOptions = [
  { label: 'Ativos', value: 'true' },
  { label: 'Desativados', value: 'false' },
  { label: 'Todos', value: 'all' },
]

const list = useCursorList<AdminUser>((cursor) =>
  apiCall(
    $api.GET('/api/v1/admin/users', {
      params: {
        query: {
          search: search.value.trim() || undefined,
          active: active.value === 'all' ? undefined : active.value,
          cursor,
          limit: 50,
        },
      },
    }),
  ),
)

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => void list.reload(), 300)
})
watch(active, () => void list.reload())
onBeforeUnmount(() => clearTimeout(timer))
onMounted(() => {
  void list.reload()
  void loadRoles()
})

const inviteOpen = ref(false)
async function invited(user: AdminUser) {
  toast.add({
    title: 'Convite enviado.',
    description: `${user.name} recebe o link em ${user.email}.`,
    icon: 'i-lucide-circle-check',
    color: 'success',
  })
  await navigateTo(`/usuarios/${user.id}`)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <PageHeader
        title="Usuários do admin"
        description="Equipe do Varal com acesso a este painel."
      />
      <UButton
        icon="i-lucide-user-plus"
        label="Convidar usuário"
        class="w-full sm:w-auto"
        @click="inviteOpen = true"
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-[1fr_12rem]">
      <UFormField label="Buscar" name="busca">
        <UInput
          v-model="search"
          type="search"
          icon="i-lucide-search"
          placeholder="Nome ou e-mail"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Situação" name="ativo">
        <USelect v-model="active" :items="activeOptions" class="w-full" />
      </UFormField>
    </div>

    <LoadError
      v-if="list.error.value && list.items.value.length === 0"
      :message="list.error.value"
      @retry="list.reload"
    />
    <LoadingCard
      v-else-if="list.loading.value && list.items.value.length === 0"
      label="Carregando os usuários…"
    />
    <EmptyState
      v-else-if="list.empty.value"
      icon="i-lucide-users"
      title="Nenhum usuário encontrado"
      description="Confira a busca ou a situação escolhida."
    />

    <ul v-else class="flex flex-col gap-2" aria-label="Usuários do admin">
      <li v-for="user in list.items.value" :key="user.id">
        <NuxtLink
          :to="`/usuarios/${user.id}`"
          class="flex flex-col gap-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-border-strong) sm:flex-row sm:items-center sm:justify-between"
          data-testid="admin-user-row"
        >
          <div class="flex min-w-0 flex-col gap-1">
            <span class="font-bold">
              {{ user.name }}
              <span
                v-if="user.id === session.admin?.id"
                class="font-normal text-(--color-text-muted)"
                >(você)</span
              >
            </span>
            <span class="truncate text-sm text-(--color-text-muted)">{{ user.email }}</span>
            <span class="text-sm">{{
              user.roles.map((role) => role.name).join(', ') || 'Sem papel'
            }}</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 sm:justify-end">
            <StatusBadge
              v-if="user.invitePending"
              :status="{ label: 'Convite pendente', icon: 'i-lucide-mail', color: 'warning' }"
              size="sm"
            />
            <StatusBadge
              :status="
                user.active
                  ? { label: 'Ativo', icon: 'i-lucide-circle-check', color: 'success' }
                  : { label: 'Desativado', icon: 'i-lucide-circle-minus', color: 'neutral' }
              "
              size="sm"
            />
          </div>
        </NuxtLink>
      </li>
    </ul>

    <FormErrorAlert
      v-if="list.error.value && list.items.value.length > 0"
      :message="list.error.value"
    />
    <LoadMoreButton
      v-if="list.hasMore.value"
      :loading="list.loadingMore.value"
      @click="list.loadMore"
    />

    <InviteAdminModal
      v-model:open="inviteOpen"
      :roles="roles"
      :groups="groups"
      @invited="invited"
    />
  </div>
</template>
