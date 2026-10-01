#!/usr/bin/env bash
# Worktrees de desenvolvimento do varal-admin-web (spec 01, seção 4.1).
#
#   scripts/worktree.sh new <tipo>/<descricao>   cria ../.worktrees/<repositório>/<tipo>-<descricao>
#   scripts/worktree.sh list                     lista worktrees, branches e portas
#   scripts/worktree.sh remove <nome>            remove ../.worktrees/<repositório>/<nome>
#
# RN-01.07: cada worktree tem um .env.local com WORKTREE_SLUG e PORT_OFFSET.
# RN-01.08: porta do admin = 3200 + PORT_OFFSET; offset livre entre 1 e 99.
# RN-01.13: recusa criar worktree sem os hooks de bloqueio da main ativos.
set -euo pipefail

readonly BASE_PORT=3200
readonly DEFAULT_API_BASE_URL='http://localhost:3000'
readonly TYPES='feat|fix|docs|refactor|test|perf|style|build|ci|chore'

die() {
  echo "worktree.sh: $*" >&2
  exit 1
}

usage() {
  cat <<EOF
Uso:
  scripts/worktree.sh new <tipo>/<descricao>
  scripts/worktree.sh list
  scripts/worktree.sh remove <nome>

Tipos: ${TYPES//|/, }. Descrição em minúsculas, com hífens.
Exemplo: scripts/worktree.sh new feat/lista-de-organizacoes
EOF
}

# Raiz do checkout principal, mesmo quando chamado de dentro de um worktree.
main_root() {
  local common_dir
  common_dir="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" ||
    die 'rode dentro do repositório varal-admin-web'
  dirname "$common_dir"
}

# Os worktrees ficam fora do repositório, em <pasta comum>/.worktrees/<repositório>/<nome>
# (ex.: varal/.worktrees/varal-panel-web/feat-x). Dentro do repositório, ferramentas que
# sobem pelas pastas (Nuxt, Vite, TypeScript) encontrariam a configuração do checkout principal.
worktrees_dir() {
  local root="$1"
  printf '%s/.worktrees/%s' "$(dirname "$root")" "$(basename "$root")"
}

# Lê uma variável de um .env.local (formato CHAVE=valor, sem aspas).
env_value() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 0
  sed -n "s/^${key}=//p" "$file" | tail -n 1
}

next_free_offset() {
  local root="$1" offset file used=' '
  for file in "$(worktrees_dir "$root")"/*/.env.local; do
    [[ -f "$file" ]] || continue
    used+="$(env_value "$file" PORT_OFFSET) "
  done
  for offset in $(seq 1 99); do
    if [[ "$used" != *" $offset "* ]]; then
      echo "$offset"
      return 0
    fi
  done
  die 'não há PORT_OFFSET livre entre 1 e 99; remova worktrees antigos'
}

cmd_new() {
  local branch="${1:-}"
  [[ -n "$branch" ]] || {
    usage
    exit 1
  }
  [[ "$branch" =~ ^($TYPES)/[a-z0-9]+(-[a-z0-9]+)*$ ]] ||
    die "nome de branch inválido: '$branch' (use <tipo>/<descricao-com-hifens>)"

  local root
  root="$(main_root)"

  # RN-01.13: os hooks que bloqueiam commit e push na main precisam estar ativos.
  local hooks_path
  hooks_path="$(git -C "$root" config --get core.hooksPath || true)"
  if [[ "$hooks_path" != '.githooks' ]]; then
    die "os git hooks de bloqueio da main não estão ativos neste clone.
Ative uma vez com:
  git -C '$root' config core.hooksPath .githooks"
  fi

  local slug="${branch/\//-}"
  local path="$(worktrees_dir "$root")/$slug"
  [[ ! -e "$path" ]] || die "o worktree $path já existe"
  if git -C "$root" show-ref --verify --quiet "refs/heads/$branch"; then
    die "a branch $branch já existe; escolha outro nome ou use o worktree dela"
  fi

  local offset port
  offset="$(next_free_offset "$root")"
  port=$((BASE_PORT + offset))

  echo "→ Buscando origin/main"
  git -C "$root" fetch origin main

  echo "→ Criando $path na branch $branch"
  git -C "$root" worktree add "$path" -b "$branch" origin/main

  cat >"$path/.env.local" <<EOF
# Gerado por scripts/worktree.sh (RN-01.07). Fora do git.
WORKTREE_SLUG=$slug
PORT_OFFSET=$offset
PORT=$port
NUXT_PUBLIC_API_BASE_URL=$DEFAULT_API_BASE_URL
EOF

  echo "→ Instalando dependências"
  (cd "$path" && pnpm install --frozen-lockfile)

  cat <<EOF

Worktree pronto.
  Pasta:  $path
  Branch: $branch
  Porta:  $port (PORT_OFFSET=$offset)
  API:    $DEFAULT_API_BASE_URL (ajuste NUXT_PUBLIC_API_BASE_URL no .env.local)

Para subir: cd '$path' && pnpm dev
EOF
}

cmd_list() {
  local root
  root="$(main_root)"

  printf '%-40s %-40s %-6s %s\n' 'WORKTREE' 'BRANCH' 'PORTA' 'API'
  local line path='' branch=''
  while IFS= read -r line || [[ -n "$path" ]]; do
    case "$line" in
      'worktree '*) path="${line#worktree }" ;;
      'branch '*) branch="${line#branch refs/heads/}" ;;
      'detached') branch='(detached)' ;;
      '')
        if [[ -n "$path" ]]; then
          local env_file="$path/.env.local" offset port api name
          offset="$(env_value "$env_file" PORT_OFFSET)"
          port="$(env_value "$env_file" PORT)"
          [[ -n "$port" ]] || port=$((BASE_PORT + ${offset:-0}))
          api="$(env_value "$env_file" NUXT_PUBLIC_API_BASE_URL)"
          if [[ "$path" == "$root" ]]; then name='(principal)'; else name="${path#"$(worktrees_dir "$root")"/}"; fi
          printf '%-40s %-40s %-6s %s\n' "$name" "${branch:-?}" "$port" "${api:-$DEFAULT_API_BASE_URL}"
        fi
        path=''
        branch=''
        ;;
    esac
  done < <(git -C "$root" worktree list --porcelain && echo)
}

cmd_remove() {
  local name="${1:-}"
  [[ -n "$name" ]] || {
    usage
    exit 1
  }
  [[ "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "nome inválido: '$name' (ex.: feat-lista-de-organizacoes)"

  local root path
  root="$(main_root)"
  path="$(worktrees_dir "$root")/$name"
  [[ -d "$path" ]] || die "não existe worktree em $path"

  if [[ -n "$(git -C "$path" status --porcelain)" ]]; then
    die "$name tem alterações sem commit; faça commit ou descarte antes de remover"
  fi

  local branch
  branch="$(git -C "$path" branch --show-current)"
  git -C "$root" worktree remove "$path"
  echo "Worktree $name removido. A branch ${branch:-?} foi mantida."
}

main() {
  local command="${1:-}"
  shift || true
  case "$command" in
    new) cmd_new "$@" ;;
    list) cmd_list ;;
    remove) cmd_remove "$@" ;;
    -h | --help | help | '') usage ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
