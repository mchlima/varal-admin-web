<script setup lang="ts">
/**
 * Início (spec 02, seção 11): organizações por situação, alerta de e-mail e
 * atalhos, cada bloco só para quem tem a permissão (RN-02.01).
 */
useHead({ title: 'Início' })

const { $api } = useNuxtApp()
const session = useSessionStore()
const { can } = usePermissions()
const NuxtLink = resolveComponent('NuxtLink')

const firstName = computed(() => session.admin?.name.trim().split(/\s+/)[0] ?? '')

const overview = ref<MetricsOverview | null>(null)
const overviewError = ref<string | null>(null)
const overviewLoading = ref(false)

async function loadOverview() {
  overviewLoading.value = true
  overviewError.value = null
  const result = await apiCall($api.GET('/api/v1/admin/metrics/overview'))
  overviewLoading.value = false
  if (result.ok) overview.value = result.data
  else overviewError.value = result.error.message
}

onMounted(() => {
  if (can('metrics:read')) void loadOverview()
})

const totalOrganizations = computed(() =>
  overview.value
    ? SUBSCRIPTION_STATUSES.reduce(
        (sum, status) => sum + (overview.value?.organizationsByStatus[status] ?? 0),
        0,
      )
    : 0,
)

interface Shortcut {
  label: string
  to: string
  icon: string
  permission: PermissionRequirement
}

const shortcuts = computed(() =>
  (
    [
      {
        label: 'Nova organização',
        to: '/organizacoes/nova',
        icon: 'i-lucide-plus',
        permission: 'organizations:create',
      },
      {
        label: 'Novo comunicado',
        to: '/comunicados/novo',
        icon: 'i-lucide-megaphone',
        permission: 'announcements:manage',
      },
      {
        label: 'Organizações',
        to: '/organizacoes',
        icon: 'i-lucide-store',
        permission: 'organizations:read',
      },
      {
        label: 'Métricas',
        to: '/metricas',
        icon: 'i-lucide-chart-column',
        permission: 'metrics:read',
      },
      {
        label: 'Acessos de suporte',
        to: '/acessos-de-suporte',
        icon: 'i-lucide-log-in',
        permission: 'impersonation:use',
      },
      {
        label: 'Auditoria',
        to: '/auditoria',
        icon: 'i-lucide-scroll-text',
        permission: 'audit:read',
      },
    ] satisfies Shortcut[]
  ).filter((shortcut) => can(shortcut.permission)),
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      :title="firstName ? `Olá, ${firstName}` : 'Início'"
      description="Resumo da plataforma Varal."
    />

    <section
      v-if="can('metrics:read')"
      aria-labelledby="organizacoes-por-situacao"
      class="flex flex-col gap-3"
    >
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="organizacoes-por-situacao" class="text-lg font-semibold">
          Organizações por situação
        </h2>
        <p v-if="overview" class="text-sm text-(--color-text-muted) tabular-nums">
          {{ plural(totalOrganizations, 'organização', 'organizações') }} no total
        </p>
      </div>
      <LoadError v-if="overviewError" :message="overviewError" @retry="loadOverview" />
      <LoadingCard v-else-if="overviewLoading && !overview" label="Carregando as organizações…" />
      <ul v-else-if="overview" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <li v-for="status in SUBSCRIPTION_STATUSES" :key="status">
          <component
            :is="can('organizations:read') ? NuxtLink : 'div'"
            :to="
              can('organizations:read')
                ? { path: '/organizacoes', query: { situacao: status } }
                : undefined
            "
            class="flex h-full flex-col gap-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4"
            :class="{ 'hover:border-(--color-border-strong)': can('organizations:read') }"
            :data-testid="`status-card-${status}`"
          >
            <StatusBadge :status="SUBSCRIPTION_STATUS[status]" size="sm" class="self-start" />
            <span class="font-heading text-2xl font-extrabold tabular-nums">
              {{ formatCount(overview.organizationsByStatus[status] ?? 0) }}
            </span>
            <span class="text-sm text-(--color-text-muted)">{{
              SUBSCRIPTION_STATUS[status].plural
            }}</span>
          </component>
        </li>
      </ul>
    </section>

    <!-- Alerta de e-mail do plano (RN-01.04, CA-01.09) -->
    <EmailUsagePanel v-if="can('emails:read')" />

    <section v-if="shortcuts.length > 0" aria-labelledby="atalhos" class="flex flex-col gap-3">
      <h2 id="atalhos" class="text-lg font-semibold">Atalhos</h2>
      <ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="shortcut in shortcuts" :key="shortcut.to">
          <UButton
            :to="shortcut.to"
            color="neutral"
            variant="outline"
            block
            :icon="shortcut.icon"
            :label="shortcut.label"
            class="justify-start"
          />
        </li>
      </ul>
    </section>

    <EmptyState
      v-if="shortcuts.length === 0 && !can('metrics:read') && !can('emails:read')"
      icon="i-lucide-lock"
      title="Nada para mostrar por aqui"
      description="O seu usuário ainda não tem permissões no admin. Peça a um Super admin para atribuir um papel."
    />
  </div>
</template>
