import { expect, test, type Page } from '@playwright/test'

/**
 * Acesso do admin contra a API local com o seed (spec 01, seções 7 e 14.1).
 * Admin do seed: admin@varal.local / varal12345 (varal-web-api, README).
 */
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@varal.local'
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'varal12345'

async function login(page: Page, password = PASSWORD) {
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('rota protegida manda para /entrar e volta para ela depois do login', async ({ page }) => {
  await page.goto('/emails')
  await expect(page).toHaveURL(/\/entrar\?voltar=(%2F|\/)emails$/)
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()

  await login(page)

  await expect(page).toHaveURL(/\/emails$/)
  await expect(page.getByRole('heading', { name: 'E-mails', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'E-mails do mês' })).toBeVisible()
  // Status com texto (RN-01.04): um dos três níveis
  await expect(page.getByTestId('email-usage-level')).toHaveText(/Normal|Alerta|Crítico/)
})

test('senha errada mostra o erro da API em português', async ({ page }) => {
  await page.goto('/entrar')
  await login(page, 'senha-errada')

  await expect(page.getByRole('alert')).toContainText(/incorret|inválid/i)
  await expect(page).toHaveURL(/\/entrar/)
})

test('logado, /entrar vai para o início; navegação lateral com as rotas do admin', async ({
  page,
}) => {
  await page.goto('/entrar')
  await login(page)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'E-mails do mês' })).toBeVisible()

  await page.goto('/entrar')
  await expect(page).toHaveURL(/\/$/)

  const nav = page.getByRole('navigation', { name: 'Navegação principal' }).first()
  for (const label of [
    'Início',
    'Organizações',
    'Comunicados',
    'Métricas',
    'E-mails',
    'Auditoria',
    'Usuários',
    'Papéis',
    'Acessos de suporte',
  ]) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible()
  }

  await nav.getByRole('link', { name: 'Auditoria' }).click()
  await expect(page).toHaveURL(/\/auditoria$/)
  await expect(page.getByRole('heading', { name: 'Auditoria', level: 1 })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Auditoria' })).toHaveAttribute('aria-current', 'page')
})

test('renova a sessão quando o token de acesso some (spec 01, seção 7.2)', async ({
  page,
  context,
}) => {
  await page.goto('/entrar')
  await login(page)
  await expect(page.getByRole('heading', { name: 'E-mails do mês' })).toBeVisible()

  // Simula o token de acesso vencido: só o cookie de renovação continua.
  await context.clearCookies({ name: '__Host-varal_admin_at' })
  const refresh = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/admin/auth/refresh') && response.status() === 200,
  )
  await page.reload()

  await refresh
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'E-mails do mês' })).toBeVisible()
})

test('troca de senha pelo menu do usuário e logout', async ({ page }) => {
  await page.goto('/entrar')
  await login(page)
  await expect(page.getByRole('heading', { name: 'E-mails do mês' })).toBeVisible()

  // Troca para a mesma senha, para o teste poder rodar de novo.
  await page.getByTestId('user-menu').first().click()
  await page.getByRole('menuitem', { name: 'Trocar senha' }).click()
  const dialog = page.getByRole('dialog', { name: 'Trocar senha' })
  await dialog.getByLabel('Senha atual').fill('senha-errada')
  await dialog.getByLabel('Nova senha', { exact: true }).fill(PASSWORD)
  await dialog.getByLabel('Confirme a nova senha').fill(PASSWORD)
  await dialog.getByRole('button', { name: 'Trocar senha' }).click()
  await expect(dialog).toContainText(/senha atual/i)

  await dialog.getByLabel('Senha atual').fill(PASSWORD)
  await dialog.getByRole('button', { name: 'Trocar senha' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Senha trocada.', { exact: true })).toBeVisible()

  // Continua logado com a sessão nova deste aparelho
  await page.reload()
  await expect(page.getByRole('heading', { name: 'E-mails do mês' })).toBeVisible()

  await page.getByTestId('user-menu').first().click()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/entrar$/)

  await page.goto('/')
  await expect(page).toHaveURL(/\/entrar$/)
})
