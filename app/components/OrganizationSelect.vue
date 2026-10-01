<script setup lang="ts">
/** Escolhe uma organização pelo nome, e-mail do dono ou código (filtros). */
const props = defineProps<{ placeholder?: string; initial?: OrganizationOption | null }>()
const model = defineModel<string | undefined>({ required: true })

const { searchTerm, loading, search, remember, itemsWith } = useOrganizationSearch()
if (props.initial) remember([props.initial])
const items = computed(() => itemsWith(model.value ? [model.value] : []))

function onOpen(open: boolean) {
  if (open && searchTerm.value === '') void search('')
}
</script>

<template>
  <USelectMenu
    v-model="model"
    v-model:search-term="searchTerm"
    :items="items"
    value-key="value"
    ignore-filter
    :loading="loading"
    :placeholder="placeholder ?? 'Todas as organizações'"
    :search-input="{ placeholder: 'Buscar por nome, e-mail do dono ou código' }"
    clear
    class="w-full"
    @update:open="onOpen"
  >
    <template #empty>Nenhuma organização encontrada.</template>
  </USelectMenu>
</template>
