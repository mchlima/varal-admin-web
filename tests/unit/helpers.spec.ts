import { describe, expect, it, vi } from 'vitest'
import { NETWORK_ERROR_MESSAGE, UNKNOWN_ERROR_MESSAGE, toApiError } from '../../app/utils/api-error'
import { DEVICE_ID_KEY, createDeviceIdProvider } from '../../app/utils/device-id'
import { parsePasswordLink } from '../../app/utils/password'
import { safeRedirect } from '../../app/utils/route-access'

const UUID_A = '0192f000-0000-7000-8000-000000000001'
const UUID_B = '0192f000-0000-7000-8000-000000000002'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value)
    }),
  }
}

describe('deviceId (spec 01, seção 7.2)', () => {
  it('reaproveita o UUID guardado no navegador', () => {
    const storage = memoryStorage({ [DEVICE_ID_KEY]: UUID_A })
    const getDeviceId = createDeviceIdProvider(storage, () => UUID_B)

    expect(getDeviceId()).toBe(UUID_A)
    expect(storage.setItem).not.toHaveBeenCalled()
  })

  it('gera e guarda um UUID quando não há nenhum (ou o guardado é inválido)', () => {
    const storage = memoryStorage({ [DEVICE_ID_KEY]: 'lixo' })
    const getDeviceId = createDeviceIdProvider(storage, () => UUID_B)

    expect(getDeviceId()).toBe(UUID_B)
    expect(storage.setItem).toHaveBeenCalledWith(DEVICE_ID_KEY, UUID_B)
    expect(getDeviceId()).toBe(UUID_B)
  })

  it('funciona quando o armazenamento falha (aba anônima, dados bloqueados)', () => {
    const broken = {
      getItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
    }
    const generate = vi.fn(() => UUID_A)
    const getDeviceId = createDeviceIdProvider(broken, generate)

    expect(getDeviceId()).toBe(UUID_A)
    expect(getDeviceId()).toBe(UUID_A)
    expect(generate).toHaveBeenCalledTimes(1)
  })
})

describe('erros da API (spec 01, seção 5)', () => {
  it('usa a mensagem em português e separa os campos de VALIDATION_FAILED', () => {
    const info = toApiError({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Dados inválidos.',
        details: { fields: [{ path: 'newPassword', message: 'Mínimo de 8 caracteres.' }] },
      },
    })
    expect(info).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Dados inválidos.',
      fields: { newPassword: 'Mínimo de 8 caracteres.' },
    })
  })

  it('traduz falha de rede e erro desconhecido', () => {
    expect(toApiError(new TypeError('Failed to fetch')).message).toBe(NETWORK_ERROR_MESSAGE)
    expect(toApiError(undefined).message).toBe(UNKNOWN_ERROR_MESSAGE)
    expect(toApiError({ error: 'x' }).message).toBe(UNKNOWN_ERROR_MESSAGE)
  })
})

describe('link de definir senha (spec 01, seção 7.4)', () => {
  it('lê token e tipo do fragmento', () => {
    expect(parsePasswordLink('#token=abc123&tipo=convite')).toEqual({
      token: 'abc123',
      kind: 'convite',
    })
    expect(parsePasswordLink('#token=abc123&tipo=redefinicao')).toEqual({
      token: 'abc123',
      kind: 'redefinicao',
    })
  })

  it('sem token, o link é inválido; tipo desconhecido vira redefinição', () => {
    expect(parsePasswordLink('')).toBeNull()
    expect(parsePasswordLink('#tipo=convite')).toBeNull()
    expect(parsePasswordLink('#token=abc')?.kind).toBe('redefinicao')
  })
})

describe('destino depois do login', () => {
  it.each([
    ['/emails', '/emails'],
    ['/organizacoes?situacao=ativa', '/organizacoes?situacao=ativa'],
    [undefined, '/'],
    ['https://exemplo.com', '/'],
    ['//exemplo.com', '/'],
    ['/\\exemplo.com', '/'],
    ['/entrar', '/'],
  ])('%s → %s', (value, expected) => {
    expect(safeRedirect(value)).toBe(expected)
  })
})
