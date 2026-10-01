import type { FormError } from '@nuxt/ui'
import type { SubscriptionStatus } from './statuses'

/**
 * Validações dos formulários, com mensagens em português. Os limites são os
 * dos schemas do OpenAPI; a API valida de novo e devolve os campos em
 * `VALIDATION_FAILED`.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim())
}

export function requireLength(
  errors: FormError[],
  name: string,
  value: string,
  label: string,
  min: number,
  max: number,
) {
  const length = value.trim().length
  if (length === 0) errors.push({ name, message: `Informe ${label}.` })
  else if (length < min) errors.push({ name, message: `Use pelo menos ${min} caracteres.` })
  else if (length > max) errors.push({ name, message: `Use no máximo ${max} caracteres.` })
}

export function requireEmail(errors: FormError[], name: string, value: string) {
  if (!value.trim()) errors.push({ name, message: 'Informe o e-mail.' })
  else if (!isEmail(value))
    errors.push({ name, message: 'Confira o e-mail: ele parece incompleto.' })
}

/** Campos de `VALIDATION_FAILED` como erros do `UForm` (o `path` vira o `name`). */
export function fieldErrors(fields: Record<string, string>): FormError[] {
  return Object.entries(fields).map(([name, message]) => ({ name, message }))
}

export interface CreateOrganizationForm {
  name: string
  unitName: string
  ownerName: string
  ownerEmail: string
  subscriptionStatus: 'active' | 'pilot'
}

/** RN-02.09: nome da organização, da primeira unidade e nome e e-mail do dono. */
export function validateCreateOrganization(state: CreateOrganizationForm): FormError[] {
  const errors: FormError[] = []
  requireLength(errors, 'name', state.name, 'o nome da organização', 2, 120)
  requireLength(errors, 'unitName', state.unitName, 'o nome da primeira unidade', 2, 80)
  requireLength(errors, 'owner.name', state.ownerName, 'o nome do dono', 2, 120)
  requireEmail(errors, 'owner.email', state.ownerEmail)
  return errors
}

export interface AnnouncementForm {
  title: string
  body: string
  audienceType: 'all' | 'by_status' | 'selected'
  audienceStatuses: SubscriptionStatus[]
  organizationIds: string[]
}

export const ANNOUNCEMENT_TITLE_MAX = 80
export const ANNOUNCEMENT_BODY_MAX = 2000

/** RN-02.13 e RN-02.14: título, texto e um público com pelo menos uma escolha. */
export function validateAnnouncement(state: AnnouncementForm): FormError[] {
  const errors: FormError[] = []
  requireLength(errors, 'title', state.title, 'o título', 1, ANNOUNCEMENT_TITLE_MAX)
  requireLength(errors, 'body', state.body, 'o texto', 1, ANNOUNCEMENT_BODY_MAX)
  if (state.audienceType === 'by_status' && state.audienceStatuses.length === 0) {
    errors.push({ name: 'audienceStatuses', message: 'Escolha pelo menos uma situação.' })
  }
  if (state.audienceType === 'selected' && state.organizationIds.length === 0) {
    errors.push({ name: 'organizationIds', message: 'Escolha pelo menos uma organização.' })
  }
  return errors
}

export interface RoleForm {
  name: string
  description: string
}

export function validateRole(state: RoleForm): FormError[] {
  const errors: FormError[] = []
  requireLength(errors, 'name', state.name, 'o nome do papel', 2, 60)
  if (state.description.trim().length > 300) {
    errors.push({ name: 'description', message: 'Use no máximo 300 caracteres.' })
  }
  return errors
}

export interface InviteAdminForm {
  name: string
  email: string
}

export function validateInviteAdmin(state: InviteAdminForm): FormError[] {
  const errors: FormError[] = []
  requireLength(errors, 'name', state.name, 'o nome', 2, 120)
  requireEmail(errors, 'email', state.email)
  return errors
}
