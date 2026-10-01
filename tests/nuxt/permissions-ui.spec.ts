import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import DefaultLayout from '~/layouts/default.vue'
import NewOrganizationPage from '~/pages/organizacoes/nova.vue'
import OrganizationsPage from '~/pages/organizacoes/index.vue'
import type { Permission } from '~/utils/permissions'

const READ_ONLY: Permission[] = ['organizations:read', 'announcements:read', 'metrics:read']

function signIn(permissions: Permission[]) {
  const session = useSessionStore()
  session.admin = {
    id: '0192f000-0000-7000-8000-000000000001',
    name: 'Ana Leitura',
    email: 'ana@varal.local',
  }
  session.permissions = permissions
  session.status = 'authenticated'
}

afterEach(() => {
  useSessionStore().clear()
})

async function mountLayout(route: string) {
  return mountSuspended(DefaultLayout, {
    route,
    slots: { default: () => h('p', { 'data-testid': 'page' }, 'conteúdo da tela') },
  })
}

describe('permissões na interface (RN-02.01)', () => {
  it('CA-02.01: Leitura não vê Usuários, Papéis, Auditoria, E-mails nem Acessos no menu', async () => {
    signIn(READ_ONLY)
    const layout = await mountLayout('/')
    const links = layout.findAll('aside nav a').map((link) => link.text())
    expect(links).toEqual(['Início', 'Organizações', 'Comunicados', 'Métricas'])
    expect(layout.find('[data-testid="page"]').exists()).toBe(true)
  })

  it('Super admin vê todos os itens', async () => {
    signIn([
      'admin.users:manage',
      'admin.roles:manage',
      'organizations:read',
      'announcements:read',
      'metrics:read',
      'impersonation:use',
      'emails:read',
      'audit:read',
    ])
    const layout = await mountLayout('/')
    expect(layout.findAll('aside nav a')).toHaveLength(9)
  })

  it('tela sem a permissão mostra o aviso no lugar do conteúdo', async () => {
    signIn(READ_ONLY)
    const layout = await mountLayout('/auditoria')
    expect(layout.find('[data-testid="page"]').exists()).toBe(false)
    expect(layout.get('[data-testid="no-permission"]').text()).toContain('Sem acesso a esta tela')
  })

  it('CA-02.01: Leitura não vê o botão "Nova organização"', async () => {
    signIn(READ_ONLY)
    const page = await mountSuspended(OrganizationsPage, { route: '/organizacoes' })
    expect(page.text()).not.toContain('Nova organização')
  })

  it('CA-02.02: com a avulsa organizations:create, o botão aparece', async () => {
    signIn([...READ_ONLY, 'organizations:create'])
    const page = await mountSuspended(OrganizationsPage, { route: '/organizacoes' })
    expect(page.text()).toContain('Nova organização')
  })
})

describe('formulário de nova organização (RN-02.09)', () => {
  it('valida os campos em português antes de chamar a API', async () => {
    signIn([...READ_ONLY, 'organizations:create'])
    const page = await mountSuspended(NewOrganizationPage, { route: '/organizacoes/nova' })
    await page.get('form').trigger('submit')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 50))
    const text = page.text()
    expect(text).toContain('Informe o nome da organização.')
    expect(text).toContain('Informe o nome da primeira unidade.')
    expect(text).toContain('Informe o nome do dono.')
    expect(text).toContain('Informe o e-mail.')
  })
})
