import type { PermissionRequirement } from '~/utils/permissions'

/**
 * Acesso de cada página (middleware `auth.global.ts`):
 * - sem `access`: exige sessão do admin;
 * - `'guest'`: só sem sessão (quem está logado vai para `/`);
 * - `'public'`: com ou sem sessão.
 *
 * `permission`: permissão exigida pela tela (basta uma, RN-02.01). Sem ela,
 * o layout mostra o aviso de acesso negado no lugar da página.
 */
export type PageAccess = 'guest' | 'public'

declare module '#app' {
  interface PageMeta {
    access?: PageAccess
    permission?: PermissionRequirement
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    access?: PageAccess
    permission?: PermissionRequirement
  }
}
