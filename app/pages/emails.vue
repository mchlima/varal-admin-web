<script setup lang="ts">
/**
 * E-mails (spec 02, seção 8): consumo do mês (barra contra 10.000, alerta a
 * partir de 8.000, RN-01.04) e histórico filtrável por tipo, situação,
 * organização e período, com o erro quando o envio falhou.
 */
definePageMeta({ permission: 'emails:read' })
useHead({ title: 'E-mails' })

const { $api } = useNuxtApp()
const { can } = usePermissions()

const filters = reactive({
  type: 'all' as EmailType | 'all',
  status: 'all' as EmailStatus | 'all',
  organizationId: undefined as string | undefined,
  from: '',
  to: '',
})

const typeOptions = [
  { label: 'Todos os tipos', value: 'all' },
  ...selectOptions(Object.keys(EMAIL_TYPE) as EmailType[], (key) => EMAIL_TYPE[key]),
]
const statusOptions = [
  { label: 'Todas as situações', value: 'all' },
  ...selectOptions(Object.keys(EMAIL_STATUS) as EmailStatus[], (key) => EMAIL_STATUS[key].label),
]

const list = useCursorList<EmailLog>((cursor) =>
  apiCall(
    $api.GET('/api/v1/admin/emails', {
      params: {
        query: {
          type: filters.type === 'all' ? undefined : filters.type,
          status: filters.status === 'all' ? undefined : filters.status,
          organizationId: filters.organizationId || undefined,
          ...dayRangeToInstants(filters.from, filters.to),
          cursor,
          limit: 50,
        },
      },
    }),
  ),
)

watch(filters, () => void list.reload(), { deep: true })
onMounted(() => void list.reload())

const filtered = computed(
  () =>
    filters.type !== 'all' ||
    filters.status !== 'all' ||
    Boolean(filters.organizationId || filters.from || filters.to),
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader title="E-mails" description="Consumo do mês no plano de envio e histórico." />
    <!-- Consumo do mês (RN-01.04) -->
    <EmailUsagePanel />

    <section aria-labelledby="historico" class="flex flex-col gap-4">
      <h2 id="historico" class="text-lg font-semibold">Histórico de envios</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <UFormField label="Tipo" name="type">
          <USelect v-model="filters.type" :items="typeOptions" class="w-full" />
        </UFormField>
        <UFormField label="Situação" name="status">
          <USelect v-model="filters.status" :items="statusOptions" class="w-full" />
        </UFormField>
        <UFormField v-if="can('organizations:read')" label="Organização" name="organizationId">
          <OrganizationSelect v-model="filters.organizationId" />
        </UFormField>
        <PeriodFields v-model:from="filters.from" v-model:to="filters.to" />
      </div>

      <LoadError
        v-if="list.error.value && list.items.value.length === 0"
        :message="list.error.value"
        @retry="list.reload"
      />
      <LoadingCard
        v-else-if="list.loading.value && list.items.value.length === 0"
        label="Carregando os e-mails…"
      />
      <EmptyState
        v-else-if="list.empty.value"
        icon="i-lucide-mail"
        :title="filtered ? 'Nenhum e-mail com esses filtros' : 'Nenhum e-mail enviado ainda'"
        :description="
          filtered
            ? 'Tente outro período ou tire algum filtro.'
            : 'Convites e redefinições de senha aparecem aqui.'
        "
      />
      <ul v-else class="flex flex-col gap-2" aria-label="E-mails">
        <li
          v-for="email in list.items.value"
          :key="email.id"
          class="flex flex-col gap-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4"
          data-testid="email-row"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex min-w-0 flex-col">
              <span class="font-bold">{{ EMAIL_TYPE[email.type] }}</span>
              <span class="break-all text-sm text-(--color-text-muted)">{{ email.to }}</span>
            </div>
            <StatusBadge :status="EMAIL_STATUS[email.status]" size="sm" />
          </div>
          <p class="text-sm text-(--color-text-muted) tabular-nums">
            Criado {{ formatDateTime(email.createdAt) }}
            <template v-if="email.sentAt"> · enviado {{ formatDateTime(email.sentAt) }}</template>
            <template v-if="email.organizationId && can('organizations:read')">
              ·
              <NuxtLink
                :to="`/organizacoes/${email.organizationId}`"
                class="font-bold text-(--color-primary-deep) underline"
                >organização</NuxtLink
              >
            </template>
          </p>
          <p
            v-if="email.error"
            class="flex items-start gap-2 rounded-(--radius-control) bg-(--color-status-late-bg) p-2 text-sm text-(--color-status-late-text)"
          >
            <UIcon name="i-lucide-circle-x" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span class="break-all"><strong>Erro:</strong> {{ email.error }}</span>
          </p>
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
    </section>
  </div>
</template>
