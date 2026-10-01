import type { RouteLocationNormalizedLoaded } from 'vue-router'

/** Página que não exige sessão (`definePageMeta({ access })`). */
export function isPublicRoute(route: Pick<RouteLocationNormalizedLoaded, 'meta'>): boolean {
  return route.meta.access === 'guest' || route.meta.access === 'public'
}

/**
 * Destino depois do login (`?voltar=`): só caminhos internos, para não virar
 * um redirecionamento aberto para outro site.
 */
export function safeRedirect(value: unknown): string {
  if (typeof value !== 'string' || !/^\/(?![/\\])/.test(value)) return '/'
  if (value.startsWith('/entrar')) return '/'
  return value
}
