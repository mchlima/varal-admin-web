/**
 * Abre o link do "entrar como" (RN-02.21) numa nova aba.
 *
 * O navegador só deixa abrir abas no clique; como o link vem depois da
 * chamada à API, a aba é aberta vazia no clique (`prepareTab`) e recebe o
 * endereço quando a resposta chega (`navigateTab`). Se o navegador bloquear,
 * a tela mostra o link para abrir à mão.
 */
export interface PendingTab {
  navigate: (url: string) => boolean
  close: () => void
}

export function prepareTab(open: typeof window.open = window.open.bind(window)): PendingTab {
  let tab: Window | null = null
  try {
    tab = open('', '_blank')
    // A aba nova não precisa enxergar o admin
    if (tab) tab.opener = null
  } catch {
    tab = null
  }
  return {
    navigate(url) {
      if (!tab || tab.closed) return false
      tab.location.replace(url)
      return true
    },
    close() {
      if (tab && !tab.closed) tab.close()
    },
  }
}
