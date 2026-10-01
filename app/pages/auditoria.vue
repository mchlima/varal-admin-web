<script setup lang="ts">
/**
 * Auditoria (spec 02, seção 8): lista da mais nova para a mais antiga,
 * filtrável por organização, ator, ação (exata ou prefixo terminado em
 * ponto), entidade e período, com o detalhe das alterações. Ações feitas
 * durante um "entrar como" aparecem destacadas com o admin em
 * `impersonator_id` (RN-02.20).
 */
definePageMeta({ permission: 'audit:read' })
useHead({ title: 'Auditoria' })

const { $api } = useNuxtApp()
const { can } = usePermissions()

const filters = reactive({
  organizationId: undefined as string | undefined,
  actorType: 'all' as ActorType | 'all',
  actorId: '',
  impersonatorId: '',
  action: '',
  entityType: '',
  from: '',
  to: '',
})
/** Campos de texto só valem depois de uma pausa na digitação. */
const applied = ref({ ...filters })
const filterErrors = computed(() => ({
  actorId:
    filters.actorId.trim() && !UUID_PATTERN.test(filters.actorId.trim())
      ? 'Cole o id completo do ator.'
      : undefined,
  impersonatorId:
    filters.impersonatorId.trim() && !UUID_PATTERN.test(filters.impersonatorId.trim())
      ? 'Cole o id completo do admin.'
      : undefined,
}))

const actorOptions = [
  { label: 'Todos os atores', value: 'all' },
  ...selectOptions(Object.keys(ACTOR_TYPE) as ActorType[], (key) => ACTOR_TYPE[key]),
]

const list = useCursorList<AuditLogEntry>((cursor) => {
  const current = applied.value
  return apiCall(
    $api.GET('/api/v1/admin/audit-logs', {
      params: {
        query: {
          organizationId: current.organizationId || undefined,
          actorType: current.actorType === 'all' ? undefined : current.actorType,
          actorId: current.actorId.trim() || undefined,
          impersonatorId: current.impersonatorId.trim() || undefined,
          action: current.action.trim() || undefined,
          entityType: current.entityType.trim() || undefined,
          ...dayRangeToInstants(current.from, current.to),
          cursor,
          limit: 50,
        },
      },
    }),
  )
})

let timer: ReturnType<typeof setTimeout> | undefined
watch(
  filters,
  () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      if (filterErrors.value.actorId || filterErrors.value.impersonatorId) return
      applied.value = { ...filters }
      void list.reload()
    }, 350)
  },
  { deep: true },
)
onBeforeUnmount(() => clearTimeout(timer))
onMounted(() => void list.reload())

/** Nome dos admins da plataforma, quando o usuário pode ver a lista deles. */
const adminNames = ref(new Map<string, string>())
onMounted(async () => {
  if (!can('admin.users:manage')) return
  const result = await apiCall(
    $api.GET('/api/v1/admin/users', { params: { query: { limit: 100 } } }),
  )
  if (result.ok) adminNames.value = new Map(result.data.data.map((user) => [user.id, user.name]))
})

function actorLabel(entry: AuditLogEntry): string {
  const type = ACTOR_TYPE[entry.actorType]
  if (!entry.actorId) return type
  const name =
    entry.actorType === 'platform_admin' ? adminNames.value.get(entry.actorId) : undefined
  return name ? `${type}: ${name}` : `${type} …${shortId(entry.actorId)}`
}

function impersonatorLabel(id: string): string {
  return adminNames.value.get(id) ?? `admin …${shortId(id)}`
}

const expanded = ref(new Set<string>())
function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function filterBy(field: 'actorId' | 'impersonatorId', id: string) {
  filters[field] = id
}

