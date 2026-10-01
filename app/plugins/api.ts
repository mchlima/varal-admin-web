import createClient from 'openapi-fetch'
import type { paths } from '~/api/schema'

/**
 * Cliente HTTP da API gerado a partir do `openapi.json` do varal-web-api
 * (RN-01.11). Usa os cookies de sessão do admin (`credentials: 'include'`).
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = createClient<paths>({
    baseUrl: config.public.apiBaseUrl,
    credentials: 'include',
  })

  return {
    provide: { api },
  }
})
