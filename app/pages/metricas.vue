<script setup lang="ts">
/**
 * Métricas (spec 02, seção 6): período em dias de Brasília, padrão últimos
 * 30 dias; indicadores e uso por organização, ordenável. Turnos, comandas e
 * valores ficam em zero até o balcão e o caixa (specs 04 a 06) existirem: a
 * tela diz isso em vez de parecer um erro.
 */
definePageMeta({ permission: 'metrics:read' })
useHead({ title: 'Métricas' })

const { $api } = useNuxtApp()
const today = todayInSaoPaulo()
const from = ref(addDays(today, -29))
const to = ref(today)
const periodError = ref<string | null>(null)

type SortKey = NonNullable<OrganizationUsageQuery['sort']>
const sort = ref<SortKey>('name')
const order = ref<'asc' | 'desc'>('asc')

const overview = ref<MetricsOverview | null>(null)
const usage = ref<OrganizationUsage[]>([])
const error = ref<string | null>(null)
const loading = ref(false)

async function load() {
  periodError.value = null
  if (!from.value || !to.value) {
    periodError.value = 'Escolha o primeiro e o último dia.'
    return
  }
  if (from.value > to.value) {
    periodError.value = 'O primeiro dia precisa vir antes do último.'
    return
  }
  loading.value = true
  error.value = null
  const period = { from: from.value, to: to.value }
  const [overviewResult, usageResult] = await Promise.all([
    apiCall($api.GET('/api/v1/admin/metrics/overview', { params: { query: period } })),
    apiCall(
      $api.GET('/api/v1/admin/metrics/organizations', {
        params: { query: { ...period, sort: sort.value, order: order.value } },
      }),
    ),
  ])
  loading.value = false
  if (overviewResult.ok) overview.value = overviewResult.data
  if (usageResult.ok) usage.value = usageResult.data.data
  const failure = !overviewResult.ok
    ? overviewResult.error
    : !usageResult.ok
      ? usageResult.error
      : null
  error.value = failure?.message ?? null
}

function setPreset(days: number) {
  to.value = today
  from.value = addDays(today, -(days - 1))
  void load()
}

function sortBy(key: SortKey) {
  if (sort.value === key) order.value = order.value === 'asc' ? 'desc' : 'asc'
  else {
    sort.value = key
    order.value = key === 'name' ? 'asc' : 'desc'
  }
  void load()
}

onMounted(load)

const columns: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'name', label: 'Organização', numeric: false },
  { key: 'shifts', label: 'Turnos', numeric: true },
  { key: 'tabs', label: 'Comandas', numeric: true },
  { key: 'soldCents', label: 'Valor vendido', numeric: true },
  { key: 'lastAccessAt', label: 'Último acesso', numeric: false },
]

function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
  if (sort.value !== key) return 'none'
  return order.value === 'asc' ? 'ascending' : 'descending'
}

