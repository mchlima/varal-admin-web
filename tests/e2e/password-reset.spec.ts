import { expect, test } from '@playwright/test'

/**
 * "Esqueci a senha" → e-mail no Mailpit → `/definir-senha` (spec 01, seção
 * 7.4). Opcional: roda só com `E2E_MAILPIT_URL` (ex.: http://localhost:8025),
 * porque a API limita a 3 links de redefinição por usuário por hora
 * (RN-01.02). Define a mesma senha do seed, para não mudar o ambiente.
 */
const MAILPIT_URL = process.env.E2E_MAILPIT_URL
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@varal.local'
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'varal12345'

interface MailpitSummary {
  ID: string
  To: { Address: string }[]
  Created: string
}

async function findResetLink(baseURL: string, since: Date): Promise<string | null> {
  const list = (await (await fetch(`${MAILPIT_URL}/api/v1/messages?limit=50`)).json()) as {
    messages: MailpitSummary[]
  }
  for (const message of list.messages) {
    if (new Date(message.Created) < since) continue
    if (!message.To.some((to) => to.Address.toLowerCase() === EMAIL)) continue
    const full = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)).json()) as {
      Text: string
    }
    const link = full.Text.match(/https?:\/\/\S+\/definir-senha#\S+/)?.[0]
    // Outros worktrees mandam e-mails para o mesmo Mailpit: só o link deste admin.
    if (link?.startsWith(baseURL)) return link
  }
  return null
}

test.skip(!MAILPIT_URL, 'defina E2E_MAILPIT_URL para rodar o fluxo com e-mail')

test('esqueci a senha, link do e-mail e definir senha', async ({ page, baseURL }) => {
  const since = new Date(Date.now() - 1000)

  await page.goto('/esqueci-a-senha')
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByRole('button', { name: 'Enviar link' }).click()
  // RN-01.03: a mesma mensagem, exista ou não o e-mail
  await expect(page.getByRole('status')).toContainText('tiver cadastro no admin')

  let link: string | null = null
  await expect
    .poll(
      async () => {
        link = await findResetLink(baseURL ?? '', since)
        return link
      },
      { timeout: 20_000 },
    )
    .not.toBeNull()

  await page.goto(link ?? '')
  await expect(page.getByRole('heading', { name: 'Definir nova senha' })).toBeVisible()
  // O token sai da barra de endereço
  await expect(page).toHaveURL(/\/definir-senha$/)

  await page.getByLabel('Nova senha', { exact: true }).fill('curta')
  await page.getByLabel('Confirme a nova senha').fill('curta')
  await page.getByRole('button', { name: 'Definir senha' }).click()
  await expect(page.getByText('pelo menos 8 caracteres', { exact: false }).first()).toBeVisible()

  await page.getByLabel('Nova senha', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirme a nova senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Definir senha' }).click()
  await expect(page.getByRole('status')).toContainText('Senha definida')

  await page.getByRole('link', { name: 'Entrar' }).click()
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'E-mails do mês' })).toBeVisible()

  // O link é de uso único
  await page.goto(link ?? '')
  await page.getByLabel('Nova senha', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirme a nova senha').fill(PASSWORD)
  await page.getByRole('button', { name: 'Definir senha' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pedir um novo link' })).toBeVisible()
})
