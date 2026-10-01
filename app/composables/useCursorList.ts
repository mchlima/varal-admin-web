/**
 * Lista paginada por cursor (spec 01, seção 5): `{ data, nextCursor }`.
 * `reload()` recomeça do início (ao mudar um filtro); `loadMore()` pede a
 * página seguinte e junta ao fim. Uma resposta atrasada de uma busca
 * anterior é descartada.
 */
export interface CursorPage<T> {
  data: T[]
  nextCursor: string | null
}

export function useCursorList<T>(
  fetchPage: (cursor: string | undefined) => Promise<ApiResult<CursorPage<T>>>,
) {
  const items = ref<T[]>([]) as Ref<T[]>
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let generation = 0

  async function reload() {
    const current = ++generation
    loading.value = true
    error.value = null
    const result = await fetchPage(undefined)
    if (current !== generation) return
    loading.value = false
    loaded.value = true
    if (result.ok) {
      items.value = result.data.data
      nextCursor.value = result.data.nextCursor
    } else {
      items.value = []
      nextCursor.value = null
      error.value = result.error.message
    }
  }

  async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return
    const current = generation
    loadingMore.value = true
    error.value = null
    const result = await fetchPage(nextCursor.value)
    if (current !== generation) return
    loadingMore.value = false
    if (result.ok) {
      items.value = [...items.value, ...result.data.data]
      nextCursor.value = result.data.nextCursor
    } else {
      error.value = result.error.message
    }
  }

  /** Troca um item já carregado (depois de uma ação na própria lista). */
  function replace(match: (item: T) => boolean, next: T) {
    items.value = items.value.map((item) => (match(item) ? next : item))
  }

  const hasMore = computed(() => nextCursor.value !== null)
  const empty = computed(
    () => loaded.value && !loading.value && !error.value && items.value.length === 0,
  )

  return {
    items,
    nextCursor,
    hasMore,
    loading,
    loadingMore,
    loaded,
    error,
    empty,
    reload,
    loadMore,
    replace,
  }
}
