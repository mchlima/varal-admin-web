/**
 * Tema do Nuxt UI com a identidade visual da spec 08.
 *
 * As cores vêm dos tokens `--color-*` (`assets/css/tokens.css`), ligados às
 * variáveis `--ui-*` em `assets/css/main.css`. Aqui ficam as paletas e os
 * ajustes de forma dos componentes: alvos de toque, raios e foco.
 */
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'raspberry',
      success: 'green',
      warning: 'amber',
      error: 'red',
      neutral: 'sage',
    },
    button: {
      slots: {
        // Alvo de toque mínimo de 48 px e cantos de 10 px (spec 08, seções 2 e 6)
        base: 'min-h-(--size-touch-min) min-w-(--size-touch-min) justify-center rounded-(--radius-control) font-bold',
      },
      variants: {
        size: {
          xs: { base: 'px-3 text-sm' },
          sm: { base: 'px-3 text-sm' },
          md: { base: 'px-4 text-base' },
          lg: { base: 'px-5 text-base' },
          xl: { base: 'px-6 text-base' },
        },
      },
      compoundVariants: [
        {
          // Botão principal: 52 px, texto branco 17 px negrito (spec 08, seção 6)
          color: 'primary',
          variant: 'solid',
          class:
            'min-h-(--size-button-primary-min) text-(--color-primary-ink) hover:bg-(--color-primary-deep) active:bg-(--color-primary-deep)',
        },
        {
          // Botão secundário: contorno de 2 px na primária, texto primary-deep
          color: 'primary',
          variant: 'outline',
          class:
            'ring-2 ring-primary text-(--color-primary-deep) hover:bg-(--color-primary-soft) active:bg-(--color-primary-soft)',
        },
        {
          color: 'primary',
          variant: 'soft',
          class:
            'bg-(--color-primary-soft) text-(--color-primary-deep) hover:bg-(--color-primary-soft) active:bg-(--color-primary-soft)',
        },
        {
          color: 'primary',
          variant: 'link',
          class: 'text-(--color-primary-deep)',
        },
      ],
    },
    input: {
      slots: {
        base: 'min-h-(--size-touch-min) rounded-(--radius-control)',
      },
      variants: {
        size: {
          md: { base: 'text-base' },
          lg: { base: 'text-base' },
          xl: { base: 'text-base' },
        },
      },
    },
    textarea: {
      slots: {
        base: 'rounded-(--radius-control) text-base',
      },
    },
    select: {
      slots: {
        base: 'min-h-(--size-touch-min) rounded-(--radius-control)',
      },
    },
    selectMenu: {
      slots: {
        base: 'min-h-(--size-touch-min) rounded-(--radius-control)',
      },
    },
    card: {
      slots: {
        // Cartão com cantos de 12 px, borda fina e sem sombra (spec 08, seção 6)
        root: 'rounded-(--radius-card) shadow-none',
        title: 'font-heading',
      },
    },
    badge: {
      slots: {
        // Chip de status: cantos de 6 px, maiúsculas com espaçamento leve
        base: 'rounded-(--radius-chip) font-bold uppercase tracking-wide',
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: 'solid',
          class: 'bg-(--color-status-new-bg) text-(--color-status-new-text)',
        },
        {
          color: 'warning',
          variant: 'soft',
          class: 'bg-(--color-status-preparing-bg) text-(--color-status-preparing-text)',
        },
        {
          color: 'success',
          variant: 'soft',
          class: 'bg-(--color-status-ready-bg) text-(--color-status-ready-text)',
        },
        {
          color: 'error',
          variant: 'soft',
          class: 'bg-(--color-status-late-bg) text-(--color-status-late-text)',
        },
        {
          color: 'neutral',
          variant: 'soft',
          class: 'bg-(--color-status-cancelled-bg) text-(--color-status-cancelled-text)',
        },
      ],
    },
  },
})
