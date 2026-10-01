<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/** Menu do usuário logado: nome, trocar senha e sair. */
const props = defineProps<{ compact?: boolean }>()

const session = useSessionStore()
const changePasswordOpen = ref(false)
const loggingOut = ref(false)

const initials = computed(() => {
  const name = session.admin?.name ?? ''
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '')
  return letters.toUpperCase() || '?'
})

async function logout() {
  loggingOut.value = true
  await session.logout()
  loggingOut.value = false
  await navigateTo('/entrar')
}

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: session.admin?.name ?? '',
      description: session.admin?.email ?? '',
    },
  ],
  [
    {
      label: 'Trocar senha',
      icon: 'i-lucide-key-round',
      onSelect: () => {
        changePasswordOpen.value = true
      },
    },
    {
      label: 'Sair',
      icon: 'i-lucide-log-out',
      onSelect: () => {
        void logout()
      },
    },
  ],
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: props.compact ? 'end' : 'start', side: props.compact ? 'bottom' : 'top' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      :block="!props.compact"
      :loading="loggingOut"
      :aria-label="`Menu de ${session.admin?.name ?? 'usuário'}`"
      class="justify-start gap-3 text-left"
      data-testid="user-menu"
    >
      <span
        class="grid size-9 shrink-0 place-items-center rounded-full bg-(--color-primary-soft) text-sm font-bold text-(--color-primary-deep)"
        aria-hidden="true"
        >{{ initials }}</span
      >
      <span v-if="!props.compact" class="flex min-w-0 flex-col">
        <span class="truncate text-sm font-bold">{{ session.admin?.name }}</span>
        <span class="truncate text-xs font-normal text-(--color-text-muted)">{{
          session.admin?.email
        }}</span>
      </span>
      <UIcon
        v-if="!props.compact"
        name="i-lucide-chevrons-up-down"
        class="ms-auto size-4"
        aria-hidden="true"
      />
    </UButton>
  </UDropdownMenu>
  <ChangePasswordModal v-model:open="changePasswordOpen" />
</template>
