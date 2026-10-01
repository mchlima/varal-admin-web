/**
 * Detalhe das alterações de um registro da auditoria (spec 01, seção 8):
 * `changes` traz `before`, `after` e `metadata`. Aqui viram linhas
 * "campo, antes, depois" para a tela.
 */
export interface AuditChangeRow {
  field: string
  before: string
  after: string
  changed: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function formatAuditValue(value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return 'vazio'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

export function auditChangeRows(changes: unknown): AuditChangeRow[] {
  if (!isRecord(changes)) return []
  const before = isRecord(changes.before) ? changes.before : {}
  const after = isRecord(changes.after) ? changes.after : {}
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  return fields.map((field) => {
    const left = formatAuditValue(before[field])
    const right = formatAuditValue(after[field])
    return { field, before: left, after: right, changed: left !== right }
  })
}

export function auditMetadata(changes: unknown): { key: string; value: string }[] {
  if (!isRecord(changes) || !isRecord(changes.metadata)) return []
  return Object.entries(changes.metadata).map(([key, value]) => ({
    key,
    value: formatAuditValue(value),
  }))
}

/** Valores aceitos pela API como ids nos filtros (UUID). */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function shortId(id: string): string {
  return id.slice(-8)
}
