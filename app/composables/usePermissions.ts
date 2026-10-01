/**
 * Permissões do admin logado na interface (RN-02.01): lê as permissões
 * efetivas de `GET /admin/auth/me` (papéis + avulsas, RN-02.02) e diz se uma
 * tela ou ação aparece. Esconder é só conforto: quem decide é a API, que
 * responde 403; nesse caso o plugin da API relê as permissões e a mensagem
 * vem de `describeApiError`.
 */
export function usePermissions() {
  const session = useSessionStore()

  const effective = computed(() => new Set<Permission>(session.permissions))

  /** Tem pelo menos uma das permissões pedidas (como o `@RequirePermission`). */
  function can(required: PermissionRequirement | undefined): boolean {
    return hasPermission(effective.value, required)
  }

  return { permissions: effective, can }
}
