import { existsSync } from 'node:fs'

// `.env.local` do worktree (gerado por `scripts/worktree.sh new`, RN-01.07).
// Variáveis já definidas no ambiente têm prioridade.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

// Porta 3200 + PORT_OFFSET (RN-01.08)
const portOffset = Number(process.env.PORT_OFFSET ?? 0)
const devPort = Number(process.env.PORT ?? 3200 + portOffset)

export default defineNuxtConfig({
  // SPA estática servida pelo NGINX (plano, seção 2.2)
  ssr: false,

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/eslint', '@nuxt/test-utils/module'],

  css: ['~/assets/css/main.css'],

  ui: {
    // Fontes vêm do @fontsource (arquivos no build) e o tema é claro fixo (spec 08)
    fonts: false,
    colorMode: false,
    theme: {
      colors: ['primary', 'success', 'warning', 'error'],
    },
  },

  // Ícones embutidos no bundle, sem chamar a API do Iconify em produção
  icon: {
    provider: 'none',
    clientBundle: {
      // Inclui `.ts`: a navegação e os níveis de e-mail definem ícones em `app/utils`
      scan: {
        globInclude: ['app/**/*.{vue,ts}'],
      },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Varal Admin',
      meta: [
        { name: 'description', content: 'Admin da plataforma Varal' },
        { name: 'theme-color', content: '#BE185D' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      // App estático: o valor fica fixo no build (NUXT_PUBLIC_API_BASE_URL)
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
    },
  },

  devServer: {
    port: devPort,
  },

  typescript: {
    strict: true,
    // Testes de unidade (fora do app) também passam pelo `pnpm typecheck`
    nodeTsConfig: {
      include: ['../tests/unit/**/*', '../tests/e2e/**/*', '../playwright.config.ts'],
    },
  },

  compatibilityDate: '2026-10-01',
})
