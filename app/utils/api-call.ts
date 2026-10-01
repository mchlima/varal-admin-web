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
