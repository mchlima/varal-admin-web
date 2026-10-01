<script setup lang="ts">
import type { FormFieldProps } from '@nuxt/ui'

/**
 * Campo de formulário validado: `UFormField` com a linha da mensagem de erro sempre reservada.
 *
 * Os formulários validam cada campo ao sair dele (blur). Se a mensagem de erro aparecesse ou
 * sumisse mudando a altura do campo, o botão de enviar mudaria de lugar entre o `mousedown`
 * (que tira o foco do campo e dispara a validação) e o `click`, e o clique cairia fora dele.
 * Aqui a mensagem ocupa sempre a mesma linha, vazia quando não há erro.
 *
 * O texto de ajuda vai em `description`, entre o rótulo e o controle, para não disputar essa
 * linha com o erro. `aria-invalid` e `aria-describedby` continuam vindo do Nuxt UI: o id da
 * mensagem só entra no `aria-describedby` do controle quando há erro.
 */
const props = withDefaults(
  defineProps<Pick<FormFieldProps, 'label' | 'name' | 'description' | 'hint' | 'required'>>(),
  { label: undefined, name: undefined, description: undefined, hint: undefined, required: false },
)
</script>

<template>
  <UFormField v-bind="props">
    <slot />
    <template #error="{ error }">
      <span data-slot="error-line" class="block min-h-lh">{{
        typeof error === 'string' ? error : ''
      }}</span>
    </template>
  </UFormField>
</template>
