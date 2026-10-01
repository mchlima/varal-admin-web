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
| `scripts/worktree.sh` | Cria, lista e remove worktrees de desenvolvimento (veja abaixo)        |

## Ambiente

Variáveis em [`.env.example`](.env.example). Em desenvolvimento, o `nuxt.config.ts` lê o `.env.local` do worktree.

- `PORT_OFFSET` e `PORT`: porta do dev server, `3200 + PORT_OFFSET` (RN-01.08).
- `NUXT_PUBLIC_API_BASE_URL`: URL da API, fixada no build. Padrão `http://localhost:3000`; produção `https://api-web-varal.kratinho.com.br`.

## Worktrees

Cada tarefa roda num worktree próprio em `.worktrees/` (spec 01, seção 4.1):

```sh
scripts/worktree.sh new feat/lista-de-organizacoes   # cria .worktrees/feat-lista-de-organizacoes
scripts/worktree.sh list                             # worktrees, branches e portas
scripts/worktree.sh remove feat-lista-de-organizacoes
```

O `new` exige `core.hooksPath=.githooks`, cria a branch a partir de `origin/main`, escolhe o menor `PORT_OFFSET` livre (1 a 99), gera o `.env.local` e roda `pnpm install`. O `remove` recusa worktrees com alterações sem commit e mantém a branch.

## Cliente da API

`pnpm gen:api` lê `../varal-web-api/openapi.json` (ao lado do checkout principal, mesmo rodando de um worktree) ou o caminho/URL em `OPENAPI_SOURCE`, e grava `app/api/schema.d.ts`. O arquivo gerado é commitado e nunca editado à mão (RN-01.11).

O plugin `app/plugins/api.ts` expõe o cliente `openapi-fetch` como `$api`, com `credentials: 'include'`:

```ts
const { $api } = useNuxtApp()
const { data, error } = await $api.GET('/api/v1/...')
```

## Identidade visual

- Tokens da spec 08 em `app/assets/css/tokens.css` (mesmos nomes `--color-*` do varal-panel-web).
- `app/assets/css/main.css` liga os tokens às variáveis `--ui-*` do Nuxt UI e define fontes e escala tipográfica.
- `app/app.config.ts` define as paletas e a forma dos componentes (alvos de 48 px, raios de 6/10/12 px, chips de status).
- Fontes locais via `@fontsource` (Atkinson Hyperlegible e Bricolage Grotesque); `@nuxt/fonts` e o modo de cor automático ficam desligados.
- Logo e ícones copiados de `varal-docs/docs/brand/` para `public/` (RN-08.01).
