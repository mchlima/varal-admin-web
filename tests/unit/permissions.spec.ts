import { describe, expect, it } from 'vitest'
import { describeApiError } from '../../app/utils/api-call'
import { NAVIGATION, visibleNavigation } from '../../app/utils/navigation'
import {
  FORBIDDEN_MESSAGE,
  groupPermissions,
  hasPermission,
  sortRoles,
  type Permission,
  type PermissionInfo,
} from '../../app/utils/permissions'

/** Permissões do papel Leitura do seed (spec 02, seção 3.2). */
const READ_ONLY: Permission[] = ['organizations:read', 'announcements:read', 'metrics:read']

describe('permissões na interface (RN-02.01, RN-02.02)', () => {
  it('basta ter uma das permissões exigidas', () => {
    expect(hasPermission(READ_ONLY, 'organizations:read')).toBe(true)
    expect(hasPermission(READ_ONLY, 'organizations:create')).toBe(false)
    expect(hasPermission(READ_ONLY, ['admin.roles:manage', 'metrics:read'])).toBe(true)
    expect(hasPermission([], ['admin.roles:manage', 'admin.users:manage'])).toBe(false)
  })

  it('sem exigência, qualquer admin vê', () => {
    expect(hasPermission([], undefined)).toBe(true)
    expect(hasPermission([], [])).toBe(true)
  })

  it('CA-02.01: Leitura vê organizações e métricas, mas não usuários, papéis, auditoria nem acessos', () => {
    const labels = visibleNavigation((required) => hasPermission(READ_ONLY, required)).map(
      (item) => item.label,
    )
    expect(labels).toEqual(['Início', 'Organizações', 'Comunicados', 'Métricas'])
  })

  it('CA-02.02: a permissão avulsa organizations:create soma sem dar outras', () => {
    const effective: Permission[] = [...READ_ONLY, 'organizations:create']
    expect(hasPermission(effective, 'organizations:create')).toBe(true)
    expect(hasPermission(effective, 'organizations:suspend')).toBe(false)
    expect(hasPermission(effective, 'impersonation:use')).toBe(false)
  })

  it('papéis aparecem para quem gerencia papéis ou usuários', () => {
    const roles = NAVIGATION.find((item) => item.to === '/papeis')
    expect(hasPermission(['admin.users:manage'], roles?.permission)).toBe(true)
    expect(hasPermission(['admin.roles:manage'], roles?.permission)).toBe(true)
    expect(hasPermission(READ_ONLY, roles?.permission)).toBe(false)
  })

  it('todas as telas, menos o Início, exigem permissão', () => {
    expect(NAVIGATION.filter((item) => !item.permission).map((item) => item.to)).toEqual(['/'])
  })

  it('agrupa o catálogo por recurso, com nomes em português, e aceita recurso novo', () => {
    const catalog = [
      { key: 'organizations:read', description: 'Ver' },
      { key: 'admin.users:manage', description: 'Usuários' },
      { key: 'organizations:create', description: 'Criar' },
      { key: 'billing:read', description: 'Nova' },
    ] as unknown as PermissionInfo[]
    const groups = groupPermissions(catalog)
    expect(groups.map((group) => [group.label, group.permissions.length])).toEqual([
      ['Organizações', 2],
      ['Usuários do admin', 1],
      ['billing', 1],
    ])
  })

  it('Super admin primeiro, depois os papéis do sistema e os personalizados por nome', () => {
    const sorted = sortRoles([
      { name: 'Zeta', isSystem: false, systemKey: null },
      { name: 'Leitura', isSystem: true, systemKey: 'read_only' },
      { name: 'Super admin', isSystem: true, systemKey: 'super_admin' },
      { name: 'Atendimento', isSystem: false, systemKey: null },
    ])
    expect(sorted.map((role) => role.name)).toEqual([
      'Super admin',
      'Leitura',
      'Atendimento',
      'Zeta',
    ])
  })
})

describe('erros da API', () => {
  it('RN-02.01: o 403 vira uma mensagem que explica o que fazer', () => {
    const info = describeApiError({
      error: { code: 'FORBIDDEN', message: 'Você não tem permissão para fazer isso.', details: {} },
    })
    expect(info.code).toBe('FORBIDDEN')
    expect(info.message).toBe(FORBIDDEN_MESSAGE)
  })

  it('outros erros mantêm a mensagem da API (RN-02.05)', () => {
    const message = 'É preciso manter pelo menos um usuário ativo com o papel Super admin.'
    expect(describeApiError({ error: { code: 'LAST_SUPER_ADMIN', message } }).message).toBe(message)
  })
})
