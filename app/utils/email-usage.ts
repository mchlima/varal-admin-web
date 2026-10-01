import type { components } from '../api/schema'

export type EmailUsage = components['schemas']['EmailUsage']
export type EmailUsageLevel = components['schemas']['EmailUsageLevel']

/**
 * Como cada nível do consumo de e-mail aparece (RN-01.04): texto e ícone
 * sempre juntos com a cor (spec 08, princípio 3).
 */
export const EMAIL_USAGE_LEVELS: Record<
  EmailUsageLevel,
  { label: string; icon: string; badgeColor: 'success' | 'warning' | 'error'; barClass: string }
> = {
  ok: {
    label: 'Normal',
    icon: 'i-lucide-circle-check',
    badgeColor: 'success',
    barClass: 'bg-(--color-status-ready-text)',
  },
  warning: {
    label: 'Alerta',
    icon: 'i-lucide-triangle-alert',
    badgeColor: 'warning',
    barClass: 'bg-(--color-status-preparing-text)',
  },
  critical: {
    label: 'Crítico',
    icon: 'i-lucide-octagon-alert',
    badgeColor: 'error',
    barClass: 'bg-(--color-status-late-text)',
  },
}

const numberFormat = new Intl.NumberFormat('pt-BR')

export function formatCount(value: number): string {
  return numberFormat.format(value)
}

/** `2026-10` → `outubro de 2026` (mês no fuso de São Paulo, como na API). */
export function formatMonth(month: string): string {
  const [year, monthIndex] = month.split('-').map(Number)
  if (!year || !monthIndex) return month
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(Date.UTC(year, monthIndex - 1, 15, 12)))
}

/** Percentual usado do limite, de 0 a 100. */
export function usagePercent(usage: Pick<EmailUsage, 'count' | 'limit'>): number {
  if (usage.limit <= 0) return 100
  return Math.min(100, Math.floor((usage.count / usage.limit) * 100))
}

/** Explicação do nível em texto (RN-01.04, CA-01.09). */
export function usageMessage(usage: EmailUsage): string {
  switch (usage.level) {
    case 'critical':
      return `Limite de ${formatCount(usage.limit)} envios do mês atingido. Só convites e redefinições de senha continuam sendo enviados até o mês virar.`
    case 'warning':
      return `Passou de ${formatCount(usage.warningThreshold)} envios no mês. Ao chegar em ${formatCount(usage.limit)}, só convites e redefinições de senha continuam sendo enviados.`
    default:
      return `Dentro do limite do plano. O alerta aparece a partir de ${formatCount(usage.warningThreshold)} envios.`
  }
}
