import { expect, type Page } from '@playwright/test'

/** Apoio dos testes de ponta a ponta do admin (API local com o seed). */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@varal.local'
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'varal12345'
export const MAILPIT_URL = process.env.E2E_MAILPIT_URL

export async function login(page: Page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Olá|Início/)
}

/** Sufixo único por rodada, para nomes e e-mails não colidirem. */
export function unique(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`
}

interface MailpitSummary {
  ID: string
  To: { Address: string }[]
  Created: string
}

/** Primeiro link que casa com `pattern` num e-mail para `to` (Mailpit). */
export async function findMailLink(to: string, pattern: RegExp): Promise<string | null> {
  if (!MAILPIT_URL) return null
  const list = (await (await fetch(`${MAILPIT_URL}/api/v1/messages?limit=100`)).json()) as {
    messages: MailpitSummary[]
  }
  for (const message of list.messages) {
    if (!message.To.some((item) => item.Address.toLowerCase() === to.toLowerCase())) continue
    const full = (await (await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)).json()) as {
      Text: string
    }
    const link = full.Text.match(pattern)?.[0]
    if (link) return link
  }
  return null
}

export async function waitForMailLink(to: string, pattern: RegExp): Promise<string> {
  let link: string | null = null
  await expect
    .poll(
      async () => {
        link = await findMailLink(to, pattern)
        return link
      },
      { timeout: 30_000 },
    )
    .not.toBeNull()
  return link ?? ''
}
