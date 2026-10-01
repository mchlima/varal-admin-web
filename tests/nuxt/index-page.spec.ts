import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'

describe('página inicial provisória', () => {
  it('mostra o logo e o aviso "Em breve."', async () => {
    const page = await mountSuspended(IndexPage)

    const logo = page.get('img')
    expect(logo.attributes('src')).toBe('/logo.svg')
    expect(logo.attributes('alt')).toBe('Varal')
    expect(page.get('h1').text()).toBe('Em breve.')
  })

  it('usa o botão do Nuxt UI com o tema da spec 08', async () => {
    const page = await mountSuspended(IndexPage)

    const button = page.get('button')
    expect(button.text()).toBe('Entrar')
    expect(button.attributes()).toHaveProperty('disabled')

    const classes = button.classes()
    // Alvo de toque e botão principal (spec 08, seções 2 e 6)
    expect(classes).toContain('min-h-(--size-button-primary-min)')
    expect(classes).toContain('min-w-(--size-touch-min)')
    expect(classes).toContain('rounded-(--radius-control)')
    expect(classes).toContain('bg-primary')
    expect(classes).toContain('text-(--color-primary-ink)')
    // O padrão da biblioteca (rounded-md) é substituído pelo raio da spec
    expect(classes).not.toContain('rounded-md')
  })
})
