import { expect, test } from '@playwright/test'
import { MAILPIT_URL, login, unique, waitForMailLink } from './support'

/**
 * Admin da plataforma (spec 02) contra a API local com o seed. O convite do
 * dono no Mailpit só é conferido com `E2E_MAILPIT_URL`.
 */
test('CA-02.04: cria organização com unidade e convite do dono', async ({ page }) => {
  const id = unique()
  const ownerEmail = `dono-${id}@exemplo.test`
  await login(page)

  await page.getByRole('link', { name: 'Organizações' }).first().click()
  await page.getByRole('link', { name: 'Nova organização' }).click()
  await expect(page).toHaveURL(/\/organizacoes\/nova$/)

  // Validação em português antes de chamar a API
  await page.getByRole('button', { name: 'Criar organização e enviar convite' }).click()
  await expect(page.getByText('Informe o nome da organização.')).toBeVisible()

  await page.getByLabel('Nome da organização').fill(`Pastel E2E ${id}`)
  await page.getByLabel('Nome da primeira unidade').fill('Feira da praça')
  await page.getByLabel('Piloto').check()
  await page.getByLabel('Nome do dono').fill('Dona do Pastel')
  // Enter no último campo: o clique logo depois do blur pode cair fora do
  // botão, que se move quando as mensagens de erro somem
  await page.getByLabel('E-mail do dono').fill(ownerEmail)
  await page.getByLabel('E-mail do dono').press('Enter')

  await expect(page).toHaveURL(/\/organizacoes\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Pastel E2E ${id}`)
  await expect(page.getByTestId('organization-status')).toHaveText('Piloto')
  await expect(page.getByTestId('owner-invite-status')).toHaveText('Convite pendente')
  await expect(page.getByText('Feira da praça')).toBeVisible()
  await expect(page.getByRole('main').getByText(ownerEmail, { exact: true })).toBeVisible()

  // RN-02.10: o mesmo e-mail de dono não entra em outra organização
  await page.goto('/organizacoes/nova')
  await page.getByLabel('Nome da organização').fill(`Outra ${id}`)
  await page.getByLabel('Nome da primeira unidade').fill('Unidade')
  await page.getByLabel('Nome do dono').fill('Outro dono')
  await page.getByLabel('E-mail do dono').fill(ownerEmail)
  await page.getByLabel('E-mail do dono').press('Enter')
  await expect(page.getByText('Este e-mail já é de um dono cadastrado no Varal.')).toBeVisible()

  if (MAILPIT_URL) {
    // O convite chega com o link do painel para definir a senha
    const link = await waitForMailLink(ownerEmail, /https?:\/\/\S+\/definir-senha#\S+/)
    expect(link).toContain('tipo=convite')
  }
})

test('suspende com motivo e reativa (RN-02.11)', async ({ page }) => {
  const id = unique()
  await login(page)
  await page.goto('/organizacoes/nova')
  await page.getByLabel('Nome da organização').fill(`Tapioca E2E ${id}`)
  await page.getByLabel('Nome da primeira unidade').fill('Feira')
  await page.getByLabel('Nome do dono').fill('Dono da Tapioca')
  await page.getByLabel('E-mail do dono').fill(`tapioca-${id}@exemplo.test`)
  await page.getByLabel('E-mail do dono').press('Enter')
  await expect(page.getByTestId('organization-status')).toHaveText('Ativa')

  await page.getByRole('button', { name: 'Suspender' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Suspender' }).click()
  await expect(dialog.getByText('Escreva o motivo com pelo menos 3 caracteres.')).toBeVisible()
  await dialog.getByLabel('Motivo').fill('Mensalidade em atraso')
  await dialog.getByRole('button', { name: 'Suspender' }).click()

  await expect(page.getByTestId('organization-status')).toHaveText('Suspensa')
  await expect(page.getByTestId('suspended-reason')).toContainText('Mensalidade em atraso')
  // Suspensa não pode ser suspensa de novo: o botão vira Reativar
  await expect(page.getByRole('button', { name: 'Suspender' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Reativar' }).click()
  await page.getByRole('dialog').getByLabel('Motivo').fill('Pagamento confirmado')
  await page.getByRole('dialog').getByRole('button', { name: 'Reativar' }).click()
  await expect(page.getByTestId('organization-status')).toHaveText('Ativa')

  // A auditoria registra a suspensão com o motivo
  await page.goto('/auditoria')
  await page.getByRole('textbox', { name: 'Ação' }).fill('organization.suspended')
  const row = page.getByTestId('audit-row').first()
  await expect(row).toContainText('organization.suspended')
  await row.getByRole('button', { name: 'Ver detalhes' }).click()
  await expect(row.getByTestId('audit-detail')).toContainText('Mensalidade em atraso')
})

test('publica um comunicado para todas as organizações (RN-02.15)', async ({ page }) => {
  const title = `Novidade ${unique()}`
  await login(page)
  await page.goto('/comunicados')
  await page.getByRole('link', { name: 'Novo comunicado' }).click()

  await page.getByLabel('Título').fill(title)
  await page.getByLabel('Texto').fill('Agora o **caixa** fecha sozinho.\n\n- rápido\n- simples')
  await page.getByRole('tab', { name: 'Prévia' }).click()
  const preview = page.getByTestId('announcement-preview')
  await expect(preview.locator('strong')).toHaveText('caixa')
  await expect(preview.locator('li')).toHaveCount(2)

  await page.getByRole('button', { name: 'Publicar agora' }).click()
  await expect(page).toHaveURL(/\/comunicados\/[0-9a-f-]{36}$/)
  await expect(page.getByTestId('announcement-status')).toHaveText('Publicado')
  await expect(page.getByTestId('announcement-reads')).toContainText(/Lido por 0 de \d+ dono/)

  await page.goto('/comunicados?situacao=published')
  await expect(page.getByTestId('announcement-row').filter({ hasText: title })).toBeVisible()
})

test('"entrar como" gera o link do painel e o acesso pode ser encerrado (RN-02.17, RN-02.21)', async ({
  page,
  context,
}) => {
  // O painel não precisa estar no ar: a aba nova só tem de receber o link
  await context.route('**/entrar-como*', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>painel</title>' }),
  )
  const reason = `Ajudar a cadastrar o cardápio ${unique()}`
  await login(page)
  await page.goto('/organizacoes?busca=ESPT26')
  await page.getByTestId('organization-row').first().click()
  await page.getByRole('button', { name: 'Entrar como' }).click()

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Motivo do acesso').fill('curto')
  await dialog.getByRole('button', { name: 'Entrar como o dono' }).click()
  await expect(dialog.getByText('pelo menos 10 caracteres', { exact: false }).first()).toBeVisible()

  await dialog.getByLabel('Motivo do acesso').fill(reason)
  const popupPromise = page.waitForEvent('popup')
  await dialog.getByRole('button', { name: 'Entrar como o dono' }).click()
  const popup = await popupPromise
  await expect.poll(() => popup.url()).toMatch(/\/entrar-como#token=.+/)
  await expect(dialog.getByTestId('impersonation-started')).toBeVisible()
  await expect(dialog.getByTestId('impersonation-link')).toHaveAttribute(
    'href',
    /\/entrar-como#token=.+/,
  )
  await popup.close()
  await dialog.getByRole('button', { name: 'Fechar', exact: true }).last().click()

  await page.goto('/acessos-de-suporte')
  const row = page.getByTestId('impersonation-row').filter({ hasText: reason })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Encerrar acesso' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Encerrar acesso' }).click()
  await expect(row).toHaveCount(0)
})
