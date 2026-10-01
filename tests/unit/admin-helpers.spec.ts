import { describe, expect, it } from 'vitest'
import { auditChangeRows, auditMetadata } from '../../app/utils/audit'
import {
  addDays,
  dayRangeToInstants,
  formatCents,
  isoToSaoPauloLocal,
  saoPauloLocalToIso,
  todayInSaoPaulo,
} from '../../app/utils/format'
import { impersonationStatusLabel, prepareTab } from '../../app/utils/impersonation'
import { canReactivate, canSuspend, readSummary } from '../../app/utils/statuses'
import {
  validateAnnouncement,
  validateCreateOrganization,
  validateInviteAdmin,
  validateRole,
} from '../../app/utils/validation'

const names = (errors: { name?: string }[]) => errors.map((error) => error.name)

describe('formulário de nova organização (RN-02.09)', () => {
  const valid = {
    name: 'Pastel da Feira',
    unitName: 'Praça central',
    ownerName: 'Maria',
    ownerEmail: 'maria@exemplo.com',
    subscriptionStatus: 'active' as const,
  }

  it('aceita os quatro campos preenchidos', () => {
    expect(validateCreateOrganization(valid)).toEqual([])
  })

  it('exige nome, unidade, nome e e-mail do dono, em português', () => {
    const errors = validateCreateOrganization({
      ...valid,
      name: '',
      unitName: 'A',
      ownerName: ' ',
      ownerEmail: 'maria@',
    })
    expect(names(errors)).toEqual(['name', 'unitName', 'owner.name', 'owner.email'])
    expect(errors[0]?.message).toBe('Informe o nome da organização.')
    expect(errors[1]?.message).toBe('Use pelo menos 2 caracteres.')
    expect(errors[3]?.message).toMatch(/Confira o e-mail/)
  })
})

describe('formulário de comunicado (RN-02.13, RN-02.14)', () => {
  const valid = {
    title: 'Novidade',
    body: 'Texto',
    audienceType: 'all' as const,
    audienceStatuses: [],
    organizationIds: [],
  }

  it('título até 80 e texto até 2.000 caracteres', () => {
    expect(validateAnnouncement(valid)).toEqual([])
    expect(
      names(validateAnnouncement({ ...valid, title: 'x'.repeat(81), body: 'y'.repeat(2001) })),
    ).toEqual(['title', 'body'])
  })

  it('público por situação ou escolhidas exige pelo menos uma escolha', () => {
    expect(names(validateAnnouncement({ ...valid, audienceType: 'by_status' }))).toEqual([
      'audienceStatuses',
    ])
    expect(names(validateAnnouncement({ ...valid, audienceType: 'selected' }))).toEqual([
      'organizationIds',
    ])
    expect(
      validateAnnouncement({ ...valid, audienceType: 'by_status', audienceStatuses: ['pilot'] }),
    ).toEqual([])
  })
})

describe('outros formulários', () => {
  it('papel: nome de 2 a 60 caracteres', () => {
    expect(names(validateRole({ name: 'A', description: '' }))).toEqual(['name'])
    expect(validateRole({ name: 'Atendimento', description: '' })).toEqual([])
  })

  it('convite de usuário do admin: nome e e-mail', () => {
    expect(names(validateInviteAdmin({ name: '', email: 'x' }))).toEqual(['name', 'email'])
  })
})

describe('situação da assinatura (RN-02.11)', () => {
  it('suspende só de piloto ou ativa e reativa só de suspensa ou cancelada', () => {
    expect([
      canSuspend('pilot'),
      canSuspend('active'),
      canSuspend('suspended'),
      canSuspend('canceled'),
    ]).toEqual([true, true, false, false])
    expect([
      canReactivate('pilot'),
      canReactivate('active'),
      canReactivate('suspended'),
      canReactivate('canceled'),
    ]).toEqual([false, false, true, true])
  })
})

