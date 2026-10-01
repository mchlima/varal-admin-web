import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, '../../app/assets/css/tokens.css'), 'utf8')

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))
  if (!match?.[1]) throw new Error(`token --${name} não encontrado em tokens.css`)
  return match[1]
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

describe('tokens da spec 08', () => {
  it('têm os valores da tabela de cores (spec 08, seção 3)', () => {
    expect(token('color-primary')).toBe('#be185d')
    expect(token('color-primary-ink')).toBe('#ffffff')
    expect(token('color-primary-soft')).toBe('#fce7f3')
    expect(token('color-primary-deep')).toBe('#831843')
    expect(token('color-bg')).toBe('#f3f4f2')
    expect(token('color-surface')).toBe('#ffffff')
    expect(token('color-surface-muted')).toBe('#f6f7f5')
    expect(token('color-text')).toBe('#111315')
    expect(token('color-text-muted')).toBe('#5a6067')
    expect(token('color-border')).toBe('#d9dcd8')
    expect(token('color-focus')).toBe('#111315')
  })

  // CA-08.01: todos os pares de texto e fundo usados passam AA (4,5:1)
  it.each([
    ['color-primary-ink', 'color-primary'],
    ['color-primary-deep', 'color-primary-soft'],
    ['color-primary-deep', 'color-surface'],
    ['color-text', 'color-bg'],
    ['color-text', 'color-surface'],
    ['color-text', 'color-surface-muted'],
    ['color-text-muted', 'color-surface'],
    ['color-text-muted', 'color-surface-muted'],
    ['color-error', 'color-surface'],
    ['color-status-new-text', 'color-status-new-bg'],
    ['color-status-preparing-text', 'color-status-preparing-bg'],
    ['color-status-ready-text', 'color-status-ready-bg'],
    ['color-status-late-text', 'color-status-late-bg'],
    ['color-status-cancelled-text', 'color-status-cancelled-bg'],
  ])('CA-08.01: --%s sobre --%s passa AA', (text, background) => {
    expect(contrast(token(text), token(background))).toBeGreaterThanOrEqual(4.5)
  })
})
