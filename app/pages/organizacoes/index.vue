<script setup lang="ts">
/**
 * Organizações (spec 02, seção 11): busca por nome, e-mail do dono ou código,
 * filtro por situação e paginação por cursor. Os filtros ficam na URL
 * (`?busca=` e `?situacao=`) para o link do Início abrir já filtrado.
 */
definePageMeta({ permission: 'organizations:read' })
useHead({ title: 'Organizações' })

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const { can } = usePermissions()

function statusFromQuery(value: unknown): SubscriptionStatus | undefined {
  return SUBSCRIPTION_STATUSES.find((status) => status === value)
}

const search = ref(typeof route.query.busca === 'string' ? route.query.busca : '')
const status = ref<SubscriptionStatus | undefined>(statusFromQuery(route.query.situacao))

const statusOptions = [
  { label: 'Todas as situações', value: 'all' },
  ...selectOptions(SUBSCRIPTION_STATUSES, (key) => SUBSCRIPTION_STATUS[key].label),
]
const statusSelect = computed({
  get: () => status.value ?? 'all',
  set: (value: string) => {
    status.value = statusFromQuery(value)
  },
})

const list = useCursorList<OrganizationSummary>((cursor) =>
  apiCall(
    $api.GET('/api/v1/admin/organizations', {
      params: {
        query: {
          search: search.value.trim() || undefined,
          status: status.value,
          cursor,
          limit: 30,
        },
      },
    }),
  ),
)

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(apply, 300)
})
watch(status, apply)
onBeforeUnmount(() => clearTimeout(timer))

function apply() {
  void router.replace({
    query: {
      ...(search.value.trim() ? { busca: search.value.trim() } : {}),
      ...(status.value ? { situacao: status.value } : {}),
    },
  })
  void list.reload()
}

onMounted(() => void list.reload())

const filtered = computed(() => Boolean(search.value.trim() || status.value))
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <PageHeader title="Organizações" description="Barracas que usam o Varal." />
      <UButton
        v-if="can('organizations:create')"
        to="/organizacoes/nova"
        icon="i-lucide-plus"
        label="Nova organização"
        class="w-full sm:w-auto"
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-[1fr_14rem]">
      <UFormField label="Buscar" name="busca">
        <UInput
          v-model="search"
          type="search"
          icon="i-lucide-search"
          placeholder="Nome, e-mail do dono ou código"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Situação" name="situacao">
        <USelect v-model="statusSelect" :items="statusOptions" class="w-full" />
      </UFormField>
    </div>

    <LoadError
      v-if="list.error.value && list.items.value.length === 0"
      :message="list.error.value"
      @retry="list.reload"
    />
    <LoadingCard
      v-else-if="list.loading.value && list.items.value.length === 0"
      label="Carregando as organizações…"
    />
    <EmptyState
      v-else-if="list.empty.value"
      icon="i-lucide-store"
      :title="filtered ? 'Nenhuma organização encontrada' : 'Ainda não há organizações'"
      :description="
        filtered
          ? 'Confira a busca ou escolha outra situação.'
          : 'Crie a primeira organização com a unidade e o convite do dono.'
      "
    />

    <ul
      v-else
      class="flex flex-col gap-2"
      aria-label="Organizações"
      :aria-busy="list.loading.value"
    >
      <li v-for="organization in list.items.value" :key="organization.id">
        <NuxtLink
          :to="`/organizacoes/${organization.id}`"
          class="flex flex-col gap-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-border-strong) sm:flex-row sm:items-center sm:justify-between"
          data-testid="organization-row"
        >
          <div class="flex min-w-0 flex-col gap-1">
            <span class="truncate font-bold">{{ organization.name }}</span>
            <span class="truncate text-sm text-(--color-text-muted)">
              {{
                organization.owner
                  ? `${organization.owner.name} · ${organization.owner.email}`
                  : 'Sem dono'
              }}
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-3 sm:justify-end">
            <span
              class="font-mono text-sm font-bold tabular-nums"
              :aria-label="`Código ${organization.accessCode}`"
            >
              {{ organization.accessCode }}
            </span>
            <StatusBadge :status="SUBSCRIPTION_STATUS[organization.subscriptionStatus]" size="sm" />
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
  </div>
</template>
