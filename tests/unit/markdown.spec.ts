import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../../app/utils/markdown'

describe('markdown simples dos comunicados (RN-02.13)', () => {
  it('parágrafos, quebras, negrito e itálico', () => {
    expect(renderMarkdown('Olá **dono**,\nvem *aí*.\n\nAté _logo_.')).toBe(
      '<p>Olá <strong>dono</strong>,<br>vem <em>aí</em>.</p>\n<p>Até <em>logo</em>.</p>',
    )
  })

  it('listas com marcador e numeradas', () => {
    expect(renderMarkdown('Novidades:\n- caixa\n- fiado\n\n1. um\n2. dois')).toBe(
      '<p>Novidades:</p>\n<ul><li>caixa</li><li>fiado</li></ul>\n<ol><li>um</li><li>dois</li></ol>',
    )
  })

  it('links só http e https, abrindo em nova aba', () => {
    expect(renderMarkdown('[Ajuda](https://varal.app/ajuda)')).toContain(
      '<a href="https://varal.app/ajuda" target="_blank" rel="noopener noreferrer">Ajuda</a>',
    )
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('<a')
  })

  it('escapa o HTML do autor', () => {
    const html = renderMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })

  it('não confunde nomes com sublinhado com itálico', () => {
    expect(renderMarkdown('use organizations_read')).toBe('<p>use organizations_read</p>')
  })
})
