<script setup lang="ts" generic="S extends string">
import type { FormError } from '@nuxt/ui'

/**
 * Confirmação na própria tela de uma ação que exige motivo (spec 08, seção 6;
 * RN-02.11 e RN-02.17). Opcionalmente pede também uma situação. O motivo é
 * validado aqui e de novo pela API.
 */
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    confirmLabel: string
    /** Botão de confirmação em vermelho escuro (ação destrutiva). */
    destructive?: boolean
    reasonLabel?: string
    reasonHelp?: string
    minLength?: number
    maxLength?: number
    statusLabel?: string
    statusOptions?: { label: string; value: S }[]
    initialStatus?: S
    action: (input: { reason: string; status: S | undefined }) => Promise<ApiResult<unknown>>
  }>(),
  {
    description: undefined,
    destructive: false,
    reasonLabel: 'Motivo',
    reasonHelp: undefined,
    minLength: 3,
    maxLength: 500,
    statusLabel: 'Nova situação',
    statusOptions: undefined,
    initialStatus: undefined,
  },
)

const emit = defineEmits<{ done: [] }>()
const open = defineModel<boolean>('open', { required: true })

const formId = useId()
const state = reactive({ reason: '' })
// Guardado como texto: o URadioGroup não resolve o tipo genérico `S`
const status = ref<string | undefined>()
const radioItems = computed(() => (props.statusOptions ?? []) as { label: string; value: string }[])
const formError = ref<string | null>(null)
const submitting = ref(false)
const form = useTemplateRef('form')

watch(open, (isOpen) => {
  if (!isOpen) return
  state.reason = ''
  status.value = props.initialStatus ?? props.statusOptions?.[0]?.value
  formError.value = null
})

function validate(): FormError[] {
  const errors: FormError[] = []
  const reason = state.reason.trim()
  if (reason.length < props.minLength) {
    errors.push({
      name: 'reason',
      message: `Escreva o motivo com pelo menos ${props.minLength} caracteres.`,
    })
  } else if (reason.length > props.maxLength) {
    errors.push({ name: 'reason', message: `O motivo pode ter até ${props.maxLength} caracteres.` })
  }
  if (props.statusOptions && !status.value) {
    errors.push({ name: 'status', message: 'Escolha a situação.' })
  }
  return errors
}

async function submit() {
  submitting.value = true
  formError.value = null
  const result = await props.action({
    reason: state.reason.trim(),
    status: status.value as S | undefined,
  })
  submitting.value = false
  if (result.ok) {
    open.value = false
    emit('done')
    return
  }
  const { fields, message } = result.error
  if (Object.keys(fields).length > 0) {
    form.value?.setErrors(Object.entries(fields).map(([name, text]) => ({ name, message: text })))
  } else {
    formError.value = message
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template #body>
      <UForm
        :id="formId"
        ref="form"
        :state="state"
        :validate="validate"
        :validate-on="['blur']"
        class="flex flex-col gap-4"
        @submit="submit"
      >
        <FormErrorAlert v-if="formError" :message="formError" />
        <slot />
        <UFormField v-if="statusOptions" :label="statusLabel" name="status">
          <URadioGroup v-model="status" :items="radioItems" />
        </UFormField>
        <UFormField :label="reasonLabel" name="reason" :help="reasonHelp">
          <UTextarea
            v-model="state.reason"
            :rows="3"
            :maxlength="maxLength"
            autoresize
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="neutral" variant="ghost" label="Cancelar" @click="open = false" />
        <UButton
          type="submit"
          :form="formId"
          :color="destructive ? 'error' : 'primary'"
          :label="confirmLabel"
          :loading="submitting"
        />
      </div>
    </template>
  </UModal>
</template>