const filtered = computed(() =>
  Object.entries(applied.value).some(([key, value]) =>
    key === 'actorType' ? value !== 'all' : Boolean(value),
  ),
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Auditoria"
      description="Quem fez o quê, quando e de onde, em toda a plataforma."
    />

    <UCard>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <UFormField v-if="can('organizations:read')" label="Organização" name="organizationId">
          <OrganizationSelect v-model="filters.organizationId" />
        </UFormField>
        <UFormField label="Tipo de ator" name="actorType">
          <USelect v-model="filters.actorType" :items="actorOptions" class="w-full" />
        </UFormField>
        <UFormField
          label="Ação"
          name="action"
          help="Exata, ou o começo terminado em ponto: organization."
        >
          <UInput
            v-model="filters.action"
            placeholder="organization.suspended"
            class="w-full font-mono"
          />
        </UFormField>
        <UFormField label="Entidade" name="entityType">
          <UInput
            v-model="filters.entityType"
            placeholder="organization"
            class="w-full font-mono"
          />
        </UFormField>
        <UFormField label="Id do ator" name="actorId" :error="filterErrors.actorId">
          <UInput v-model="filters.actorId" class="w-full font-mono" />
        </UFormField>
        <UFormField
          label='Admin do "entrar como" (id)'
          name="impersonatorId"
          :error="filterErrors.impersonatorId"
        >
          <UInput v-model="filters.impersonatorId" class="w-full font-mono" />
        </UFormField>
        <PeriodFields v-model:from="filters.from" v-model:to="filters.to" />
      </div>
    </UCard>

    <LoadError
      v-if="list.error.value && list.items.value.length === 0"
      :message="list.error.value"
      @retry="list.reload"
    />
    <LoadingCard
      v-else-if="list.loading.value && list.items.value.length === 0"
      label="Carregando a auditoria…"
    />
    <EmptyState
      v-else-if="list.empty.value"
      icon="i-lucide-scroll-text"
      :title="filtered ? 'Nenhum registro com esses filtros' : 'Nenhum registro ainda'"
      :description="filtered ? 'Tente outro período ou tire algum filtro.' : undefined"
    />

    <ul v-else class="flex flex-col gap-2" aria-label="Registros da auditoria">
      <li
        v-for="entry in list.items.value"
        :key="entry.id"
        class="flex flex-col overflow-hidden rounded-(--radius-card) border bg-(--color-surface)"
        :class="entry.impersonatorId ? 'border-2 border-(--color-text)' : 'border-(--color-border)'"
        data-testid="audit-row"
      >
        <p
          v-if="entry.impersonatorId"
          class="flex flex-wrap items-center gap-2 bg-(--color-text) px-4 py-2 text-sm font-bold text-(--color-primary-ink)"
          data-testid="audit-impersonator"
        >
          <UIcon name="i-lucide-user-cog" class="size-4" aria-hidden="true" />
          Feito durante um "entrar como" por {{ impersonatorLabel(entry.impersonatorId) }}
        </p>
        <div class="flex flex-col gap-2 p-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <span class="font-mono font-bold break-all">{{ entry.action }}</span>
            <span class="text-sm text-(--color-text-muted) tabular-nums">{{
              formatDateTime(entry.createdAt)
            }}</span>
          </div>
          <p class="text-sm">
            <span>{{ actorLabel(entry) }}</span>
            <span class="text-(--color-text-muted)"> · {{ entry.entityType }}</span>
            <span v-if="entry.entityId" class="font-mono text-(--color-text-muted)">
              …{{ shortId(entry.entityId) }}</span
            >
            <template v-if="entry.organizationId && can('organizations:read')">
              ·
              <NuxtLink
                :to="`/organizacoes/${entry.organizationId}`"
                class="font-bold text-(--color-primary-deep) underline"
                >organização</NuxtLink
              >
            </template>
          </p>
          <UButton
            color="neutral"
            variant="link"
            size="sm"
            class="self-start px-0"
            :trailing-icon="
              expanded.has(entry.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
            "
            :label="expanded.has(entry.id) ? 'Esconder detalhes' : 'Ver detalhes'"
            :aria-expanded="expanded.has(entry.id)"
            @click="toggle(entry.id)"
          />
          <div
            v-if="expanded.has(entry.id)"
            class="flex flex-col gap-3 text-sm"
            data-testid="audit-detail"
          >
            <div v-if="auditChangeRows(entry.changes).length > 0" class="relative overflow-x-auto">
              <table class="w-full min-w-[28rem] text-left">
                <thead class="bg-(--color-surface-muted)">
                  <tr>
                    <th scope="col" class="px-2 py-1">Campo</th>
                    <th scope="col" class="px-2 py-1">Antes</th>
                    <th scope="col" class="px-2 py-1">Depois</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in auditChangeRows(entry.changes)"
                    :key="row.field"
                    class="border-t border-(--color-border) align-top"
                    :class="{ 'bg-(--color-primary-soft)': row.changed }"
                  >
                    <td class="px-2 py-1 font-mono">{{ row.field }}</td>
                    <td class="px-2 py-1 break-all">{{ row.before }}</td>
                    <td class="px-2 py-1 break-all">{{ row.after }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <dl
              v-if="auditMetadata(entry.changes).length > 0"
              class="grid gap-1 sm:grid-cols-[12rem_1fr]"
            >
              <template v-for="item in auditMetadata(entry.changes)" :key="item.key">
                <dt class="font-mono text-(--color-text-muted)">{{ item.key }}</dt>
                <dd class="break-all">{{ item.value }}</dd>
              </template>
            </dl>
            <dl class="grid gap-1 text-(--color-text-muted) sm:grid-cols-[12rem_1fr]">
              <template v-if="entry.actorId">
                <dt>Ator</dt>
                <dd class="flex flex-wrap items-center gap-2 font-mono break-all">
                  {{ entry.actorId }}
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    label="Filtrar"
                    @click="filterBy('actorId', entry.actorId)"
                  />
                </dd>
              </template>
              <template v-if="entry.impersonatorId">
                <dt>Admin do "entrar como"</dt>
                <dd class="flex flex-wrap items-center gap-2 font-mono break-all">
                  {{ entry.impersonatorId }}
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    label="Filtrar"
                    @click="filterBy('impersonatorId', entry.impersonatorId)"
                  />
                </dd>
                <dt>Sessão do "entrar como"</dt>
                <dd class="font-mono break-all">{{ entry.impersonationId ?? '—' }}</dd>
              </template>
              <template v-if="entry.entityId">
                <dt>Entidade</dt>
                <dd class="font-mono break-all">{{ entry.entityId }}</dd>
              </template>
              <dt>IP</dt>
              <dd class="font-mono">{{ entry.ip ?? '—' }}</dd>
              <dt>Aparelho</dt>
              <dd class="font-mono break-all">{{ entry.deviceId ?? '—' }}</dd>
              <dt>Requisição</dt>
              <dd class="font-mono break-all">{{ entry.requestId ?? '—' }}</dd>
            </dl>
          </div>
        </div>
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
