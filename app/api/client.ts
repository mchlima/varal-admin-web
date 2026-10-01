import createClient, { type Client, type Middleware } from 'openapi-fetch'
import type { paths } from './schema'

/**
 * Cliente HTTP do admin, gerado do `openapi.json` (RN-01.11), com a sessão
 * da spec 01, seção 7.2:
 *
 * - cookies do admin (`credentials: 'include'`) e `X-Device-Id` em toda
 *   requisição;
 * - em 401, uma única renovação (`POST /admin/auth/refresh`) compartilhada
 *   entre as requisições simultâneas, feita fora do middleware para não
 *   entrar em loop (plano, seção 2.2); se der certo, a requisição é repetida
 *   uma vez; se falhar, `onSessionExpired` é chamado.
 *
 * Sem dependência do Nuxt, para ser testado isoladamente.
 */
export type ApiClient = Client<paths>

export const REFRESH_PATH = '/api/v1/admin/auth/refresh'

/**
 * Rotas em que um 401 não significa sessão vencida: login com senha errada,
 * a própria renovação, logout e os fluxos de senha sem sessão.
 */
const NO_REFRESH_PATHS = new Set<string>([
  '/api/v1/admin/auth/login',
  REFRESH_PATH,
  '/api/v1/admin/auth/logout',
  '/api/v1/admin/auth/password/forgot',
  '/api/v1/admin/auth/password/reset',
])

export interface ApiClientOptions {
  baseUrl: string
  /** UUID do aparelho (`X-Device-Id`). */
  getDeviceId: () => string
  /** Chamado uma vez por renovação que falhou: a sessão acabou. */
  onSessionExpired?: () => void
  /** `fetch` usado em todas as chamadas (testes trocam por um falso). */
  fetch?: typeof globalThis.fetch
}

/** Garante uma única renovação em andamento, compartilhada por quem pedir. */
export function createSharedRefresh(refresh: () => Promise<boolean>): () => Promise<boolean> {
  let inFlight: Promise<boolean> | null = null
  return () => {
    inFlight ??= refresh()
      .catch(() => false)
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)
  const baseUrl = options.baseUrl.replace(/\/+$/, '')

  // Renovação com fetch direto, fora do middleware (não pode disparar outra).
  const refresh = createSharedRefresh(async () => {
    const response = await fetchImpl(`${baseUrl}${REFRESH_PATH}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Device-Id': options.getDeviceId() },
    })
    if (!response.ok) options.onSessionExpired?.()
    return response.ok
  })

  // Cópia de cada requisição antes do envio, para poder repeti-la (o corpo
  // da original já foi consumido).
  const pending = new Map<string, Request>()

  const session: Middleware = {
    onRequest({ request, schemaPath, id }) {
      request.headers.set('X-Device-Id', options.getDeviceId())
      if (!NO_REFRESH_PATHS.has(schemaPath)) pending.set(id, request.clone())
      return request
    },
    async onResponse({ response, id }) {
      const retry = pending.get(id)
      pending.delete(id)
      if (response.status !== 401 || !retry) return response

      const renewed = await refresh()
      if (!renewed) return response

      // O cookie novo vai sozinho; o X-Device-Id já está na cópia.
      return fetchImpl(retry)
    },
    onError({ id }) {
      pending.delete(id)
    },
  }

  const client = createClient<paths>({
    baseUrl,
    credentials: 'include',
    fetch: fetchImpl,
  })
  client.use(session)
  return client
}
