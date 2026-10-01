/**
 * Busca de organizações para os seletores (público de comunicado e filtros
 * de e-mails e auditoria): `GET /admin/organizations?search=` com espera
 * curta entre as teclas. Guarda o nome das já vistas para o seletor mostrar
 * o nome das escolhidas mesmo fora do resultado da busca.
 */
export interface OrganizationOption {
  label: string
  value: string
  description?: string
}

export function useOrganizationSearch() {
  const { $api } = useNuxtApp()
  const searchTerm = ref('')
  const results = ref<OrganizationOption[]>([])
  const known = reactive(new Map<string, OrganizationOption>())
  const loading = ref(false)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined
  let generation = 0

  function remember(options: readonly OrganizationOption[]) {
    for (const option of options) known.set(option.value, option)
  }

  async function search(term: string) {
    const current = ++generation
    loading.value = true
    const result = await apiCall(
      $api.GET('/api/v1/admin/organizations', {
        params: { query: { search: term.trim() || undefined, limit: 20 } },
      }),
    )
    if (current !== generation) return
    loading.value = false
    if (result.ok) {
      error.value = null
      results.value = result.data.data.map((organization) => ({
        label: organization.name,
        value: organization.id,
        description: organization.accessCode,
      }))
      remember(results.value)
    } else {
      error.value = result.error.message
    }
  }

  watch(searchTerm, (term) => {
    clearTimeout(timer)
    timer = setTimeout(() => void search(term), 250)
  })

  /** Opções do seletor: resultado da busca + as escolhidas (pelo nome guardado). */
  function itemsWith(selected: readonly string[]): OrganizationOption[] {
    const ids = new Set(results.value.map((option) => option.value))
    const extra = selected
      .filter((id) => !ids.has(id))
      .map((id) => known.get(id) ?? { label: 'Organização', value: id })
    return [...extra, ...results.value]
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return { searchTerm, results, loading, error, search, remember, itemsWith, known }
}
