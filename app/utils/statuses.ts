import { formatCount } from './email-usage'
import type { components } from '../api/schema'

/**
 * Como cada situação aparece na tela: sempre texto e ícone junto com a cor
 * (spec 08, princípio 3). As cores são as variantes do chip de status já
 * tematizadas em `app.config.ts`.
 */
export type SubscriptionStatus = components['schemas']['SubscriptionStatus']
export type AnnouncementStatus = components['schemas']['AnnouncementStatus']
export type AnnouncementAudienceType = components['schemas']['AnnouncementAudienceType']
export type OwnerInviteStatus = components['schemas']['OwnerInviteStatus']
export type EmailStatus = components['schemas']['EmailStatus']
export type EmailType = components['schemas']['EmailType']
export type ActorType = components['schemas']['ActorType']

export type BadgeColor = 'primary' | 'success' | 'warning' | 'error' | 'neutral'

export interface StatusDisplay {
  label: string
  icon: string
  color: BadgeColor
}

/** Ordem de exibição (RN-02.11). */
export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'pilot',
  'active',
  'suspended',
  'canceled',
]

export const SUBSCRIPTION_STATUS: Record<SubscriptionStatus, StatusDisplay & { plural: string }> = {
  pilot: { label: 'Piloto', plural: 'Em piloto', icon: 'i-lucide-flask-conical', color: 'warning' },
  active: { label: 'Ativa', plural: 'Ativas', icon: 'i-lucide-circle-check', color: 'success' },
  suspended: {
    label: 'Suspensa',
    plural: 'Suspensas',
    icon: 'i-lucide-circle-pause',
    color: 'error',
  },
  canceled: { label: 'Cancelada', plural: 'Canceladas', icon: 'i-lucide-ban', color: 'neutral' },
}

/**
 * Transições da situação (RN-02.11): suspender só de `pilot`/`active`;
 * reativar só de `suspended`/`canceled`; "Mudar situação" leva a qualquer
 * outra situação.
 */
export function canSuspend(status: SubscriptionStatus): boolean {
  return status === 'pilot' || status === 'active'
}

export function canReactivate(status: SubscriptionStatus): boolean {
  return status === 'suspended' || status === 'canceled'
}

export const ANNOUNCEMENT_STATUSES: readonly AnnouncementStatus[] = [
  'draft',
  'scheduled',
  'published',
  'archived',
]

export const ANNOUNCEMENT_STATUS: Record<AnnouncementStatus, StatusDisplay & { plural: string }> = {
  draft: { label: 'Rascunho', plural: 'Rascunhos', icon: 'i-lucide-pencil-line', color: 'neutral' },
  scheduled: { label: 'Agendado', plural: 'Agendados', icon: 'i-lucide-clock', color: 'warning' },
  published: {
    label: 'Publicado',
    plural: 'Publicados',
    icon: 'i-lucide-circle-check',
    color: 'success',
  },
  archived: {
    label: 'Arquivado',
    plural: 'Arquivados',
    icon: 'i-lucide-archive',
    color: 'neutral',
  },
}

/** RN-02.15: só rascunho e agendado ainda podem mudar de texto e público. */
export function isAnnouncementEditable(status: AnnouncementStatus): boolean {
  return status === 'draft' || status === 'scheduled'
}

export const AUDIENCE_TYPE: Record<AnnouncementAudienceType, string> = {
  all: 'Todas as organizações',
  by_status: 'Por situação da assinatura',
  selected: 'Organizações escolhidas',
}

export const OWNER_INVITE_STATUS: Record<OwnerInviteStatus, StatusDisplay> = {
  pending: { label: 'Convite pendente', icon: 'i-lucide-mail', color: 'warning' },
  expired: { label: 'Convite vencido', icon: 'i-lucide-mail-x', color: 'error' },
  accepted: { label: 'Senha definida', icon: 'i-lucide-circle-check', color: 'success' },
}

export const EMAIL_STATUS: Record<EmailStatus, StatusDisplay> = {
  queued: { label: 'Na fila', icon: 'i-lucide-clock', color: 'warning' },
  sent: { label: 'Enviado', icon: 'i-lucide-circle-check', color: 'success' },
  failed: { label: 'Falhou', icon: 'i-lucide-circle-x', color: 'error' },
}

export const EMAIL_TYPE: Record<EmailType, string> = {
  owner_invite: 'Convite do dono',
  owner_password_reset: 'Redefinição de senha do dono',
  staff_password_reset: 'Redefinição de senha do colaborador',
  admin_invite: 'Convite do admin',
  admin_password_reset: 'Redefinição de senha do admin',
}

export const ACTOR_TYPE: Record<ActorType, string> = {
  owner: 'Dono',
  staff: 'Colaborador',
  platform_admin: 'Admin da plataforma',
  system: 'Sistema',
}

/** Opções de um `USelect` a partir de um mapa de rótulos. */
export function selectOptions<K extends string>(
  keys: readonly K[],
  label: (key: K) => string,
): { label: string; value: K }[] {
  return keys.map((value) => ({ label: label(value), value }))
}

/** Contagem de leitura do comunicado: "Lido por 3 de 10 donos". */
export function readSummary(item: { readCount: number; audienceOwnerCount: number }): string {
  const owners = item.audienceOwnerCount === 1 ? 'dono' : 'donos'
  return `Lido por ${formatCount(item.readCount)} de ${formatCount(item.audienceOwnerCount)} ${owners}`
}

export const SAVED_MESSAGE: Record<'draft' | 'published' | 'scheduled', string> = {
  draft: 'Rascunho salvo.',
  published: 'Comunicado publicado.',
  scheduled: 'Comunicado agendado.',
}
