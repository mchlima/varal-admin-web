<script setup lang="ts">
/**
 * Nova organização (RN-02.09): nome, primeira unidade (com o template padrão
 * de estações e etapas) e dono, que recebe o convite por e-mail. Situação
 * inicial `active` ou `pilot` (RN-02.11). E-mail de dono já usado:
 * `OWNER_EMAIL_TAKEN` (RN-02.10).
 */
definePageMeta({ permission: 'organizations:create' })
useHead({ title: 'Nova organização' })

const { $api } = useNuxtApp()
const toast = useToast()

const state = reactive<CreateOrganizationForm>({
  name: '',
  unitName: '',
  ownerName: '',
  ownerEmail: '',
  subscriptionStatus: 'active',
})
const formError = ref<string | null>(null)
const submitting = ref(false)
const form = useTemplateRef('form')

const statusOptions = selectOptions(
  ['active', 'pilot'] as const,
  (key) => SUBSCRIPTION_STATUS[key].label,
)

async function submit() {
  submitting.value = true
  formError.value = null
  const result = await apiCall(
    $api.POST('/api/v1/admin/organizations', {
      body: {
        name: state.name.trim(),
        unitName: state.unitName.trim(),
        owner: { name: state.ownerName.trim(), email: state.ownerEmail.trim().toLowerCase() },
        subscriptionStatus: state.subscriptionStatus,
      },
    }),
  )
  submitting.value = false

  if (result.ok) {
    toast.add({
      title: 'Organização criada.',
      description: `O convite foi enviado para ${result.data.owner?.email ?? 'o dono'}.`,
      icon: 'i-lucide-circle-check',
      color: 'success',
    })
    await navigateTo(`/organizacoes/${result.data.id}`)
    return
  }

  const { code, message, fields } = result.error
  if (code === 'OWNER_EMAIL_TAKEN') {
    form.value?.setErrors([{ name: 'owner.email', message }])
  } else if (Object.keys(fields).length > 0) {
    form.value?.setErrors(fieldErrors(fields))
  } else {
    formError.value = message
  }
}
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
    <PageHeader
      title="Nova organização"
      description="A organização nasce com a primeira unidade, as estações e etapas padrão e o convite do dono por e-mail."
    />

    <UForm
      ref="form"
      :state="state"
      :validate="() => validateCreateOrganization(state)"
      :validate-on="['blur']"
      class="flex max-w-2xl flex-col gap-6"
      @submit="submit"
    >
      <FormErrorAlert v-if="formError" :message="formError" />

      <UCard>
        <template #header><h2 class="text-lg font-semibold">Organização</h2></template>
        <div class="flex flex-col gap-4">
          <UFormField label="Nome da organização" name="name">
            <UInput
              v-model="state.name"
              maxlength="120"
              autocomplete="organization"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Nome da primeira unidade"
            name="unitName"
            help="Ex.: Feira da praça. Outras unidades o dono cria depois no painel."
          >
            <UInput v-model="state.unitName" maxlength="80" class="w-full" />
          </UFormField>
          <UFormField label="Situação inicial" name="subscriptionStatus">
            <URadioGroup
              v-model="state.subscriptionStatus"
              :items="statusOptions"
              orientation="horizontal"
            />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Dono</h2>
          <p class="text-sm text-(--color-text-muted)">
            Recebe um e-mail com o link para definir a senha e entrar no painel.
          </p>
        </template>
        <div class="flex flex-col gap-4">
          <UFormField label="Nome do dono" name="owner.name">
            <UInput v-model="state.ownerName" maxlength="120" autocomplete="off" class="w-full" />
          </UFormField>
          <UFormField label="E-mail do dono" name="owner.email">
            <UInput
              v-model="state.ownerEmail"
              type="email"
              inputmode="email"
              autocomplete="off"
              class="w-full"
            />
          </UFormField>
        </div>
      </UCard>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton to="/organizacoes" color="neutral" variant="ghost" label="Cancelar" />
        <UButton type="submit" label="Criar organização e enviar convite" :loading="submitting" />
      </div>
    </UForm>
  </div>
</template>
