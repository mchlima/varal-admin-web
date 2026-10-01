<script setup lang="ts">
/**
 * Editor de comunicado (RN-02.13 a RN-02.15): título (até 80), texto em
 * markdown simples (até 2.000) com prévia, público (todas, por situação ou
 * escolhidas) e publicação agora ou agendada. Salva como rascunho; publicar
 * salva antes e depois chama `POST /publish`.
 */
const props = defineProps<{
  announcement?: Announcement | null
  initialOrganizations?: OrganizationOption[]
}>()
const emit = defineEmits<{ saved: [Announcement, 'draft' | 'published' | 'scheduled'] }>()

const { $api } = useNuxtApp()
const formId = useId()
const form = useTemplateRef('form')

const state = reactive<AnnouncementForm>({
  title: props.announcement?.title ?? '',
  body: props.announcement?.body ?? '',
  audienceType: props.announcement?.audienceType ?? 'all',
  audienceStatuses: [...(props.announcement?.audienceStatuses ?? [])],
  organizationIds: [...(props.announcement?.organizationIds ?? [])],
})
const mode = ref<'write' | 'preview'>('write')
const publishMode = ref<'now' | 'schedule'>(
  props.announcement?.status === 'scheduled' ? 'schedule' : 'now',
)
const publishAt = ref(
  props.announcement?.status === 'scheduled' && props.announcement.publishAt
    ? isoToSaoPauloLocal(props.announcement.publishAt)
    : '',
)
const formError = ref<string | null>(null)
const saving = ref<'draft' | 'publish' | null>(null)

const audienceOptions = selectOptions(
  ['all', 'by_status', 'selected'] as const,
  (key) => AUDIENCE_TYPE[key],
)
const statusItems = selectOptions(SUBSCRIPTION_STATUSES, (key) => SUBSCRIPTION_STATUS[key].label)
const publishOptions = [
  { label: 'Publicar agora', value: 'now' },
  { label: 'Agendar', value: 'schedule' },
]

const isScheduled = computed(() => props.announcement?.status === 'scheduled')

function validatePublishAt(): string | null {
  if (publishMode.value !== 'schedule') return null
  const iso = saoPauloLocalToIso(publishAt.value)
  if (!iso) return 'Informe a data e a hora da publicação.'
  if (new Date(iso).getTime() <= Date.now()) return 'Escolha uma data no futuro, ou publique agora.'
  return null
}

function body() {
  return {
    title: state.title.trim(),
    body: state.body.trim(),
    audienceType: state.audienceType,
    audienceStatuses: state.audienceType === 'by_status' ? state.audienceStatuses : [],
    organizationIds: state.audienceType === 'selected' ? state.organizationIds : [],
  }
}

async function save(): Promise<ApiResult<Announcement>> {
  if (props.announcement) {
    return apiCall(
      $api.PATCH('/api/v1/admin/announcements/{id}', {
        params: { path: { id: props.announcement.id } },
        body: body(),
      }),
    )
  }
  return apiCall($api.POST('/api/v1/admin/announcements', { body: body() }))
}

function showError(error: ApiErrorInfo) {
  if (Object.keys(error.fields).length > 0) form.value?.setErrors(fieldErrors(error.fields))
  else formError.value = error.message
}

async function run(kind: 'draft' | 'publish') {
  formError.value = null
  const errors = validateAnnouncement(state)
  const publishError = kind === 'publish' ? validatePublishAt() : null
  if (publishError) errors.push({ name: 'publishAt', message: publishError })
  if (errors.length > 0) {
    form.value?.setErrors(errors)
    mode.value = 'write'
    return
  }
  saving.value = kind
  const saved = await save()
  if (!saved.ok) {
    saving.value = null
    showError(saved.error)
    return
  }
  if (kind === 'draft') {
    saving.value = null
    emit('saved', saved.data, 'draft')
    return
  }
  const iso = publishMode.value === 'schedule' ? saoPauloLocalToIso(publishAt.value) : null
  const published = await apiCall(
    $api.POST('/api/v1/admin/announcements/{id}/publish', {
      params: { path: { id: saved.data.id } },
      body: iso ? { publishAt: iso } : {},
    }),
  )
  saving.value = null
  if (published.ok) {
    emit('saved', published.data, published.data.status === 'scheduled' ? 'scheduled' : 'published')
  } else {
    // O rascunho ficou salvo; avisa e deixa tentar publicar de novo
    emit('saved', saved.data, 'draft')
    formError.value = `O rascunho foi salvo, mas não deu para publicar: ${published.error.message}`
  }
}
</script>

