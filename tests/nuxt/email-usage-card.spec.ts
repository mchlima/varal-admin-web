import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import EmailUsageCard from '~/components/EmailUsageCard.vue'
import type { EmailUsage } from '~/utils/email-usage'

function usage(count: number, level: EmailUsage['level']): EmailUsage {
  return { month: '2026-10', count, limit: 10000, warningThreshold: 8000, level }
}

async function mountCard(value: EmailUsage) {
  return mountSuspended(EmailUsageCard, { props: { usage: value } })
}

describe('cartão de uso de e-mail (RN-01.04)', () => {
  it('nível normal: contagem, mês e status com texto e ícone', async () => {
    const card = await mountCard(usage(1234, 'ok'))

    expect(card.text()).toContain('E-mails do mês')
    expect(card.text()).toMatch(/outubro de 2026/i)
    expect(card.text()).toContain('1.234')
    expect(card.text()).toContain('de 10.000 envios')

    const badge = card.get('[data-testid="email-usage-level"]')
    expect(badge.text()).toBe('Normal')
    expect(badge.find('.iconify, [class*="i-lucide"]').exists()).toBe(true)
    expect(card.get('[data-testid="email-usage-message"]').attributes('role')).toBeUndefined()

    const bar = card.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('1234')
    expect(bar.attributes('aria-valuemax')).toBe('10000')
  })

  it('CA-01.09: a partir de 8.000 envios mostra o alerta, com texto e ícone', async () => {
    const card = await mountCard(usage(8001, 'warning'))

    const badge = card.get('[data-testid="email-usage-level"]')
    expect(badge.text()).toBe('Alerta')
    expect(badge.find('.iconify, [class*="i-lucide"]').exists()).toBe(true)

    const message = card.get('[data-testid="email-usage-message"]')
    expect(message.attributes('role')).toBe('status')
    expect(message.text()).toContain('Passou de 8.000 envios no mês')
    expect(card.text()).toContain('(80%)')
  })

  it('RN-01.04: no limite de 10.000 o alerta fica crítico', async () => {
    const card = await mountCard(usage(10000, 'critical'))

    const badge = card.get('[data-testid="email-usage-level"]')
    expect(badge.text()).toBe('Crítico')
    expect(badge.find('.iconify, [class*="i-lucide"]').exists()).toBe(true)

    const message = card.get('[data-testid="email-usage-message"]')
    expect(message.attributes('role')).toBe('status')
    expect(message.text()).toContain('Limite de 10.000 envios do mês atingido')
    expect(message.text()).toContain('convites e redefinições de senha')
    expect(card.text()).toContain('(100%)')
  })

  it('segue o nível vindo da API, sem recalcular pela contagem', async () => {
    const card = await mountCard(usage(7999, 'warning'))
    expect(card.get('[data-testid="email-usage-level"]').text()).toBe('Alerta')
  })

  it('a barra não passa de 100% acima do limite', async () => {
    const card = await mountCard(usage(12500, 'critical'))
    expect(card.text()).toContain('(100%)')
  })
})