/** Ainda não há turnos nem comandas no período: specs 04 a 06 por vir. */
const operationsPending = computed(
  () => overview.value !== null && overview.value.shifts.total === 0 && overview.value.tabs === 0,
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Métricas"
      description="Uso da plataforma no período, em horário de Brasília."
    />

    <UCard>
      <form class="flex flex-col gap-4 lg:flex-row lg:items-end" @submit.prevent="load">
        <div class="grid grid-cols-2 gap-3 lg:flex">
          <UFormField label="De" name="from">
            <UInput v-model="from" type="date" :max="to" class="w-full" />
          </UFormField>
          <UFormField label="Até" name="to">
            <UInput v-model="to" type="date" :min="from" :max="today" class="w-full" />
          </UFormField>
        </div>
        <UButton
          type="submit"
          color="primary"
          variant="outline"
          icon="i-lucide-refresh-cw"
          label="Atualizar"
          :loading="loading"
        />
        <div class="flex flex-wrap gap-2 lg:ms-auto">
          <UButton color="neutral" variant="ghost" size="sm" label="7 dias" @click="setPreset(7)" />
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            label="30 dias"
            @click="setPreset(30)"
          />
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            label="90 dias"
            @click="setPreset(90)"
          />
        </div>
      </form>
      <FormErrorAlert v-if="periodError" :message="periodError" class="mt-3" />
    </UCard>

    <LoadError v-if="error && !overview" :message="error" @retry="load" />
    <LoadingCard v-else-if="loading && !overview" label="Calculando as métricas…" />

    <template v-else-if="overview">
      <FormErrorAlert v-if="error" :message="error" />
      <p class="text-sm text-(--color-text-muted)">
        De {{ formatDay(overview.period.from) }} a {{ formatDay(overview.period.to) }}.
      </p>

      <div
        v-if="operationsPending"
        role="note"
        class="flex items-start gap-3 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4"
        data-testid="metrics-pending-note"
      >
        <UIcon
          name="i-lucide-info"
          class="mt-1 size-5 shrink-0 text-(--color-primary-deep)"
          aria-hidden="true"
        />
        <p>
          <strong>Turnos, comandas e valores ainda estão em zero</strong> porque o balcão, a cozinha
          e o caixa entram nas próximas fases. Organizações e último acesso já são dados reais.
        </p>
      </div>

      <section aria-labelledby="indicadores" class="flex flex-col gap-3">
        <h2 id="indicadores" class="sr-only">Indicadores do período</h2>
        <dl class="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <div class="metric">
            <dt>Organizações ativas no período</dt>
            <dd>{{ formatCount(overview.activeOrganizations) }}</dd>
            <p class="metric-help">Com pelo menos um turno aberto</p>
          </div>
          <div class="metric">
            <dt>Turnos fechados</dt>
            <dd>{{ formatCount(overview.shifts.total) }}</dd>
          </div>
          <div class="metric">
            <dt>Comandas</dt>
            <dd>{{ formatCount(overview.tabs) }}</dd>
            <p class="metric-help">Pagas, penduradas ou quitadas</p>
          </div>
          <div class="metric">
            <dt>Valor vendido registrado</dt>
            <dd>{{ formatCents(overview.soldCents) }}</dd>
          </div>
          <div class="metric">
            <dt>Ticket médio</dt>
            <dd>{{ formatCents(overview.averageTicketCents) }}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="por-situacao" class="flex flex-col gap-3">
        <h2 id="por-situacao" class="text-lg font-semibold">Organizações por situação (hoje)</h2>
        <ul class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <li
            v-for="status in SUBSCRIPTION_STATUSES"
            :key="status"
            class="flex flex-col gap-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4"
          >
            <StatusBadge :status="SUBSCRIPTION_STATUS[status]" size="sm" class="self-start" />
            <span class="font-heading text-2xl font-extrabold tabular-nums">{{
              formatCount(overview.organizationsByStatus[status] ?? 0)
            }}</span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="turnos-por-semana" class="flex flex-col gap-3">
        <h2 id="turnos-por-semana" class="text-lg font-semibold">Turnos fechados por semana</h2>
        <div
          class="relative overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-surface)"
        >
          <table class="w-full text-left">
            <thead class="bg-(--color-surface-muted) text-sm">
              <tr>
                <th scope="col" class="px-4 py-3">Semana de</th>
                <th scope="col" class="px-4 py-3 text-right">Turnos</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="week in overview.shifts.byWeek"
                :key="week.weekStart"
                class="border-t border-(--color-border)"
              >
                <td class="px-4 py-2">{{ formatDay(week.weekStart) }}</td>
                <td class="px-4 py-2 text-right font-bold">{{ formatCount(week.count) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="uso-por-organizacao" class="flex flex-col gap-3">
        <h2 id="uso-por-organizacao" class="text-lg font-semibold">Uso por organização</h2>
        <EmptyState
          v-if="usage.length === 0"
          icon="i-lucide-store"
          title="Nenhuma organização cadastrada"
        />
        <div
          v-else
          class="relative overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-surface)"
        >
          <table class="w-full min-w-[40rem] text-left" data-testid="usage-table">
            <thead class="bg-(--color-surface-muted) text-sm">
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  scope="col"
                  :aria-sort="ariaSort(column.key)"
                  class="px-2 py-1"
                  :class="{ 'text-right': column.numeric }"
                >
                  <UButton
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :label="column.label"
                    :trailing-icon="
                      sort === column.key
                        ? order === 'asc'
                          ? 'i-lucide-arrow-up'
                          : 'i-lucide-arrow-down'
                        : 'i-lucide-arrow-up-down'
                    "
                    :class="{ 'ms-auto': column.numeric }"
                    @click="sortBy(column.key)"
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in usage"
                :key="row.organizationId"
                class="border-t border-(--color-border)"
              >
                <td class="px-4 py-2">
                  <div class="flex flex-col gap-1">
                    <NuxtLink
                      :to="`/organizacoes/${row.organizationId}`"
                      class="font-bold text-(--color-primary-deep) underline-offset-2 hover:underline"
                      >{{ row.name }}</NuxtLink
                    >
                    <StatusBadge
                      :status="SUBSCRIPTION_STATUS[row.subscriptionStatus]"
                      size="sm"
                      class="self-start"
                    />
                  </div>
                </td>
                <td class="px-4 py-2 text-right">{{ formatCount(row.shifts) }}</td>
                <td class="px-4 py-2 text-right">{{ formatCount(row.tabs) }}</td>
                <td class="px-4 py-2 text-right">{{ formatCents(row.soldCents) }}</td>
                <td class="px-4 py-2">{{ formatDateTime(row.lastAccessAt, 'Sem acesso') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-sm text-(--color-text-muted)">
          O último acesso vem das sessões, que são apagadas 30 dias depois de vencidas.
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.metric {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 1rem;
}
.metric dt {
  font-size: var(--font-size-15);
  color: var(--color-text-muted);
}
.metric dd {
  font-family: var(--font-display);
  font-size: var(--font-size-24);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.metric-help {
  font-size: var(--font-size-13);
  color: var(--color-text-muted);
}
</style>
