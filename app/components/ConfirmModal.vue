<script setup lang="ts">
/**
 * Confirmação na própria tela, sem diálogo do navegador (spec 08, seção 6),
 * para ações sem motivo (arquivar, excluir, desativar).
 */
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    confirmLabel: string
    destructive?: boolean
    action: () => Promise<ApiResult<unknown>>
  }>(),
  { description: undefined, destructive: false },
)
const emit = defineEmits<{ done: [] }>()
const open = defineModel<boolean>('open', { required: true })

const error = ref<string | null>(null)
const submitting = ref(false)

watch(open, (isOpen) => {
  if (isOpen) error.value = null
})

async function confirm() {
  submitting.value = true
  error.value = null
  const result = await props.action()
  submitting.value = false
  if (result.ok) {
    open.value = false
    emit('done')
  } else {
    error.value = result.error.message
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template v-if="error || $slots.default" #body>
      <div class="flex flex-col gap-4">
        <FormErrorAlert v-if="error" :message="error" />
        <slot />
      </div>
    </template>
    <template #footer>
      <div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <UButton color="neutral" variant="ghost" label="Cancelar" @click="open = false" />
        <UButton
          :color="destructive ? 'error' : 'primary'"
          :label="confirmLabel"
          :loading="submitting"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
