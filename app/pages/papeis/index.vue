<script setup lang="ts">
/**
 * Papéis (spec 02, seções 3 e 11): lista, matriz de permissões por papel e
 * criação de papel personalizado (`admin.roles:manage`). Quem só gerencia
 * usuários vê a lista para saber o que cada papel dá.
 */
definePageMeta({ permission: ['admin.roles:manage', 'admin.users:manage'] })
useHead({ title: 'Papéis' })

const toast = useToast()
const { can } = usePermissions()
const { roles, error, loading, load } = useRoles()
const { groups } = usePermissionCatalog()

onMounted(load)

const createOpen = ref(false)
async function created(role: Role) {
  toast.add({ title: 'Papel criado.', icon: 'i-lucide-circle-check', color: 'success' })
  await navigateTo(`/papeis/${role.id}`)
}

function has(role: Role, permission: Permission) {
  return role.permissions.includes(permission)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <PageHeader title="Papéis" description="Grupos de permissões dados aos usuários do admin." />
      <UButton
        v-if="can('admin.roles:manage')"
        icon="i-lucide-plus"
        label="Novo papel"
        class="w-full sm:w-auto"
        @click="createOpen = true"
      />
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <LoadingCard v-else-if="loading && roles.length === 0" label="Carregando os papéis…" />

    <template v-else>
      <ul class="grid gap-2 lg:grid-cols-2" aria-label="Papéis">
        <li v-for="role in roles" :key="role.id">
          <NuxtLink
            :to="`/papeis/${role.id}`"
            class="flex h-full flex-col gap-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-border-strong)"
            data-testid="role-row"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-bold">{{ role.name }}</span>
              <StatusBadge
                :status="
                  role.isSystem
                    ? { label: 'Do sistema', icon: 'i-lucide-lock', color: 'neutral' }
                    : { label: 'Personalizado', icon: 'i-lucide-pencil', color: 'primary' }
                "
                size="sm"
              />
            </div>
            <p v-if="role.description" class="text-sm text-(--color-text-muted)">
              {{ role.description }}
            </p>
            <p class="text-sm tabular-nums">
              {{
                role.systemKey === SUPER_ADMIN_KEY
                  ? 'Todas as permissões'
                  : plural(role.permissions.length, 'permissão', 'permissões')
              }}
              · {{ plural(role.userCount, 'usuário', 'usuários') }}
            </p>
          </NuxtLink>
        </li>
      </ul>

      <section
        v-if="roles.length > 0 && groups.length > 0"
        aria-labelledby="matriz"
        class="flex flex-col gap-3"
      >
        <h2 id="matriz" class="text-lg font-semibold">Matriz de permissões</h2>
        <div
          class="relative overflow-x-auto rounded-(--radius-card) border border-(--color-border) bg-(--color-surface)"
        >
          <table class="w-full min-w-[40rem] text-left text-sm" data-testid="role-matrix">
            <thead class="bg-(--color-surface-muted)">
              <tr>
                <th scope="col" class="px-3 py-2">Permissão</th>
                <th v-for="role in roles" :key="role.id" scope="col" class="px-3 py-2 text-center">
                  {{ role.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in groups" :key="group.resource">
                <tr class="border-t border-(--color-border) bg-(--color-surface-muted)">
                  <th
                    scope="rowgroup"
                    :colspan="roles.length + 1"
                    class="px-3 py-1 text-xs font-bold tracking-wide text-(--color-text-muted) uppercase"
                  >
                    {{ group.label }}
                  </th>
                </tr>
                <tr
                  v-for="info in group.permissions"
                  :key="info.key"
                  class="border-t border-(--color-border)"
                >
                  <th scope="row" class="px-3 py-2 font-normal">
                    {{ info.description }}
                    <span class="block font-mono text-xs text-(--color-text-muted)">{{
                      info.key
                    }}</span>
                  </th>
                  <td v-for="role in roles" :key="role.id" class="px-3 py-2 text-center">
                    <span
                      v-if="has(role, info.key)"
                      class="inline-flex items-center gap-1 font-bold text-(--color-status-ready-text)"
                    >
                      <UIcon name="i-lucide-check" class="size-5" aria-hidden="true" /><span
                        class="sr-only"
                        >Sim</span
                      >
                    </span>
                    <span v-else class="text-(--color-text-muted)" aria-label="Não">—</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <RoleFormModal v-model:open="createOpen" :groups="groups" @created="created" />
  </div>
</template>
