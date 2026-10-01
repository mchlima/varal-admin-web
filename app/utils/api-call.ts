import { FORBIDDEN_MESSAGE } from './permissions'
import { toApiError, type ApiErrorInfo } from './api-error'

/** Resultado de uma chamada à API já traduzido para a tela. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorInfo }

/**
 * Espera uma chamada do `openapi-fetch` e devolve o dado ou o erro em
 * português, incluindo falha de rede. O 403 da API (RN-02.01) ganha uma
 * mensagem que explica o que fazer.
 */
export async function apiCall<T>(
  request: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<ApiResult<T>> {
  try {
    const { data, error, response } = await request
    if (error === undefined && response.ok) return { ok: true, data: data as T }
    return { ok: false, error: describeApiError(error) }
  } catch (cause) {
    return { ok: false, error: toApiError(cause) }
  }
}

export function describeApiError(value: unknown): ApiErrorInfo {
  const info = toApiError(value)
  if (info.code === 'FORBIDDEN') return { ...info, message: FORBIDDEN_MESSAGE }
  return info
}

/**
 * Parâmetros de busca de uma listagem. As rotas do admin declaram os filtros
 * como schemas `*QueryInput` no OpenAPI, mas não os ligam à operação: o tipo
 * gerado da rota não aceita `query`. Os filtros continuam tipados pelo schema
 * do componente e passam por aqui, sem chaves vazias.
 */
export function listQuery<Q extends object>(query: Q): { params: { query: never } } {
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') clean[key] = value
  }
  return { params: { query: clean as never } }
}
