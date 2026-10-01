<script setup lang="ts">
/**
 * Permissões agrupadas por recurso, com a descrição do catálogo (RN-02.03).
 * `locked` marca as que já vêm de outro lugar (ex.: dos papéis, nas
 * permissões avulsas) e aparecem marcadas sem poder desmarcar.
 */
const props = defineProps<{
  groups: PermissionGroup[]
  disabled?: boolean
  locked?: ReadonlySet<Permission>
  lockedHint?: string
}>()
const model = defineModel<Permission[]>({ required: true })

function isChecked(key: Permission) {
  return model.value.includes(key) || (props.locked?.has(key) ?? false)
}

function toggle(key: Permission, checked: boolean | 'indeterminate') {
  const set = new Set(model.value)
  if (checked === true) set.add(key)
  else set.delete(key)
  model.value = [...set]
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <fieldset
      v-for="group in groups"
      :key="group.resource"
      class="flex flex-col gap-2 rounded-(--radius-control) border border-(--color-border) p-3"
    >
      <legend class="px-1 text-sm font-bold tracking-wide text-(--color-text-muted) uppercase">
        {{ group.label }}
      </legend>
      <UCheckbox
        v-for="info in group.permissions"
        :key="info.key"
        :model-value="isChecked(info.key)"
        :disabled="disabled || locked?.has(info.key)"
        :label="info.description"
        :description="
          locked?.has(info.key) ? `${info.key} · ${lockedHint ?? 'já incluída'}` : info.key
        "
        :data-permission="info.key"
        :ui="{
          root: 'min-h-(--size-touch-min) items-start py-1',
          description: 'font-mono text-xs',
        }"
        @update:model-value="toggle(info.key, $event)"
      />
    </fieldset>
  </div>
</template>
