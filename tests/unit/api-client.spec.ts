import { describe, expect, it, vi } from 'vitest'
import { REFRESH_PATH, createApiClient, createSharedRefresh } from '../../app/api/client'

const BASE_URL = 'http://api.test'
const DEVICE_ID = '0192f000-0000-7000-8000-000000000001'

const ME = {
  admin: { id: '0192f000-0000-7000-8000-0000000000aa', name: 'Admin', email: 'admin@varal.local' },
  session: {
    id: '0192f000-0000-7000-8000-0000000000bb',
    deviceId: DEVICE_ID,
    accessTokenExpiresAt: '2026-10-01T12:15:00Z',
    expiresAt: '2026-10-31T12:00:00Z',
  },
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const UNAUTHENTICATED = {
  error: { code: 'UNAUTHENTICATED', message: 'Sessão encerrada.', details: {} },
}

/**
 * API falsa com sessão: o token de acesso "vence" e só volta a valer depois
 * de um `POST /admin/auth/refresh` bem-sucedido.
 */
function fakeApi(options: { refreshOk?: boolean; refreshDelayMs?: number } = {}) {
  let accessValid = false
  const calls: { method: string; path: string; deviceId: string | null; body: string }[] = []

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const path = new URL(request.url).pathname
    calls.push({
      method: request.method,
      path,
      deviceId: request.headers.get('X-Device-Id'),
      body: await request.text(),
    })

    if (path === REFRESH_PATH) {
      await new Promise((resolve) => setTimeout(resolve, options.refreshDelayMs ?? 10))
      if (options.refreshOk === false) return json(401, UNAUTHENTICATED)
      accessValid = true
      return json(200, ME.session)
    }
    if (path === '/api/v1/admin/auth/login') {
      return json(401, {
        error: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.', details: {} },
      })
    }
    if (!accessValid) return json(401, UNAUTHENTICATED)
    if (path === '/api/v1/admin/auth/me') return json(200, ME)
    if (path === '/api/v1/admin/auth/password/change') return json(200, ME.session)
    return json(404, { error: { code: 'NOT_FOUND', message: 'Não encontrado.', details: {} } })
  })

  return { fetch, calls, refreshes: () => calls.filter((c) => c.path === REFRESH_PATH).length }
}

function client(api: ReturnType<typeof fakeApi>, onSessionExpired = vi.fn()) {
  return {
    onSessionExpired,
    api: createApiClient({
      baseUrl: BASE_URL,
      getDeviceId: () => DEVICE_ID,
      onSessionExpired,
      fetch: api.fetch as unknown as typeof globalThis.fetch,
    }),
  }
}

describe('cliente da API: sessão (spec 01, seção 7.2)', () => {
  it('envia o X-Device-Id em todas as requisições, inclusive na renovação', async () => {
    const fake = fakeApi()
    const { api } = client(fake)

    await api.GET('/api/v1/admin/auth/me')

    expect(fake.calls.length).toBeGreaterThan(0)
    expect(fake.calls.every((call) => call.deviceId === DEVICE_ID)).toBe(true)
  })

  it('em 401 renova a sessão e repete a requisição', async () => {
    const fake = fakeApi()
    const { api } = client(fake)

    const { data, error } = await api.GET('/api/v1/admin/auth/me')

    expect(error).toBeUndefined()
    expect(data).toEqual(ME)
    expect(fake.calls.map((c) => c.path)).toEqual([
      '/api/v1/admin/auth/me',
      REFRESH_PATH,
      '/api/v1/admin/auth/me',
    ])
  })

  it('faz uma única renovação para várias requisições simultâneas com 401', async () => {
    const fake = fakeApi({ refreshDelayMs: 30 })
    const { api } = client(fake)

    const results = await Promise.all([
      api.GET('/api/v1/admin/auth/me'),
      api.GET('/api/v1/admin/auth/me'),
      api.GET('/api/v1/admin/auth/me'),
      api.POST('/api/v1/admin/auth/password/change', {
        body: { currentPassword: 'antiga123', newPassword: 'nova12345' },
      }),
    ])

    expect(fake.refreshes()).toBe(1)
    expect(results.every((result) => result.response.status === 200)).toBe(true)
  })

  it('repete a requisição com o mesmo corpo', async () => {
    const fake = fakeApi()
    const { api } = client(fake)

    await api.POST('/api/v1/admin/auth/password/change', {
      body: { currentPassword: 'antiga123', newPassword: 'nova12345' },
    })

    const changes = fake.calls.filter((c) => c.path === '/api/v1/admin/auth/password/change')
    expect(changes).toHaveLength(2)
    expect(changes[1]?.body).toBe(changes[0]?.body)
    expect(JSON.parse(changes[1]?.body ?? '{}')).toEqual({
      currentPassword: 'antiga123',
      newPassword: 'nova12345',
    })
  })

  it('se a renovação falha, devolve o 401 e avisa uma vez que a sessão acabou', async () => {
    const fake = fakeApi({ refreshOk: false })
    const { api, onSessionExpired } = client(fake)

    const results = await Promise.all([
      api.GET('/api/v1/admin/auth/me'),
      api.GET('/api/v1/admin/emails/usage'),
    ])

    expect(fake.refreshes()).toBe(1)
    expect(onSessionExpired).toHaveBeenCalledTimes(1)
    for (const result of results) {
      expect(result.response.status).toBe(401)
      expect(result.error).toEqual(UNAUTHENTICATED)
    }
  })

  it('não tenta renovar no 401 do login (senha errada)', async () => {
    const fake = fakeApi()
    const { api, onSessionExpired } = client(fake)

    const { error } = await api.POST('/api/v1/admin/auth/login', {
      body: { email: 'admin@varal.local', password: 'errada' },
      params: { header: { 'X-Device-Id': DEVICE_ID } },
    })

    expect(error?.error.code).toBe('INVALID_CREDENTIALS')
    expect(fake.refreshes()).toBe(0)
    expect(onSessionExpired).not.toHaveBeenCalled()
  })

  it('uma renovação nova pode começar depois que a anterior terminou', async () => {
    const fake = fakeApi({ refreshOk: false })
    const { api } = client(fake)

    await api.GET('/api/v1/admin/auth/me')
    await api.GET('/api/v1/admin/auth/me')

    expect(fake.refreshes()).toBe(2)
  })
})

describe('createSharedRefresh', () => {
  it('compartilha a promessa em andamento e trata exceção como falha', async () => {
    const refresh = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      throw new TypeError('Failed to fetch')
    })
    const shared = createSharedRefresh(refresh)

    const results = await Promise.all([shared(), shared(), shared()])

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(results).toEqual([false, false, false])
  })
})
