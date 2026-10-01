# varal-admin-web

Admin da plataforma Varal: Nuxt 4 em modo SPA (`ssr: false`), Nuxt UI 4 com a identidade visual da spec 08 e cliente da API gerado do OpenAPI.

Specs e decisões do produto: [varal-docs](https://github.com/mchlima/varal-docs). Regras para agentes: [`AGENTS.md`](AGENTS.md).

## Requisitos

- Node 26 (`.nvmrc`; com nvm: `nvm use`)
- pnpm 10 (`npm install -g pnpm@10`; o Node 26 não traz mais o corepack)
- Git hooks de bloqueio da `main` ativos no clone: `git config core.hooksPath .githooks`

## Comandos

| Comando               | O que faz                                                              |
| --------------------- | ---------------------------------------------------------------------- |
| `pnpm install`        | Instala as dependências (e roda `nuxt prepare`)                        |
| `pnpm dev`            | Servidor de desenvolvimento na porta `3200 + PORT_OFFSET`              |
| `pnpm generate`       | Build estático em `.output/public` (é o que vai para o NGINX)          |
| `pnpm preview`        | Serve o build localmente                                               |
| `pnpm gen:api`        | Gera `app/api/schema.d.ts` a partir do `openapi.json` do varal-web-api |
| `pnpm lint`           | ESLint e Prettier (só confere)                                         |
| `pnpm format`         | Formata com Prettier e corrige o que o ESLint consegue                 |
| `pnpm typecheck`      | Checagem de tipos (`vue-tsc` via `nuxt typecheck`)                     |
| `pnpm test`           | Testes (Vitest + `@nuxt/test-utils`)                                   |
| `pnpm test:watch`     | Testes em modo observação                                              |
| `pnpm test:e2e`       | Playwright (Chromium desktop) contra a API local; fora da CI           |
| `scripts/worktree.sh` | Cria, lista e remove worktrees de desenvolvimento (veja abaixo)        |

## Ambiente

Variáveis em [`.env.example`](.env.example). Em desenvolvimento, o `nuxt.config.ts` lê o `.env.local` do worktree.

- `PORT_OFFSET` e `PORT`: porta do dev server, `3200 + PORT_OFFSET` (RN-01.08).
- `NUXT_PUBLIC_API_BASE_URL`: URL da API, fixada no build. Padrão `http://localhost:3000`; produção `https://api-web-varal.kratinho.com.br`.

## Worktrees

Cada tarefa roda num worktree próprio fora do repositório, em `../.worktrees/varal-admin-web/<nome>` (spec 01, seção 4.1):

```sh
scripts/worktree.sh new feat/lista-de-organizacoes   # cria ../.worktrees/varal-admin-web/feat-lista-de-organizacoes
scripts/worktree.sh list                             # worktrees, branches e portas
scripts/worktree.sh remove feat-lista-de-organizacoes
```

O `new` exige `core.hooksPath=.githooks`, cria a branch a partir de `origin/main`, escolhe o menor `PORT_OFFSET` livre (1 a 99), gera o `.env.local` e roda `pnpm install`. O `remove` recusa worktrees com alterações sem commit e mantém a branch.

## Cliente da API

`pnpm gen:api` lê `../varal-web-api/openapi.json` (ao lado do checkout principal, mesmo rodando de um worktree) ou o caminho/URL em `OPENAPI_SOURCE`, e grava `app/api/schema.d.ts`. O arquivo gerado é commitado e nunca editado à mão (RN-01.11).

O plugin `app/plugins/api.ts` expõe o cliente `openapi-fetch` (`app/api/client.ts`) como `$api`:

```ts
const { $api } = useNuxtApp()
const { data, error } = await $api.GET('/api/v1/admin/emails/usage')
if (error) mensagem.value = toApiError(error).message
```

- `credentials: 'include'`: a sessão vive nos cookies `httpOnly` do admin (`__Host-varal_admin_at` e `__Secure-varal_admin_rt`), nunca no JavaScript.
- `X-Device-Id` em toda requisição: UUID gerado uma vez e guardado no `localStorage` (`app/utils/device-id.ts`); se o armazenamento falhar, vale só enquanto a página estiver aberta.
- **Renovação:** um 401 dispara `POST /api/v1/admin/auth/refresh` com `fetch` direto, fora do middleware, e a requisição é repetida uma vez. Requisições simultâneas compartilham a mesma renovação. Login, renovação, logout, "esqueci a senha" e redefinição não disparam renovação. Se ela falhar, a sessão é limpa e a tela vai para `/entrar?voltar=...`.
- **Erros:** `toApiError()` (`app/utils/api-error.ts`) lê o `ErrorResponse` da API (`code` e `message` em português, campos de `VALIDATION_FAILED`) e traduz falha de rede.

## Sessão e telas

- Store Pinia `useSessionStore` (`app/stores/session.ts`): perfil de `GET /admin/auth/me`, `login`, `logout` e `changePassword`.
- Middleware global `app/middleware/auth.global.ts`: páginas exigem sessão por padrão; `definePageMeta({ access: 'guest' })` só sem sessão (`/entrar`, que manda o logado para `/`) e `access: 'public'` com ou sem (`/esqueci-a-senha`, `/definir-senha`).
- Rotas da spec 01, seção 14.1: `/entrar`, `/esqueci-a-senha` (mensagem sempre igual, RN-01.03), `/definir-senha` (lê `#token=...&tipo=convite|redefinicao`, guarda o token só em memória e apaga o fragmento da URL), `/`, `/organizacoes`, `/comunicados`, `/metricas`, `/emails`, `/auditoria`, `/usuarios` e `/papeis`. Telas sem API ainda mostram "Em construção".
- Início e E-mails mostram o consumo de e-mail do mês (`GET /admin/emails/usage`, RN-01.04): normal, alerta a partir de 8.000 e crítico em 10.000, sempre com texto e ícone.
- Troca de senha no menu do usuário (nome no rodapé da navegação lateral ou no cabeçalho do celular).
- Layout (`app/layouts/default.vue`): navegação lateral a partir de 1024 px; abaixo, cabeçalho e menu inferior com Início, Organizações, Comunicados e "Mais" (spec 08, seção 7).

## Testes de ponta a ponta

`pnpm test:e2e` roda o Playwright (projeto `desktop-chromium`) contra o admin em `http://localhost:$PORT` (sobe o `pnpm dev` se não estiver rodando) e uma API local com o seed (`admin@varal.local`, senha `varal12345`). Por depender da API e do banco, **não roda na CI**.

```sh
pnpm exec playwright install chromium   # uma vez por máquina
# no varal-web-api: scripts/worktree.sh new ... && pnpm dev, com a porta do admin em CORS_ORIGINS
# aqui: NUXT_PUBLIC_API_BASE_URL no .env.local apontando para essa API
pnpm test:e2e
E2E_MAILPIT_URL=http://localhost:8025 pnpm test:e2e   # inclui "esqueci a senha" pelo Mailpit
```

- Os testes rodam em série: a troca e a redefinição de senha encerram as outras sessões do admin. Ambos definem a mesma senha do seed, para o ambiente não mudar.
- O fluxo com Mailpit é opcional porque a API aceita no máximo 3 links de redefinição por usuário por hora (RN-01.02). Para os links apontarem para este worktree, use `ADMIN_URL=http://localhost:$PORT` no `.env.local` da API.
- A API limita troca e redefinição de senha a 10 requisições a cada 15 min por IP (`429 RATE_LIMITED`, contador em memória). Cada rodada usa 2 a 4; se várias rodadas seguidas derem 429, espere ou reinicie a API local.
- Outros usuários: `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD`.

## Identidade visual

- Tokens da spec 08 em `app/assets/css/tokens.css` (mesmos nomes `--color-*` do varal-panel-web).
- `app/assets/css/main.css` liga os tokens às variáveis `--ui-*` do Nuxt UI e define fontes e escala tipográfica.
- `app/app.config.ts` define as paletas e a forma dos componentes (alvos de 48 px, raios de 6/10/12 px, chips de status).
- Fontes locais via `@fontsource` (Atkinson Hyperlegible e Bricolage Grotesque); `@nuxt/fonts` e o modo de cor automático ficam desligados.
- Logo e ícones copiados de `varal-docs/docs/brand/` para `public/` (RN-08.01).