describe('datas e valores (horário de Brasília)', () => {
  it('agendamento: o horário digitado é o de Brasília', () => {
    expect(saoPauloLocalToIso('2026-10-05T09:30')).toBe('2026-10-05T12:30:00.000Z')
    expect(saoPauloLocalToIso('2026-10-05')).toBeNull()
    expect(isoToSaoPauloLocal('2026-10-05T12:30:00.000Z')).toBe('2026-10-05T09:30')
  })

  it('período de filtro vira instantes com o último dia inteiro', () => {
    expect(dayRangeToInstants('2026-10-01', '2026-10-02')).toEqual({
      from: '2026-10-01T03:00:00.000Z',
      to: '2026-10-03T03:00:00.000Z',
    })
    expect(dayRangeToInstants('', '')).toEqual({})
  })

  it('padrão das métricas: 30 dias terminando hoje em Brasília', () => {
    // 01:00 UTC ainda é o dia anterior em Brasília
    expect(todayInSaoPaulo(new Date('2026-10-02T01:00:00Z'))).toBe('2026-10-01')
    expect(addDays('2026-10-01', -29)).toBe('2026-09-02')
  })

  it('centavos em reais', () => {
    expect(formatCents(4600).replace(/\s/g, ' ')).toBe('R$ 46,00')
  })
})

describe('auditoria e comunicados', () => {
  it('mostra antes e depois por campo, marcando o que mudou', () => {
    const rows = auditChangeRows({
      before: { subscriptionStatus: 'active', name: 'A' },
      after: { subscriptionStatus: 'suspended', name: 'A' },
      metadata: { reason: 'Falta de pagamento' },
    })
    expect(rows).toEqual([
      { field: 'subscriptionStatus', before: 'active', after: 'suspended', changed: true },
      { field: 'name', before: 'A', after: 'A', changed: false },
    ])
    expect(auditMetadata({ metadata: { reason: 'Falta de pagamento' } })).toEqual([
      { key: 'reason', value: 'Falta de pagamento' },
    ])
    expect(auditChangeRows(null)).toEqual([])
  })

  it('contagem de leituras do comunicado', () => {
    expect(readSummary({ readCount: 3, audienceOwnerCount: 10 })).toBe('Lido por 3 de 10 donos')
    expect(readSummary({ readCount: 0, audienceOwnerCount: 1 })).toBe('Lido por 0 de 1 dono')
  })
})

describe('"entrar como" numa nova aba (RN-02.21)', () => {
  it('abre a aba no clique e só depois manda para o link, sem opener', () => {
    const tab = {
      opener: {},
      closed: false,
      location: { replace: (url: string) => (tab.url = url) },
      url: '',
      close() {},
    }
    const pending = prepareTab(() => tab as unknown as Window)
    expect(tab.opener).toBeNull()
    expect(pending.navigate('http://painel/entrar-como#token=abc')).toBe(true)
    expect(tab.url).toBe('http://painel/entrar-como#token=abc')
  })

  it('aba bloqueada: avisa para a tela mostrar o link', () => {
    expect(prepareTab(() => null).navigate('http://painel/entrar-como#token=abc')).toBe(false)
  })
})

describe('lista de acessos de suporte (RN-02.17, RN-02.22)', () => {
  it('sem prazo: em andamento até o admin encerrar', () => {
    expect(impersonationStatusLabel({ active: true, endedAt: null, endedBy: null })).toBe(
      'em andamento',
    )
    expect(
      impersonationStatusLabel({
        active: false,
        endedAt: '2026-10-01T15:30:00Z',
        endedBy: 'admin',
      }),
    ).toMatch(/^encerrado 01\/10\/2026/)
  })

  it('acessos antigos que venceram no limite de 60 minutos aparecem como expirados', () => {
    expect(
      impersonationStatusLabel({
        active: false,
        endedAt: '2026-10-01T15:30:00Z',
        endedBy: 'expired',
      }),
    ).toMatch(/^expirou /)
  })
})