<template>
  <UForm
    :id="formId"
    ref="form"
    :state="state"
    :validate="() => validateAnnouncement(state)"
    :validate-on="['blur']"
    class="flex flex-col gap-6"
    @submit="run('draft')"
  >
    <FormErrorAlert v-if="formError" :message="formError" />

    <UCard>
      <div class="flex flex-col gap-4">
        <UFormField
          label="Título"
          name="title"
          :hint="`${state.title.length}/${ANNOUNCEMENT_TITLE_MAX}`"
        >
          <UInput v-model="state.title" :maxlength="ANNOUNCEMENT_TITLE_MAX" class="w-full" />
        </UFormField>

        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-bold">Texto</span>
            <UTabs
              v-model="mode"
              :items="[
                { label: 'Escrever', value: 'write', icon: 'i-lucide-pencil' },
                { label: 'Prévia', value: 'preview', icon: 'i-lucide-eye' },
              ]"
              :content="false"
              size="sm"
            />
          </div>
          <UFormField
            v-show="mode === 'write'"
            name="body"
            :hint="`${state.body.length}/${ANNOUNCEMENT_BODY_MAX}`"
            help="Markdown simples: **negrito**, *itálico*, listas com - ou 1. e links [texto](https://...). Deixe uma linha em branco entre os parágrafos."
          >
            <UTextarea
              v-model="state.body"
              aria-label="Texto"
              :rows="8"
              :maxlength="ANNOUNCEMENT_BODY_MAX"
              autoresize
              class="w-full"
            />
          </UFormField>
          <div
            v-if="mode === 'preview'"
            class="min-h-40 rounded-(--radius-control) border border-(--color-border) bg-(--color-surface-muted) p-4"
            data-testid="announcement-preview"
          >
            <p class="mb-2 font-heading text-lg font-semibold">{{ state.title || 'Sem título' }}</p>
            <MarkdownPreview v-if="state.body.trim()" :source="state.body" />
            <p v-else class="text-(--color-text-muted)">
              O texto aparece aqui como o dono vai ver.
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Público</h2>
        <p class="text-sm text-(--color-text-muted)">
          Quem vê é o dono de cada organização. "Por situação" vale para a situação no momento da
          leitura.
        </p>
      </template>
      <div class="flex flex-col gap-4">
        <UFormField name="audienceType" label="Enviar para">
          <URadioGroup v-model="state.audienceType" :items="audienceOptions" />
        </UFormField>
        <UFormField
          v-if="state.audienceType === 'by_status'"
          label="Situações"
          name="audienceStatuses"
        >
          <UCheckboxGroup
            v-model="state.audienceStatuses"
            :items="statusItems"
            orientation="horizontal"
          />
        </UFormField>
        <UFormField
          v-if="state.audienceType === 'selected'"
          label="Organizações"
          name="organizationIds"
        >
          <OrganizationMultiSelect
            v-model="state.organizationIds"
            :initial="initialOrganizations"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold">Publicação</h2>
        <p class="text-sm text-(--color-text-muted)">
          Depois de publicado, o comunicado só pode ser arquivado; o texto não muda mais.
        </p>
      </template>
      <div class="flex flex-col gap-4">
        <URadioGroup v-model="publishMode" :items="publishOptions" orientation="horizontal" />
        <UFormField
          v-if="publishMode === 'schedule'"
          label="Data e hora (horário de Brasília)"
          name="publishAt"
        >
          <UInput v-model="publishAt" type="datetime-local" class="w-full sm:w-72" />
        </UFormField>
      </div>
    </UCard>

    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <UButton
        type="submit"
        color="primary"
        variant="outline"
        icon="i-lucide-save"
        :label="isScheduled ? 'Salvar alterações' : 'Salvar rascunho'"
        :loading="saving === 'draft'"
        :disabled="saving !== null"
      />
      <UButton
        :icon="publishMode === 'schedule' ? 'i-lucide-calendar-clock' : 'i-lucide-send'"
        :label="
          publishMode === 'schedule' ? (isScheduled ? 'Reagendar' : 'Agendar') : 'Publicar agora'
        "
        :loading="saving === 'publish'"
        :disabled="saving !== null"
        @click="run('publish')"
      />
    </div>
  </UForm>
</template>
