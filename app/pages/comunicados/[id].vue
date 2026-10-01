<script setup lang="ts">
/**
 * Comunicado: rascunho e agendado abrem no editor (quem tem
 * `announcements:manage`); publicado e arquivado só para leitura, com a
 * contagem de leituras (RN-02.15, spec 02, seção 5). Arquivar pede
 * confirmação na própria tela.
 */
definePageMeta({ permission: 'announcements:read' })

const { $api } = useNuxtApp()
const route = useRoute()
const toast = useToast()
const { can } = usePermissions()

const id = computed(() => String(route.params.id))
const announcement = ref<Announcement | null>(null)
const organizations = ref<OrganizationOption[]>([])
const loadError = ref<string | null>(null)
const loading = ref(true)
const archiveOpen = ref(false)
const editorKey = ref(0)

useHead({ title: () => announcement.value?.title ?? 'Comunicado' })

/** Nome das organizações escolhidas, para o editor e a leitura. */
async function loadOrganizations(ids: readonly string[]) {
  if (ids.length === 0 || !can('organizations:read')) {
    organizations.value = ids.map((value) => ({ label: 'Organização', value }))
    return
  }
  const results = await Promise.all(
    ids
      .slice(0, 100)
      .map((orgId) =>
        apiCall($api.GET('/api/v1/admin/organizations/{id}', { params: { path: { id: orgId } } })),
      ),
  )
  organizations.value = ids.map((value, index) => {
    const result = results[index]
    return { label: result?.ok ? result.data.name : 'Organização', value }
  })
}

async function load() {
  loading.value = true
  loadError.value = null
  const result = await apiCall(
    $api.GET('/api/v1/admin/announcements/{id}', { params: { path: { id: id.value } } }),
  )
  if (result.ok) {
    await loadOrganizations(
      result.data.audienceType === 'selected' ? result.data.organizationIds : [],
    )
    announcement.value = result.data
    editorKey.value += 1
  } else {
    loadError.value = result.error.message
  }
  loading.value = false
}

onMounted(load)

const editable = computed(
  () =>
    announcement.value !== null &&
    can('announcements:manage') &&
    isAnnouncementEditable(announcement.value.status),
)

async function saved(next: Announcement, kind: 'draft' | 'published' | 'scheduled') {
  toast.add({ title: SAVED_MESSAGE[kind], icon: 'i-lucide-circle-check', color: 'success' })
  await loadOrganizations(next.audienceType === 'selected' ? next.organizationIds : [])
  announcement.value = next
  editorKey.value += 1
}

async function archive() {
  const result = await apiCall(
    $api.POST('/api/v1/admin/announcements/{id}/archive', { params: { path: { id: id.value } } }),
  )
  if (result.ok) {
    announcement.value = result.data
    toast.add({ title: 'Comunicado arquivado.', icon: 'i-lucide-archive', color: 'success' })
  }
  return result
}

const audience = computed(() => {
  const item = announcement.value
  if (!item) return ''
  if (item.audienceType === 'by_status') {
    return `Organizações em: ${item.audienceStatuses.map((key) => SUBSCRIPTION_STATUS[key].label).join(', ')}`
  }
  if (item.audienceType === 'selected')
    return organizations.value.map((option) => option.label).join(', ')
  return AUDIENCE_TYPE.all
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <UButton
      to="/comunicados"
      color="neutral"
      variant="link"
      icon="i-lucide-arrow-left"
      label="Comunicados"
      class="self-start px-0"
    />

    <LoadError v-if="loadError" :message="loadError" @retry="load" />
    <LoadingCard v-else-if="loading && !announcement" label="Carregando o comunicado…" />

    <template v-else-if="announcement">
      <header class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-xl font-extrabold lg:text-2xl">
            {{ editable ? 'Editar comunicado' : announcement.title }}
          </h1>
          <StatusBadge
            :status="ANNOUNCEMENT_STATUS[announcement.status]"
            data-testid="announcement-status"
          />
        </div>
        <p class="text-sm text-(--color-text-muted)">
          Criado por {{ announcement.createdBy.name }} em
          {{ formatDateTime(announcement.createdAt) }}
          <template v-if="announcement.status === 'scheduled'">
            · agendado para {{ formatDateTime(announcement.publishAt) }}</template
          >
          <template v-if="announcement.publishedAt">
            · publicado em {{ formatDateTime(announcement.publishedAt) }}</template
          >
          <template v-if="announcement.archivedAt">
            · arquivado em {{ formatDateTime(announcement.archivedAt) }}</template
          >
        </p>
        <p
          v-if="announcement.status === 'published' || announcement.status === 'archived'"
          class="flex items-center gap-2 font-bold tabular-nums"
          data-testid="announcement-reads"
        >
          <UIcon name="i-lucide-eye" class="size-5" aria-hidden="true" />
          {{ readSummary(announcement) }}
        </p>
      </header>

      <AnnouncementEditor
        v-if="editable"
        :key="editorKey"
        :announcement="announcement"
        :initial-organizations="organizations"
        @saved="saved"
      />

      <template v-else>
        <UCard>
          <MarkdownPreview :source="announcement.body" />
        </UCard>
        <UCard>
          <template #header><h2 class="text-lg font-semibold">Público</h2></template>
          <p>{{ audience }}</p>
        </UCard>
      </template>

      <div
        v-if="can('announcements:manage') && announcement.status !== 'archived'"
        class="flex justify-end"
      >
        <UButton
          color="error"
          variant="ghost"
          icon="i-lucide-archive"
          label="Arquivar comunicado"
          @click="archiveOpen = true"
        />
      </div>

      <ConfirmModal
        v-model:open="archiveOpen"
        title="Arquivar comunicado"
        description="O comunicado sai da faixa dos donos que ainda não leram e não pode ser publicado de novo."
        confirm-label="Arquivar"
        destructive
        :action="archive"
      />
    </template>
  </div>
</template>
