/** Senhas: mínimo de 8 caracteres, sem outras regras (spec 01, seção 7.3). */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export const PASSWORD_HELP = `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
export const PASSWORD_TOO_SHORT_MESSAGE = `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`
export const PASSWORD_TOO_LONG_MESSAGE = `A senha pode ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`

export type PasswordLinkKind = 'convite' | 'redefinicao'

/**
 * Lê o fragmento do link de convite ou redefinição
 * (`#token=...&tipo=convite|redefinicao`, spec 01, seção 7.4).
 */
export function parsePasswordLink(hash: string): { token: string; kind: PasswordLinkKind } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const token = params.get('token')?.trim()
  if (!token) return null
  const kind: PasswordLinkKind = params.get('tipo') === 'convite' ? 'convite' : 'redefinicao'
  return { token, kind }
}
