/**
 * Catálogo de permissões com as descrições da API (`GET /admin/permissions`,
 * RN-02.03), carregado uma vez por sessão do app.
 */
let cached: Promise<ApiResult<PermissionInfo[]>> | null = null

export function usePermissionCatalog() {
  const { $api } = useNuxtApp()
  const catalog = ref<PermissionInfo[]>([])
  const error = ref<string | null>(null)
  const loading = ref(true)

  async function load() {
    loading.value = true
    error.value = null
    cached ??= apiCall($api.GET('/api/v1/admin/permissions')).then((result) =>
      result.ok ? { ok: true as const, data: result.data.data } : result,
    )
    const result = await cached
    loading.value = false
    if (result.ok) catalog.value = result.data
    else {
      cached = null
      error.value = result.error.message
    }
  }

  const groups = computed(() => groupPermissions(catalog.value))
  const descriptions = computed(
    () => new Map(catalog.value.map((info) => [info.key, info.description] as const)),
  )

  void load()

  return { catalog, groups, descriptions, error, loading, load }
}
