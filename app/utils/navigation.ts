import type { PermissionRequirement } from './permissions'

/**
 * Itens da navegação do admin, na ordem das rotas da spec 01, seção 14.1.
 * `primary` marca os três que ficam no menu inferior do celular (com espaço
 * para o rótulo inteiro em 360 px); os outros vão para "Mais" (spec 08,
 * seção 7). `permission` é a mesma exigida pela tela (`definePageMeta`):
 * sem ela, o item não aparece (RN-02.01).
 */
export interface NavigationItem {
  label: string
  to: string
  icon: string
  primary: boolean
  permission?: PermissionRequirement
}

export const NAVIGATION: readonly NavigationItem[] = [
  { label: 'Início', to: '/', icon: 'i-lucide-house', primary: true },
  {
    label: 'Organizações',
    to: '/organizacoes',
    icon: 'i-lucide-store',
    primary: true,
    permission: 'organizations:read',
  },
  {
    label: 'Comunicados',
    to: '/comunicados',
    icon: 'i-lucide-megaphone',
    primary: true,
    permission: 'announcements:read',
  },
  {
    label: 'Métricas',
    to: '/metricas',
    icon: 'i-lucide-chart-column',
    primary: false,
    permission: 'metrics:read',
  },
  {
    label: 'E-mails',
    to: '/emails',
    icon: 'i-lucide-mail',
    primary: false,
    permission: 'emails:read',
  },
  {
    label: 'Auditoria',
    to: '/auditoria',
    icon: 'i-lucide-scroll-text',
    primary: false,
    permission: 'audit:read',
  },
  {
    label: 'Usuários',
    to: '/usuarios',
    icon: 'i-lucide-users',
    primary: false,
    permission: 'admin.users:manage',
  },
  {
    label: 'Papéis',
    to: '/papeis',
    icon: 'i-lucide-shield-check',
    primary: false,
    // A lista de papéis também serve a quem atribui papéis (GET /roles)
    permission: ['admin.roles:manage', 'admin.users:manage'],
  },
  {
    label: 'Acessos de suporte',
    to: '/acessos-de-suporte',
    icon: 'i-lucide-log-in',
    primary: false,
    permission: 'impersonation:use',
  },
]

/** O item está ativo na rota atual (também nas sub-rotas, como `/organizacoes/nova`). */
export function isNavigationActive(item: Pick<NavigationItem, 'to'>, path: string): boolean {
  if (item.to === '/') return path === '/'
  return path === item.to || path.startsWith(`${item.to}/`)
}

/** Itens que o usuário pode ver (RN-02.01). */
export function visibleNavigation(
  can: (required: PermissionRequirement | undefined) => boolean,
): NavigationItem[] {
  return NAVIGATION.filter((item) => can(item.permission))
}
