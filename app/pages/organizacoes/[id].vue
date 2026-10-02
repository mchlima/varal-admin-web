<script setup lang="ts">
/**
 * Organização (spec 02, seção 4 e 11): situação, dono e convite, unidades,
 * colaboradores ativos, últimos 10 dias de operação, último acesso e comunicados não
 * lidos. Ações conforme a permissão (RN-02.01) e a situação (RN-02.11):
 * Suspender/Reativar, Mudar situação, Editar, Reenviar convite e Entrar como.
 */
definePageMeta({ permission: 'organizations:read' })

const { $api } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { can } = usePermissions()

const id = computed(() => String(route.params.id))
const organization = ref<OrganizationDetail | null>(null)
const loadError = ref<string | null>(null)
const loading = ref(true)

useHead({ title: () => organization.value?.name ?? 'Organização' })

async function load() {
  loading.value = true
  loadError.value = null
  const result = await apiCall(
    $api.GET('/api/v1/admin/organizations/{id}', { params: { path: { id: id.value } } }),
  )
  loading.value = false
  if (result.ok) organization.value = result.data
  else loadError.value = result.error.message
}

onMounted(load)

const suspendOpen = ref(false)
const reactivateOpen = ref(false)
const changeStatusOpen = ref(false)
const editOpen = ref(false)
const resendOpen = ref(false)
const impersonateOpen = ref(false)

const status = computed(() => organization.value?.subscriptionStatus ?? 'active')
const owner = computed(() => organization.value?.owner ?? null)

const reactivateOptions = selectOptions(
  ['active', 'pilot'] as const,
  (key) => SUBSCRIPTION_STATUS[key].label,
)
const changeOptions = computed(() =>
  selectOptions(
    SUBSCRIPTION_STATUSES.filter((key) => key !== status.value),
    (key) => SUBSCRIPTION_STATUS[key].label,
  ),
)

function updated(next: OrganizationDetail, message: string) {
  organization.value = next
  toast.add({ title: message, icon: 'i-lucide-circle-check', color: 'success' })
}

async function suspend({ reason }: { reason: string }) {
  const result = await apiCall(
    $api.POST('/api/v1/admin/organizations/{id}/suspend', {
      params: { path: { id: id.value } },
      body: { reason },
    }),
  )
  if (result.ok) updated(result.data, 'Organização suspensa.')
  return result
}

async function reactivate({
  reason,
  status: next,
}: {
  reason: string
  status: 'active' | 'pilot' | undefined
}) {
  const result = await apiCall(
    $api.POST('/api/v1/admin/organizations/{id}/reactivate', {
      params: { path: { id: id.value } },
      body: { reason, status: next ?? 'active' },
    }),
  )
  if (result.ok) updated(result.data, 'Organização reativada.')
  return result
}

async function changeStatus({
  reason,
  status: next,
}: {
  reason: string
  status: SubscriptionStatus | undefined
}) {
  if (!next)
    return {
      ok: false as const,
      error: { code: 'VALIDATION_FAILED', message: 'Escolha a situação.', fields: {} },
    }
  const result = await apiCall(
    $api.PUT('/api/v1/admin/organizations/{id}/subscription-status', {
      params: { path: { id: id.value } },
      body: { reason, status: next },
    }),
  )
  if (result.ok)
    updated(result.data, `Situação mudada para ${SUBSCRIPTION_STATUS[next].label.toLowerCase()}.`)
  return result
}

async function resendInvite() {
  const result = await apiCall(
    $api.POST('/api/v1/admin/organizations/{id}/owner-invite', {
      params: { path: { id: id.value } },
    }),
  )
  if (result.ok) {
    toast.add({
      title: 'Convite reenviado.',
      description: `Vale até ${formatDateTime(result.data.expiresAt)}.`,
      icon: 'i-lucide-circle-check',
      color: 'success',
    })
    void load()
  }
  return result
}

