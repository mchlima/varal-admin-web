import { expect, test, type Browser, type Page } from '@playwright/test'
import { ADMIN_PASSWORD, MAILPIT_URL, login, unique, waitForMailLink } from './support'

/**
 * CA-02.01 e CA-02.02 com um usuário Leitura de verdade: o convite vem pelo
 * Mailpit (`E2E_MAILPIT_URL`, com `ADMIN_URL` da API apontando para este
 * admin), porque o usuário precisa definir a senha.
 */
test.skip(!MAILPIT_URL, 'defina E2E_MAILPIT_URL para convidar o usuário Leitura')

async function newPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
  return context.newPage()
}

test('CA-02.01/02: Leitura não vê as ações; a avulsa organizations:create libera só a criação', async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(90_000)
  const email = `leitura-${unique()}@exemplo.test`

  // Super admin convida o usuário com o papel Leitura
  await login(page)
  await page.goto('/usuarios')
  await page.getByRole('button', { name: 'Convidar usuário' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Nome' }).fill('Leitura E2E')
  await dialog.getByRole('textbox', { name: 'E-mail' }).fill(email)
  await dialog.getByRole('checkbox', { name: 'Leitura', exact: true }).check()
  await dialog.getByRole('button', { name: 'Enviar convite' }).click()
  await expect(page).toHaveURL(/\/usuarios\/[0-9a-f-]{36}$/)
  const userUrl = page.url()

  // O convidado define a senha pelo link do e-mail
  const link = await waitForMailLink(email, /https?:\/\/\S+\/definir-senha#\S+/)
  expect(link.startsWith(baseURL ?? '')).toBe(true)
  const reader = await newPage(browser)
  await reader.goto(link)
  await reader.getByLabel('Nova senha', { exact: true }).fill(ADMIN_PASSWORD)
  await reader.getByLabel('Confirme a nova senha').fill(ADMIN_PASSWORD)
  await reader.getByRole('button', { name: 'Criar senha' }).click()
  await expect(reader.getByRole('status')).toContainText('Senha definida')
  await login(reader, email, ADMIN_PASSWORD)

  // Menu só com o que Leitura pode ver
  const nav = reader.getByRole('complementary').getByRole('navigation')
  await expect(nav.getByRole('link', { name: 'Organizações' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Métricas' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Usuários' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Auditoria' })).toHaveCount(0)

  // Organizações e métricas abrem; criar, suspender e entrar como não aparecem
  await reader.goto('/organizacoes')
  await expect(reader.getByTestId('organization-row').first()).toBeVisible()
  await expect(reader.getByRole('link', { name: 'Nova organização' })).toHaveCount(0)
  await reader.getByTestId('organization-row').first().click()
  await expect(reader.getByTestId('organization-status')).toBeVisible()
  const organizationUrl = reader.url()
  for (const action of ['Suspender', 'Entrar como', 'Mudar situação', 'Editar']) {
    await expect(reader.getByRole('button', { name: action })).toHaveCount(0)
  }
  await reader.goto('/metricas')
  await expect(reader.getByRole('heading', { name: 'Uso por organização' })).toBeVisible()

  // Tela sem permissão: aviso, sem chamar a API
  await reader.goto('/usuarios')
  await expect(reader.getByTestId('no-permission')).toBeVisible()
  await reader.goto('/organizacoes/nova')
  await expect(reader.getByTestId('no-permission')).toBeVisible()

  // CA-02.01: a API também recusa (403) criar, suspender e entrar como
  const apiBase = process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'
  const deviceId =
    (await reader.evaluate(() => localStorage.getItem('varal-admin:device-id'))) ?? ''
  const organizationId = organizationUrl.split('/').at(-1) ?? ''
  const headers = { 'X-Device-Id': deviceId }
  const attempts = [
    reader.request.post(`${apiBase}/api/v1/admin/organizations`, {
      headers,
      data: {
        name: 'Proibida',
        unitName: 'Feira',
        owner: { name: 'Dono', email: `x-${unique()}@exemplo.test` },
      },
    }),
    reader.request.post(`${apiBase}/api/v1/admin/organizations/${organizationId}/suspend`, {
      headers,
      data: { reason: 'Não pode' },
    }),
    reader.request.post(`${apiBase}/api/v1/admin/impersonations`, {
      headers,
      data: { organizationId },
    }),
  ]
  for (const response of await Promise.all(attempts)) {
    expect(response.status()).toBe(403)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('FORBIDDEN')
  }

  // CA-02.02: o Super admin dá a avulsa organizations:create
  await page.goto(userUrl)
  await page.locator('[data-permission="organizations:create"]').check()
  await page.getByRole('button', { name: 'Salvar permissões avulsas' }).click()
  await expect(page.getByTestId('effective-permissions')).toContainText('Criar organização')

  // Na próxima carga, o Leitura vê o botão e cria; suspender continua escondido
  await reader.goto('/organizacoes')
  await reader.getByRole('link', { name: 'Nova organização' }).click()
  const id = unique()
  await reader.getByLabel('Nome da organização').fill(`Leitura cria ${id}`)
  await reader.getByLabel('Nome da primeira unidade').fill('Feira')
  await reader.getByLabel('Nome do dono').fill('Dono criado pelo Leitura')
  await reader.getByLabel('E-mail do dono').fill(`dono-leitura-${id}@exemplo.test`)
  await reader.getByLabel('E-mail do dono').press('Enter')
  await expect(reader.getByRole('heading', { level: 1 })).toHaveText(`Leitura cria ${id}`)
  await expect(reader.getByRole('button', { name: 'Suspender' })).toHaveCount(0)
  await expect(reader.getByRole('button', { name: 'Entrar como' })).toHaveCount(0)

  await reader.context().close()
})
