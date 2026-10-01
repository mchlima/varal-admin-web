import { formatCount } from './email-usage'

/**
 * Formatação para a tela: datas em `America/Sao_Paulo` e valores em reais a
 * partir de centavos inteiros (regras comuns e spec 01, seção 5).
 */
export const TIME_ZONE = 'America/Sao_Paulo'

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
})
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: TIME_ZONE })
const moneyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatDateTime(iso: string | null | undefined, empty = '—'): string {
  if (!iso) return empty
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? empty : dateTimeFormat.format(date)
}

export function formatDate(iso: string | null | undefined, empty = '—'): string {
  if (!iso) return empty
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? empty : dateFormat.format(date)
}

/** `2026-10-01` (dia de Brasília vindo da API) → `01/10/2026`, sem trocar de fuso. */
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-')
  return year && month && date ? `${date}/${month}/${year}` : day
}

export function formatCents(cents: number): string {
  return moneyFormat.format(cents / 100)
}

/** Dia de hoje em Brasília, no formato `AAAA-MM-DD`. */
export function todayInSaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now)
}

/** Soma dias a um `AAAA-MM-DD`. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number)
  const result = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (date ?? 1) + days))
  return result.toISOString().slice(0, 10)
}

/**
 * Início de um dia de Brasília (`AAAA-MM-DD`) como instante ISO. Brasília
 * não tem horário de verão desde 2019: o fuso é sempre -03:00.
 */
export function startOfDayInSaoPaulo(day: string): string {
  return new Date(`${day}T00:00:00-03:00`).toISOString()
}

/** Valor de um `<input type="datetime-local">` lido como horário de Brasília. */
export function saoPauloLocalToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(`${value}:00-03:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Instante ISO → valor para `<input type="datetime-local">` em Brasília. */
export function isoToSaoPauloLocal(iso: string): string {
  const date = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
  return date.toISOString().slice(0, 16)
}

/** Pluralização simples: `plural(1, 'dono', 'donos')`. */
export function plural(count: number, one: string, many: string): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`
}

/**
 * Período de filtro (dias de Brasília, inclusive) como instantes para a API
 * (`from` inclusive, `to` exclusivo: início do dia seguinte).
 */
export function dayRangeToInstants(from: string, to: string): { from?: string; to?: string } {
  return {
    ...(from ? { from: startOfDayInSaoPaulo(from) } : {}),
    ...(to ? { to: startOfDayInSaoPaulo(addDays(to, 1)) } : {}),
  }
}
