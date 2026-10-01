/**
 * Identificador do aparelho (spec 01, seção 7.2): um UUID gerado uma vez e
 * guardado no navegador, enviado em `X-Device-Id` em toda requisição.
 *
 * O armazenamento pode falhar (aba anônima, dados bloqueados); nesse caso o
 * UUID vale só enquanto a página estiver aberta.
 */
export const DEVICE_ID_KEY = 'varal-admin:device-id'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type DeviceStorage = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): DeviceStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function createDeviceIdProvider(
  storage: DeviceStorage | undefined = browserStorage(),
  generate: () => string = () => crypto.randomUUID(),
): () => string {
  let deviceId: string | undefined

  return () => {
    if (deviceId) return deviceId

    try {
      const stored = storage?.getItem(DEVICE_ID_KEY)
      if (stored && UUID.test(stored)) {
        deviceId = stored
        return deviceId
      }
    } catch {
      // sem acesso ao armazenamento: segue com um UUID só desta página
    }

    deviceId = generate()
    try {
      storage?.setItem(DEVICE_ID_KEY, deviceId)
    } catch {
      // idem
    }
    return deviceId
  }
}
