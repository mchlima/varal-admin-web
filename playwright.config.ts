import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/**
 * Testes de ponta a ponta contra a API local (fora da CI: precisam de um
 * varal-web-api rodando com o seed; ver README, seção "Testes de ponta a
 * ponta").
 *
 * Usa a porta e a URL da API do `.env.local` do worktree. Sobe o `pnpm dev`
 * se ele ainda não estiver rodando.
 */
if (existsSync('.env.local')) process.loadEnvFile('.env.local')

const port = Number(process.env.PORT ?? 3200 + Number(process.env.PORT_OFFSET ?? 0))
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`

export default defineConfig({
  testDir: 'tests/e2e',
  // A troca e a redefinição de senha encerram as outras sessões do admin:
  // os testes rodam em série.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: `${baseURL}/entrar`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
