import { defineStore } from 'pinia'
import type { components } from '~/api/schema'

type AdminMe = components['schemas']['AdminMe']
type Admin = AdminMe['admin']
type AdminRole = AdminMe['roles'][number]
type SessionInfo = components['schemas']['SessionInfo']

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous'

/** Resultado de uma ação: ok, ou o erro já traduzido para a tela. */
export type ActionResult = { ok: true } | { ok: false; error: ApiErrorInfo }

/**
 * Sessão do admin da plataforma (spec 01, seção 7.2). Os tokens ficam nos
 * cookies `httpOnly`; aqui só o perfil vindo de `GET /admin/auth/me`.
 */
export const useSessionStore = defineStore('session', () => {
  const { $api, $deviceId } = useNuxtApp()

  const admin = ref<Admin | null>(null)
  const roles = ref<AdminRole[]>([])
  /** Permissões efetivas (papéis + avulsas, RN-02.02), vindas da API. */
  const permissions = ref<Permission[]>([])
  const session = ref<SessionInfo | null>(null)
  const status = ref<SessionStatus>('unknown')

  const isAuthenticated = computed(() => status.value === 'authenticated')

  let loading: Promise<void> | null = null

  function apply(me: AdminMe) {
    admin.value = me.admin
    roles.value = me.roles
    permissions.value = me.permissions
    session.value = me.session
    status.value = 'authenticated'
  }

  function clear() {
    admin.value = null
    roles.value = []
    permissions.value = []
    session.value = null
    status.value = 'anonymous'
  }

  /** Carrega o admin logado, uma vez; o 401 já passou pela renovação. */
  function ensureLoaded(): Promise<void> {
    if (status.value !== 'unknown') return Promise.resolve()
    loading ??= (async () => {
      try {
        const { data } = await $api.GET('/api/v1/admin/auth/me')
        if (data) apply(data)
        else clear()
      } catch {
        // Sem conexão: trata como sem sessão; o login mostra o erro de rede.
        clear()
      } finally {
        loading = null
      }
    })()
    return loading
  }

  /**
   * Relê papéis e permissões (RN-02.08: mudanças valem na próxima
   * requisição). Chamado depois de um 403, para a interface esconder o que o
   * usuário deixou de poder fazer.
   */
  let refreshing: Promise<void> | null = null
  function refreshProfile(): Promise<void> {
    if (status.value !== 'authenticated') return Promise.resolve()
    refreshing ??= (async () => {
      try {
        const { data } = await $api.GET('/api/v1/admin/auth/me')
        if (data) apply(data)
      } catch {
        // sem conexão: mantém o que já tinha
      } finally {
        refreshing = null
      }
    })()
    return refreshing
  }

  async function login(email: string, password: string): Promise<ActionResult> {
    try {
      const { data, error } = await $api.POST('/api/v1/admin/auth/login', {
        body: { email, password },
        // O plugin preenche o X-Device-Id de verdade; o tipo exige o cabeçalho.
        params: { header: { 'X-Device-Id': $deviceId() } },
      })
      if (data) {
        apply(data)
        return { ok: true }
      }
      return { ok: false, error: toApiError(error) }
    } catch (error) {
      return { ok: false, error: toApiError(error) }
    }
  }

  /** Encerra a sessão do aparelho; a tela sai mesmo se a API falhar. */
  async function logout(): Promise<void> {
    try {
      await $api.POST('/api/v1/admin/auth/logout')
    } catch {
      // sem conexão: os cookies vencem sozinhos
    } finally {
      clear()
    }
  }

  /** Troca de senha logado: as outras sessões caem e esta é renovada. */
  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ActionResult> {
    try {
      const { data, error } = await $api.POST('/api/v1/admin/auth/password/change', {
        body: { currentPassword, newPassword },
      })
      if (data) {
        session.value = data
        return { ok: true }
      }
      return { ok: false, error: toApiError(error) }
    } catch (error) {
      return { ok: false, error: toApiError(error) }
    }
  }

  return {
    admin,
    roles,
    permissions,
    session,
    status,
    isAuthenticated,
    ensureLoaded,
    refreshProfile,
    login,
    logout,
    changePassword,
    clear,
  }
})
