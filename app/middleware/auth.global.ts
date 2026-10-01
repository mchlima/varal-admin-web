/**
 * Acesso às páginas (spec 01, seção 14.1): sem sessão, as protegidas mandam
 * para `/entrar` (guardando o destino em `?voltar=`); com sessão, `/entrar`
 * manda para o início. `/definir-senha` e `/esqueci-a-senha` abrem nos dois
 * casos.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.access === 'public') return

  const session = useSessionStore()
  await session.ensureLoaded()

  if (to.meta.access === 'guest') {
    if (session.isAuthenticated) return navigateTo(safeRedirect(to.query.voltar))
    return
  }

  if (!session.isAuthenticated) {
    return navigateTo({
      path: '/entrar',
      query: to.fullPath === '/' ? {} : { voltar: to.fullPath },
    })
  }
})
