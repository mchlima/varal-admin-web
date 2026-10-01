/**
 * Itens da navegação do admin, na ordem das rotas da spec 01, seção 14.1.
 * `primary` marca os três que ficam no menu inferior do celular (com espaço
 * para o rótulo inteiro em 360 px); os outros vão para "Mais" (spec 08,
 * seção 7).
 */
export interface NavigationItem {
  label: string
  to: string
  icon: string
  primary: boolean
}

export const NAVIGATION: readonly NavigationItem[] = [
  { label: 'Início', to: '/', icon: 'i-lucide-house', primary: true },
  { label: 'Organizações', to: '/organizacoes', icon: 'i-lucide-store', primary: true },
  { label: 'Comunicados', to: '/comunicados', icon: 'i-lucide-megaphone', primary: true },
  { label: 'Métricas', to: '/metricas', icon: 'i-lucide-chart-column', primary: false },
  { label: 'E-mails', to: '/emails', icon: 'i-lucide-mail', primary: false },
  { label: 'Auditoria', to: '/auditoria', icon: 'i-lucide-scroll-text', primary: false },
  { label: 'Usuários', to: '/usuarios', icon: 'i-lucide-users', primary: false },
  { label: 'Papéis', to: '/papeis', icon: 'i-lucide-shield-check', primary: false },
]

/** O item está ativo na rota atual (também nas sub-rotas, como `/organizacoes/nova`). */
export function isNavigationActive(item: Pick<NavigationItem, 'to'>, path: string): boolean {
  if (item.to === '/') return path === '/'
  return path === item.to || path.startsWith(`${item.to}/`)
}
