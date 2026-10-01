/**
 * Acesso de cada página (middleware `auth.global.ts`):
 * - sem `access`: exige sessão do admin;
 * - `'guest'`: só sem sessão (quem está logado vai para `/`);
 * - `'public'`: com ou sem sessão.
 */
export type PageAccess = 'guest' | 'public'

declare module '#app' {
  interface PageMeta {
    access?: PageAccess
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    access?: PageAccess
  }
}
