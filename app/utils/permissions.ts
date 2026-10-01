import type { components } from '../api/schema'

/**
 * Catálogo de permissões do admin (RN-02.03): o tipo vem do enum `Permission`
 * do OpenAPI (`pnpm gen:api`); a lista com as descrições vem de
 * `GET /admin/permissions`. Aqui só ficam regras de exibição.
 */
export type Permission = components['schemas']['Permission']
export type PermissionInfo = components['schemas']['PermissionInfo']

/**
 * Exigência de uma tela ou ação: basta ter uma das permissões listadas,
 * como o `@RequirePermission('x', 'y')` da API.
 */
export type PermissionRequirement = Permission | readonly Permission[]

/** RN-02.02: permissão efetiva = papéis + avulsas, sem negação. */
export function hasPermission(
  effective: readonly Permission[] | ReadonlySet<Permission>,
  required: PermissionRequirement | undefined,
): boolean {
  if (required === undefined) return true
  const list: readonly Permission[] = typeof required === 'string' ? [required] : required
  if (list.length === 0) return true
  const set = effective instanceof Set ? effective : new Set(effective)
  return list.some((permission) => set.has(permission))
}

/** Recurso de uma permissão: `organizations:create` → `organizations`. */
export function permissionResource(permission: string): string {
  const index = permission.indexOf(':')
  return index === -1 ? permission : permission.slice(0, index)
}

/**
 * Nome em português de cada recurso do catálogo. Uma permissão de recurso
 * novo (que chega por deploy da API) aparece com a chave como nome até
 * entrar aqui.
 */
const RESOURCE_LABELS: Record<string, string> = {
  'admin.users': 'Usuários do admin',
  'admin.roles': 'Papéis',
  organizations: 'Organizações',
  subscriptions: 'Assinatura',
  announcements: 'Comunicados',
  metrics: 'Métricas',
  impersonation: 'Entrar como',
  emails: 'E-mails',
  audit: 'Auditoria',
}

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource
}

export interface PermissionGroup {
  resource: string
  label: string
  permissions: PermissionInfo[]
}

/** Agrupa o catálogo por recurso, na ordem em que a API o devolve. */
export function groupPermissions(catalog: readonly PermissionInfo[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>()
  for (const info of catalog) {
    const resource = permissionResource(info.key)
    let group = groups.get(resource)
    if (!group) {
      group = { resource, label: resourceLabel(resource), permissions: [] }
      groups.set(resource, group)
    }
    group.permissions.push(info)
  }
  return [...groups.values()]
}

/** Papel do sistema que sempre tem o catálogo inteiro (RN-02.04). */
export const SUPER_ADMIN_KEY = 'super_admin'

/**
 * Mensagem do 403 da API (RN-02.01): diz o que falta e o que fazer. A
 * interface já esconde a ação, então isso só aparece se a permissão foi
 * retirada depois que a tela abriu (RN-02.08).
 */
export const FORBIDDEN_MESSAGE =
  'Você não tem permissão para fazer isso. As suas permissões podem ter mudado; se precisar deste acesso, peça a um Super admin.'

/** Papéis do sistema primeiro (Super admin no topo), depois os personalizados por nome. */
export function sortRoles<R extends { isSystem: boolean; systemKey: string | null; name: string }>(
  roles: readonly R[],
): R[] {
  const rank = (role: R) => (role.systemKey === SUPER_ADMIN_KEY ? 0 : role.isSystem ? 1 : 2)
  return [...roles].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'))
}
