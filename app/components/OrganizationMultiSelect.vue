<script setup lang="ts">
/** Escolhe várias organizações (público "escolhidas" do comunicado, RN-02.14). */
const props = defineProps<{ initial?: OrganizationOption[] }>()
const model = defineModel<string[]>({ required: true })

const { searchTerm, loading, search, remember, itemsWith, known } = useOrganizationSearch()
watch(
  () => props.initial,
  (initial) => {
    if (initial) remember(initial)
  },
  { immediate: true },
)
const items = computed(() => itemsWith(model.value))
const selected = computed(() =>
  model.value.map((id) => known.get(id) ?? { label: 'Organização', value: id }),
)

function onOpen(open: boolean) {
  if (open && searchTerm.value === '') void search('')
}

function remove(id: string) {
  model.value = model.value.filter((value) => value !== id)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <USelectMenu
      v-model="model"
      v-model:search-term="searchTerm"
      :items="items"
      value-key="value"
      multiple
      ignore-filter
      :loading="loading"
      placeholder="Buscar e adicionar organizações"
      :search-input="{ placeholder: 'Nome, e-mail do dono ou código' }"
      class="w-full"
      data-testid="organization-multi-select"
      @update:open="onOpen"
    >
      <template #default>
        <span class="text-(--color-text-muted)">
          {{
            model.length === 0
              ? 'Buscar e adicionar organizações'
              : `${plural(model.length, 'organização escolhida', 'organizações escolhidas')}`
          }}
        </span>
      </template>
      <template #empty>Nenhuma organização encontrada.</template>
    </USelectMenu>
    <ul
      v-if="selected.length > 0"
      class="flex flex-wrap gap-2"
      aria-label="Organizações escolhidas"
    >
      <li
        v-for="option in selected"
        :key="option.value"
        class="flex items-center gap-1 rounded-(--radius-chip) bg-(--color-surface-muted) py-1 ps-3 pe-1 text-sm font-bold"
      >
        {{ option.label }}
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-x"
          :aria-label="`Tirar ${option.label}`"
          @click="remove(option.value)"
        />
      </li>
    </ul>
  </div>
</template>
