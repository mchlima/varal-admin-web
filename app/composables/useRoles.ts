/** Papéis do admin (`GET /admin/roles`), para listas e atribuição. */
export function useRoles() {
  const { $api } = useNuxtApp()
  const roles = ref<Role[]>([])
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function load() {
    loading.value = true
    error.value = null
    const result = await apiCall($api.GET('/api/v1/admin/roles'))
    loading.value = false
    if (result.ok) roles.value = sortRoles(result.data.data)
    else error.value = result.error.message
  }

  return { roles, error, loading, load }
}
