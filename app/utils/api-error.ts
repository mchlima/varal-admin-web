import type { components } from '../api/schema'

/**
 * Erros da API no formato `ErrorResponse` (spec 01, seção 5): `code` estável
 * em inglês e `message` em português, que pode ser mostrada ao usuário.
 */
type ErrorResponse = components['schemas']['ErrorResponse']
type ValidationIssue = components['schemas']['ValidationIssue']

export const NETWORK_ERROR_MESSAGE =
  'Não foi possível falar com o servidor. Confira a conexão e tente de novo.'
export const UNKNOWN_ERROR_MESSAGE = 'Algo deu errado. Tente de novo em instantes.'

export interface ApiErrorInfo {
  code: string
  message: string
  /** Mensagens por campo em `VALIDATION_FAILED` (`path` → mensagem). */
  fields: Record<string, string>
}

export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false
  const error = (value as { error: unknown }).error
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { message?: unknown }).message === 'string'
  )
}

function isValidationIssue(value: unknown): value is ValidationIssue {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { path?: unknown }).path === 'string' &&
    typeof (value as { message?: unknown }).message === 'string'
  )
}

/**
 * Traduz o que veio de uma chamada (corpo de erro da API ou exceção de rede)
 * numa mensagem em português para a tela.
 */
export function toApiError(value: unknown): ApiErrorInfo {
  if (isErrorResponse(value)) {
    const fields: Record<string, string> = {}
    const issues = (value.error.details as { fields?: unknown } | undefined)?.fields
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        if (isValidationIssue(issue) && !(issue.path in fields)) fields[issue.path] = issue.message
      }
    }
    return { code: value.error.code, message: value.error.message, fields }
  }

  // `fetch` rejeita com TypeError quando não há conexão ou o CORS barra
  if (value instanceof TypeError) {
    return { code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE, fields: {} }
  }

  return { code: 'UNKNOWN_ERROR', message: UNKNOWN_ERROR_MESSAGE, fields: {} }
}
