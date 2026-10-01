<script setup lang="ts">
/**
 * Acessos de "entrar como" (spec 02, seção 7): em andamento e encerrados,
 * de todos ou só os meus. Cada admin encerra os próprios acessos
 * (`POST /impersonations/{id}/end`); a sessão no painel cai na hora
 * (RN-02.21).
 */
definePageMeta({ permission: 'impersonation:use' })
useHead({ title: 'Acessos de suporte' })

const { $api } = useNuxtApp()
const toast = useToast()
const session = useSessionStore()
const { can } = usePermissions()

const active = ref<'true' | 'false'>('true')
const mine = ref(false)
const tabs = [
  { label: 'Em andamento', value: 'true', icon: 'i-lucide-radio' },
  { label: 'Encerrados', value: 'false', icon: 'i-lucide-history' },
]

const list = useCursorList<Impersonation>((cursor) =>
  apiCall(
    $api.GET(
      '/api/v1/admin/impersonations',
      listQuery<ImpersonationListQuery>({
        active: active.value,
        mine: mine.value ? 'true' : undefined,
        cursor,
        limit: 30,
      }),
    ),
  ),
)

watch([active, mine], () => void list.reload())
onMounted(() => void list.reload())

const ending = ref<Impersonation | null>(null)
const endOpen = computed({
  get: () => ending.value !== null,
  set: (value: boolean) => {
    if (!value) ending.value = null
  },
})

async function end() {
  const target = ending.value
  if (!target) return { ok: true as const, data: null }
  const result = await apiCall(
    $api.POST('/api/v1/admin/impersonations/{id}/end', { params: { path: { id: target.id } } }),
  )
  if (result.ok) {
    toast.add({
      title: 'Acesso encerrado.',
      description: 'A sessão no painel caiu na hora.',
      icon: 'i-lucide-circle-check',
      color: 'success',
    })
    void list.reload()
  }
  return result
}

function endedLabel(item: Impersonation): string {
  if (item.active) return `Termina às ${formatDateTime(item.expiresAt)}`
  if (item.endedBy === 'admin') return `Encerrado ${formatDateTime(item.endedAt)}`
  return `Expirou ${formatDateTime(item.endedAt ?? item.expiresAt)}`
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Acessos de suporte"
      description='Sessões de "entrar como" no painel dos donos. Cada acesso dura até 60 minutos e o dono vê a lista na conta dele.'
    />

    <div class="flex flex-wrap items-center justify-between gap-3">
      <UTabs v-model="active" :items="tabs" :content="false" />
      <USwitch v-model="mine" label="Só os meus" />
    </div>

    <LoadError
      v-if="list.error.value && list.items.value.length === 0"
      :message="list.error.value"
      @retry="list.reload"
    />
    <LoadingCard
      v-else-if="list.loading.value && list.items.value.length === 0"
      label="Carregando os acessos…"
    />
    <EmptyState
      v-else-if="list.empty.value"
      icon="i-lucide-log-in"
      :title="active === 'true' ? 'Nenhum acesso em andamento' : 'Nenhum acesso encerrado'"
      :description="
        active === 'true'
          ? 'Para abrir um, use &quot;Entrar como&quot; na página da organização.'
          : undefined
      "
    />

    <ul v-else class="flex flex-col gap-2" aria-label="Acessos de suporte">
      <li
        v-for="item in list.items.value"
        :key="item.id"
        class="flex flex-col gap-3 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4 sm:flex-row sm:items-center sm:justify-between"
        data-testid="impersonation-row"
      >
        <div class="flex min-w-0 flex-col gap-1">
          <p class="font-bold">
            <NuxtLink
              v-if="can('organizations:read')"
              :to="`/organizacoes/${item.organizationId}`"
              class="text-(--color-primary-deep) underline-offset-2 hover:underline"
            >
              {{ item.organizationName }}
            </NuxtLink>
            <template v-else>{{ item.organizationName }}</template>
          </p>
          <p class="text-sm">
            {{ item.platformAdminId === session.admin?.id ? 'Você' : item.adminName }} · início
            {{ formatDateTime(item.startedAt) }} · {{ endedLabel(item) }}
          </p>
          <p class="text-sm text-(--color-text-muted)">
            <strong>Motivo:</strong> {{ item.reason }}
          </p>
        </div>
        <UButton
          v-if="item.active && item.platformAdminId === session.admin?.id"
          color="error"
          variant="outline"
          icon="i-lucide-log-out"
          label="Encerrar acesso"
          class="shrink-0"
          @click="ending = item"
        />
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

    <ConfirmModal
      v-model:open="endOpen"
      title="Encerrar acesso"
      :description="`A sessão no painel de ${ending?.organizationName ?? ''} cai na hora.`"
      confirm-label="Encerrar acesso"
      destructive
      :action="end"
    />
  </div>
</template>
