import { createApiClient } from '~/api/client'

/**
 * Expõe o cliente da API como `$api` (RN-01.11), com os cookies do admin, o
 * `X-Device-Id` e a renovação única de sessão (`app/api/client.ts`).
 */
export default defineNuxtPlugin({
  name: 'api',
  setup(nuxtApp) {
    const config = useRuntimeConfig()
    const getDeviceId = createDeviceIdProvider()

    const api = createApiClient({
      baseUrl: config.public.apiBaseUrl,
      getDeviceId,
      onSessionExpired() {
        // A renovação falhou: a sessão acabou (logout em outro lugar, troca de
        // senha, prazo de 30 dias). O middleware de rota manda para /entrar.
        void nuxtApp.runWithContext(async () => {
          const session = useSessionStore()
          const wasAuthenticated = session.isAuthenticated
          session.clear()
          const route = useRouter().currentRoute.value
          if (wasAuthenticated && !isPublicRoute(route)) {
            await navigateTo({ path: '/entrar', query: { voltar: route.fullPath } })
          }
        })
      },
    })

    // RN-02.08: um 403 pode significar que as permissões mudaram desde que a
    // tela abriu; relê o perfil para a interface esconder o que não pode mais.
    api.use({
      onResponse({ response }) {
        if (response.status === 403) {
          void nuxtApp.runWithContext(() => useSessionStore().refreshProfile())
        }
        return response
      },
    })

    return {
      provide: { api, deviceId: getDeviceId },
    }
  },
})
