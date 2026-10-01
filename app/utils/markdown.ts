/**
 * Markdown simples dos comunicados (RN-02.13), para a prévia do editor.
 *
 * Aceita: parágrafos (linha em branco), quebra de linha, **negrito**,
 * *itálico* ou _itálico_, listas com `- `/`* ` ou `1. ` e links
 * `[texto](https://...)` (só http e https). Todo o resto é texto: o HTML do
 * autor é escapado antes de qualquer marcação, então a saída é segura para
 * `v-html`.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inline(text: string): string {
  let html = escapeHtml(text)
  html = html.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, label: string, url: string) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  )
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<em>$2</em>')
  html = html.replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>')
  return html
}

const UNORDERED = /^\s*[-*]\s+(.*)$/
const ORDERED = /^\s*\d+[.)]\s+(.*)$/

export function renderMarkdown(source: string): string {
  const blocks = source
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
  const html: string[] = []

  for (const block of blocks) {
    if (!block.trim()) continue
    const lines = block.split('\n')
    let paragraph: string[] = []
    let list: { tag: 'ul' | 'ol'; items: string[] } | null = null

    const flushParagraph = () => {
      if (paragraph.length > 0) html.push(`<p>${paragraph.map(inline).join('<br>')}</p>`)
      paragraph = []
    }
    const flushList = () => {
      if (list) {
        html.push(
          `<${list.tag}>${list.items.map((item) => `<li>${inline(item)}</li>`).join('')}</${list.tag}>`,
        )
      }
      list = null
    }

    for (const line of lines) {
      const unordered = UNORDERED.exec(line)
      const ordered = unordered ? null : ORDERED.exec(line)
      const match = unordered ?? ordered
      if (match) {
        const tag = unordered ? 'ul' : 'ol'
        flushParagraph()
        if (list && list.tag !== tag) flushList()
        list ??= { tag, items: [] }
        list.items.push(match[1] ?? '')
      } else {
        flushList()
        paragraph.push(line)
      }
    }
    flushParagraph()
    flushList()
  }

  return html.join('\n')
}
