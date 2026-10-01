#!/usr/bin/env node
/**
 * Gera `app/api/schema.d.ts` a partir do `openapi.json` do varal-web-api
 * (RN-01.11).
 *
 * Origem, nesta ordem:
 *   1. `OPENAPI_SOURCE` (caminho de arquivo ou URL http/https);
 *   2. `../varal-web-api/openapi.json`, ao lado do checkout principal deste
 *      repositório (funciona também de dentro de `.worktrees/<nome>`).
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'

const OUTPUT = resolve('app/api/schema.d.ts')

const HEADER = `/**
 * Arquivo gerado por \`pnpm gen:api\` (openapi-typescript) a partir do
 * \`openapi.json\` do varal-web-api. Não edite à mão (RN-01.11).
 */

`

/** Raiz do checkout principal (a pasta que contém o `.git` comum). */
function mainCheckoutRoot() {
  const commonDir = execFileSync(
    'git',
    ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    {
      encoding: 'utf8',
    },
  ).trim()
  return dirname(commonDir)
}

function resolveSource() {
  const fromEnv = process.env.OPENAPI_SOURCE
  if (fromEnv) {
    if (/^https?:\/\//.test(fromEnv)) return new URL(fromEnv)
    const path = resolve(fromEnv)
    if (!existsSync(path)) fail(`OPENAPI_SOURCE aponta para um arquivo que não existe: ${path}`)
    return pathToFileURL(path)
  }

  const path = resolve(mainCheckoutRoot(), '..', 'varal-web-api', 'openapi.json')
  if (!existsSync(path)) {
    fail(
      `não encontrei ${path}.\n` +
        'Clone o varal-web-api ao lado deste repositório ou defina OPENAPI_SOURCE ' +
        '(caminho ou URL do openapi.json).',
    )
  }
  return pathToFileURL(path)
}

function fail(message) {
  console.error(`gen:api: ${message}`)
  process.exit(1)
}

const source = resolveSource()
const ast = await openapiTS(source)
await mkdir(dirname(OUTPUT), { recursive: true })
await writeFile(OUTPUT, HEADER + astToString(ast))
console.log(`gen:api: ${OUTPUT} gerado a partir de ${source.href}`)
