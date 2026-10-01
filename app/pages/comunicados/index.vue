<script setup lang="ts">
/**
 * Comunicados (spec 02, seções 5 e 11): lista por situação, com público,
 * data e quantos donos do público já leram.
 */
definePageMeta({ permission: 'announcements:read' })
useHead({ title: 'Comunicados' })

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const { can } = usePermissions()

function statusFromQuery(value: unknown): AnnouncementStatus | undefined {
  return ANNOUNCEMENT_STATUSES.find((status) => status === value)
}

const status = ref<AnnouncementStatus | undefined>(statusFromQuery(route.query.situacao))
const tabs = [
  { label: 'Todos', value: 'all' },
  ...ANNOUNCEMENT_STATUSES.map((key) => ({
    label: ANNOUNCEMENT_STATUS[key].plural,
    value: key,
    icon: ANNOUNCEMENT_STATUS[key].icon,
  })),
]
const tab = computed({
  get: () => status.value ?? 'all',
  set: (value: string | number) => {
    status.value = statusFromQuery(value)
  },
})

const list = useCursorList<Announcement>((cursor) =>
  apiCall(
    $api.GET(
      '/api/v1/admin/announcements',
      listQuery<AnnouncementListQuery>({ status: status.value, cursor, limit: 30 }),
    ),
  ),
)

watch(status, () => {
  void router.replace({ query: status.value ? { situacao: status.value } : {} })
  void list.reload()
})
onMounted(() => void list.reload())

function audienceSummary(item: Announcement): string {
  if (item.audienceType === 'by_status') {
    return `Situação: ${item.audienceStatuses.map((key) => SUBSCRIPTION_STATUS[key].label).join(', ')}`
  }
  if (item.audienceType === 'selected') {
    return plural(item.organizationIds.length, 'organização escolhida', 'organizações escolhidas')
  }
  return AUDIENCE_TYPE.all
}

function dateSummary(item: Announcement): string {
  if (item.status === 'scheduled') return `Agendado para ${formatDateTime(item.publishAt)}`
  if (item.status === 'published')
    return `Publicado em ${formatDateTime(item.publishedAt ?? item.publishAt)}`
  if (item.status === 'archived') return `Arquivado em ${formatDateTime(item.archivedAt)}`
  return `Criado em ${formatDateTime(item.createdAt)} por ${item.createdBy.name}`
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <PageHeader
        title="Comunicados"
        description="Avisos para os donos, mostrados numa faixa no painel."
      />
      <UButton
        v-if="can('announcements:manage')"
        to="/comunicados/novo"
        icon="i-lucide-plus"
        label="Novo comunicado"
        class="w-full sm:w-auto"
      />
    </div>

    <UTabs v-model="tab" :items="tabs" :content="false" class="relative overflow-x-auto" />

    <LoadError
      v-if="list.error.value && list.items.value.length === 0"
      :message="list.error.value"
      @retry="list.reload"
    />
    <LoadingCard
      v-else-if="list.loading.value && list.items.value.length === 0"
      label="Carregando os comunicados…"
    />
    <EmptyState
      v-else-if="list.empty.value"
      icon="i-lucide-megaphone"
      :title="
        status
          ? `Nenhum comunicado ${ANNOUNCEMENT_STATUS[status].label.toLowerCase()}`
          : 'Ainda não há comunicados'
      "
      :description="
        can('announcements:manage')
          ? 'Um comunicado nasce como rascunho e pode ser publicado na hora ou agendado.'
          : undefined
      "
    />

    <ul v-else class="flex flex-col gap-2" aria-label="Comunicados">
      <li v-for="item in list.items.value" :key="item.id">
        <NuxtLink
          :to="`/comunicados/${item.id}`"
          class="flex flex-col gap-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-border-strong)"
          data-testid="announcement-row"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <span class="font-bold">{{ item.title }}</span>
            <StatusBadge :status="ANNOUNCEMENT_STATUS[item.status]" size="sm" />
          </div>
          <div
            class="flex flex-col gap-1 text-sm text-(--color-text-muted) sm:flex-row sm:flex-wrap sm:gap-x-4"
          >
            <span>{{ audienceSummary(item) }}</span>
            <span>{{ dateSummary(item) }}</span>
            <span
              v-if="item.status === 'published' || item.status === 'archived'"
              class="font-bold text-(--color-text) tabular-nums"
            >
              {{ readSummary(item) }}
            </span>
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