const canImpersonate = computed(() => can('impersonation:use') && owner.value?.active === true)
const canResendInvite = computed(
  () =>
    can('organizations:update') && owner.value !== null && owner.value.inviteStatus !== 'accepted',
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <UButton
      to="/organizacoes"
      color="neutral"
      variant="link"
      icon="i-lucide-arrow-left"
      label="Organizações"
      class="self-start px-0"
    />

    <LoadError v-if="loadError" :message="loadError" @retry="load" />
    <LoadingCard v-else-if="loading && !organization" label="Carregando a organização…" />

    <template v-else-if="organization">
      <header class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-xl font-extrabold lg:text-2xl">{{ organization.name }}</h1>
          <StatusBadge
            :status="SUBSCRIPTION_STATUS[organization.subscriptionStatus]"
            data-testid="organization-status"
          />
        </div>
        <p class="text-(--color-text-muted)">
          Código
          <span class="font-mono font-bold text-(--color-text)">{{ organization.accessCode }}</span>
          · criada em {{ formatDate(organization.createdAt) }}
        </p>
        <p
          v-if="
            organization.suspendedReason &&
            !['pilot', 'active'].includes(organization.subscriptionStatus)
          "
          class="flex items-start gap-2 rounded-(--radius-control) bg-(--color-status-late-bg) p-3 text-(--color-status-late-text)"
          data-testid="suspended-reason"
        >
          <UIcon name="i-lucide-circle-pause" class="mt-1 size-5 shrink-0" aria-hidden="true" />
          <span><strong>Motivo:</strong> {{ organization.suspendedReason }}</span>
        </p>
      </header>

      <div class="flex flex-wrap gap-2" aria-label="Ações da organização">
        <UButton
          v-if="canImpersonate"
          icon="i-lucide-log-in"
          label="Entrar como"
          class="w-full sm:w-auto"
          @click="impersonateOpen = true"
        />
        <UButton
          v-if="can('organizations:update')"
          color="primary"
          variant="outline"
          icon="i-lucide-pencil"
          label="Editar"
          @click="editOpen = true"
        />
        <UButton
          v-if="canResendInvite"
          color="primary"
          variant="outline"
          icon="i-lucide-mail"
          label="Reenviar convite"
          @click="resendOpen = true"
        />
        <UButton
          v-if="can('subscriptions:update')"
          color="primary"
          variant="outline"
          icon="i-lucide-repeat"
          label="Mudar situação"
          @click="changeStatusOpen = true"
        />
        <UButton
          v-if="can('organizations:suspend') && canReactivate(status)"
          color="primary"
          variant="outline"
          icon="i-lucide-circle-play"
          label="Reativar"
          @click="reactivateOpen = true"
        />
        <UButton
          v-if="can('organizations:suspend') && canSuspend(status)"
          color="error"
          variant="ghost"
          icon="i-lucide-circle-pause"
          label="Suspender"
          @click="suspendOpen = true"
        />
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <UCard>
          <template #header><h2 class="text-lg font-semibold">Dono</h2></template>
          <div v-if="owner" class="flex flex-col gap-2">
            <p class="font-bold">{{ owner.name }}</p>
            <p class="break-all text-(--color-text-muted)">{{ owner.email }}</p>
            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge
                :status="OWNER_INVITE_STATUS[owner.inviteStatus]"
                size="sm"
                data-testid="owner-invite-status"
              />
              <span
                v-if="owner.inviteStatus === 'pending' && owner.inviteExpiresAt"
                class="text-sm text-(--color-text-muted)"
              >
                vale até {{ formatDateTime(owner.inviteExpiresAt) }}
              </span>
            </div>
            <p
              v-if="!owner.active && owner.inviteStatus === 'accepted'"
              class="text-sm text-(--color-text-muted)"
            >
              Dono desativado: não dá para entrar como ele.
            </p>
          </div>
          <p v-else class="text-(--color-text-muted)">Esta organização não tem dono cadastrado.</p>
        </UCard>

        <UCard>
          <template #header><h2 class="text-lg font-semibold">Uso</h2></template>
          <dl class="grid grid-cols-2 gap-4">
            <div>
              <dt class="text-sm text-(--color-text-muted)">Colaboradores ativos</dt>
              <dd class="font-heading text-2xl font-extrabold tabular-nums">
                {{ formatCount(organization.activeStaffCount) }}
              </dd>
            </div>
            <div>
              <dt class="text-sm text-(--color-text-muted)">Comunicados não lidos</dt>
              <dd class="font-heading text-2xl font-extrabold tabular-nums">
                {{ formatCount(organization.unreadAnnouncements) }}
              </dd>
            </div>
            <div class="col-span-2">
              <dt class="text-sm text-(--color-text-muted)">Último acesso de qualquer usuário</dt>
              <dd class="font-bold">
                {{
                  formatDateTime(organization.lastAccessAt, 'Ninguém entrou nos últimos 30 dias')
                }}
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard>
          <template #header><h2 class="text-lg font-semibold">Unidades</h2></template>
          <ul
            v-if="organization.units.length > 0"
            class="flex flex-col divide-y divide-(--color-border)"
          >
            <li
              v-for="unit in organization.units"
              :key="unit.id"
              class="flex items-center justify-between gap-2 py-2"
            >
              <span class="font-bold">{{ unit.name }}</span>
              <StatusBadge
                :status="
                  unit.active
                    ? { label: 'Ativa', icon: 'i-lucide-circle-check', color: 'success' }
                    : { label: 'Desativada', icon: 'i-lucide-circle-minus', color: 'neutral' }
                "
                size="sm"
              />
            </li>
          </ul>
          <p v-else class="text-(--color-text-muted)">Nenhuma unidade.</p>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Últimos dias de operação</h2>
          </template>
          <ul
            v-if="organization.recentOperationDays.length > 0"
            class="flex flex-col divide-y divide-(--color-border)"
            data-testid="recent-operation-days"
          >
            <li
              v-for="day in organization.recentOperationDays"
              :key="`${day.unitId}-${day.businessDate}`"
              class="flex items-center justify-between gap-2 py-2 tabular-nums"
            >
              <div class="flex flex-col">
                <span class="font-bold">{{ formatDay(day.businessDate) }}</span>
                <span class="text-sm text-(--color-text-muted)">{{ day.unitName }}</span>
              </div>
              <span>{{ formatCents(day.salesCents) }}</span>
            </li>
          </ul>
          <p v-else class="text-(--color-text-muted)">
            Nenhum dia de operação ainda. Eles aparecem aqui quando a organização abrir caixa.
          </p>
        </UCard>
      </div>

      <ReasonModal
        v-model:open="suspendOpen"
        title="Suspender organização"
        :description="`${organization.name} não poderá abrir caixa; caixas já abertos seguem até o fechamento. O dono verá uma faixa no painel com o motivo.`"
        confirm-label="Suspender"
        destructive
        reason-help="Vai para a auditoria e aparece para o dono."
        :action="suspend"
      />
      <ReasonModal
        v-model:open="reactivateOpen"
        title="Reativar organização"
        :description="`${organization.name} volta a poder abrir caixa.`"
        confirm-label="Reativar"
        status-label="Voltar para"
        :status-options="reactivateOptions"
        initial-status="active"
        :action="reactivate"
      />
      <ReasonModal
        v-model:open="changeStatusOpen"
        title="Mudar situação da assinatura"
        :description="`Situação atual: ${SUBSCRIPTION_STATUS[status].label}.`"
        confirm-label="Mudar situação"
        :status-options="changeOptions"
        :action="changeStatus"
      />
      <EditOrganizationModal
        v-model:open="editOpen"
        :organization="organization"
        @saved="updated($event, 'Organização salva.')"
      />
      <ConfirmModal
        v-model:open="resendOpen"
        title="Reenviar convite do dono"
        :description="`Um e-mail com um link novo para definir a senha vai para ${owner?.email}.`"
        confirm-label="Reenviar convite"
        :action="resendInvite"
      />
      <ImpersonateModal
        v-if="owner"
        v-model:open="impersonateOpen"
        :organization-id="organization.id"
        :organization-name="organization.name"
        :owner-name="owner.name"
      />
    </template>
  </div>
</template>
