import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import PasswordInput from '~/components/PasswordInput.vue'
import ValidatedField from '~/components/ValidatedField.vue'
import LoginPage from '~/pages/entrar.vue'

/**
 * Clique perdido: a validação roda quando o campo perde o foco, e o `mousedown` no botão de
 * enviar tira o foco do campo antes do `click`. Se a mensagem de erro sumir mudando a altura do
 * campo, o botão sobe e o clique cai fora dele. O jsdom não calcula layout, então o teste
 * compara a estrutura de tudo o que fica antes do botão (os mesmos elementos, na mesma ordem;
 * só a cor da borda e o texto do erro mudam) e confere que a linha do erro tem altura mínima.
 * O teste de ponta a ponta (`tests/e2e/auth.spec.ts`) mede a posição real do botão.
 */
function layoutBeforeSubmit(page: VueWrapper): string[] {
  const form = page.get('form').element
  const button = page.get('button[type="submit"]').element
  return Array.from(form.querySelectorAll('*'))
    .filter((el) => el.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING)
    .map((el) => `${el.tagName}[${el.getAttribute('data-slot') ?? ''}]`)
}

async function blur(page: VueWrapper, selector: string) {
  await page.get(selector).trigger('blur')
  await flushPromises()
}

describe('campos validados ao sair (clique perdido)', () => {
  it('corrigir o campo e sair dele não muda o que fica acima do botão de enviar', async () => {
    const page = await mountSuspended(LoginPage, { route: '/entrar' })
    const password = 'input[autocomplete="current-password"]'
    const before = layoutBeforeSubmit(page)

    // Sai do campo vazio: o erro aparece na linha reservada.
    await blur(page, password)
    const errorId = page.get(password).attributes('aria-describedby')
    expect(page.get(`#${errorId}`).text()).toBe('Informe a senha.')
    expect(page.get(password).attributes('aria-invalid')).toBe('true')
    expect(layoutBeforeSubmit(page)).toEqual(before)

    // Corrige e sai do campo: o erro some, a linha continua lá.
    await page.get(password).setValue('varal12345')
    await blur(page, password)
    expect(page.get(password).attributes('aria-invalid')).toBe('false')
    expect(page.get(password).attributes('aria-describedby')).toBeUndefined()
    const line = page.get(`#${errorId}`)
    expect(line.text()).toBe('')
    expect(line.get('[data-slot="error-line"]').classes()).toContain('min-h-lh')
    expect(layoutBeforeSubmit(page)).toEqual(before)
  })

  it('a ajuda vai acima do controle e fica ligada a ele, sem disputar a linha do erro', async () => {
    const field = await mountSuspended(ValidatedField, {
      props: { label: 'Nova senha', name: 'password', description: 'Pelo menos 8 caracteres.' },
      slots: { default: () => h(PasswordInput, { modelValue: '', autocomplete: 'new-password' }) },
    })
    const input = field.get('input')
    const help = field.get(`#${input.attributes('aria-describedby')}`)
    expect(help.attributes('data-slot')).toBe('description')
    expect(help.text()).toBe('Pelo menos 8 caracteres.')
    expect(field.get('[data-slot="error-line"]').text()).toBe('')
  })
})
