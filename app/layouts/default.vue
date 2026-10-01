<script setup lang="ts">
/**
 * Layout das telas logadas (spec 08, seção 7): navegação lateral a partir de
 * 1024 px; abaixo disso, cabeçalho com o menu do usuário e menu inferior com
 * os três primeiros itens e "Mais".
 */
const route = useRoute()
const moreOpen = ref(false)

const primaryItems = NAVIGATION.filter((item) => item.primary)
const secondaryItems = NAVIGATION.filter((item) => !item.primary)
const moreActive = computed(() =>
  secondaryItems.some((item) => isNavigationActive(item, route.path)),
)

watch(
  () => route.fullPath,
  () => {
    moreOpen.value = false
  },
)
</script>

<template>
  <div class="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
    <a
      href="#conteudo"
      class="sr-only z-50 rounded-(--radius-control) bg-(--color-surface) px-4 py-3 font-bold focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >Pular para o conteúdo</a
    >

    <!-- Navegação lateral (≥ 1024 px) -->
    <aside
      class="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-(--color-border) bg-(--color-surface) px-3 py-5 lg:flex"
    >
      <NuxtLink to="/" class="px-3" aria-label="Varal Admin, início">
        <img src="/logo.svg" alt="" width="114" height="38" class="h-9 w-auto" />
        <span class="mt-1 block text-xs font-bold tracking-wide text-(--color-text-muted) uppercase"
          >Admin</span
        >
      </NuxtLink>

      <nav aria-label="Navegação principal" class="flex-1 overflow-y-auto">
        <ul class="flex flex-col gap-1">
          <li v-for="item in NAVIGATION" :key="item.to">
            <NuxtLink
              :to="item.to"
              :aria-current="isNavigationActive(item, route.path) ? 'page' : undefined"
              class="flex min-h-(--size-touch-min) items-center gap-3 rounded-(--radius-control) px-3 font-bold text-(--color-text) hover:bg-(--color-surface-muted)"
              :class="{
                'bg-(--color-primary-soft) text-(--color-primary-deep) hover:bg-(--color-primary-soft)':
                  isNavigationActive(item, route.path),
              }"
            >
              <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <UserMenu />
    </aside>

    <div class="flex min-h-dvh min-w-0 flex-col">
      <!-- Cabeçalho do celular e tablet (< 1024 px) -->
      <header
        class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-4 lg:hidden"
      >
        <NuxtLink to="/" class="flex items-end gap-2" aria-label="Varal Admin, início">
          <img src="/logo.svg" alt="" width="96" height="32" class="h-8 w-auto" />
          <span class="text-xs font-bold tracking-wide text-(--color-text-muted) uppercase"
            >Admin</span
          >
        </NuxtLink>
        <UserMenu compact />
      </header>

      <main
        id="conteudo"
        tabindex="-1"
        class="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 lg:px-8 lg:py-8"
      >
        <slot />
      </main>
    </div>

    <!-- Menu inferior (< 1024 px) -->
    <nav
      aria-label="Navegação principal"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-(--color-border) bg-(--color-surface) pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul class="grid grid-cols-4">
        <li v-for="item in primaryItems" :key="item.to">
          <NuxtLink
            :to="item.to"
            :aria-current="isNavigationActive(item, route.path) ? 'page' : undefined"
            class="flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-bold text-(--color-text-muted)"
            :class="{ 'text-(--color-primary-deep)': isNavigationActive(item, route.path) }"
          >
            <span
              class="grid h-7 w-12 place-items-center rounded-full"
              :class="{ 'bg-(--color-primary-soft)': isNavigationActive(item, route.path) }"
            >
              <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
            </span>
            <span class="max-w-full text-center leading-tight break-words">{{ item.label }}</span>
          </NuxtLink>
        </li>
        <li>
          <button
            type="button"
            class="flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-xs font-bold text-(--color-text-muted)"
            :class="{ 'text-(--color-primary-deep)': moreActive }"
            :aria-expanded="moreOpen"
            aria-controls="menu-mais"
            @click="moreOpen = true"
          >
            <span
              class="grid h-7 w-12 place-items-center rounded-full"
              :class="{ 'bg-(--color-primary-soft)': moreActive }"
            >
              <UIcon name="i-lucide-ellipsis" class="size-5" aria-hidden="true" />
            </span>
            Mais
          </button>
        </li>
      </ul>
    </nav>

    <UDrawer
      v-model:open="moreOpen"
      title="Mais opções"
      :ui="{ body: 'pb-[env(safe-area-inset-bottom)]' }"
    >
      <template #body>
        <ul id="menu-mais" class="flex flex-col gap-1">
          <li v-for="item in secondaryItems" :key="item.to">
            <NuxtLink
              :to="item.to"
              :aria-current="isNavigationActive(item, route.path) ? 'page' : undefined"
              class="flex min-h-(--size-touch-min) items-center gap-3 rounded-(--radius-control) px-3 font-bold"
              :class="{
                'bg-(--color-primary-soft) text-(--color-primary-deep)': isNavigationActive(
                  item,
                  route.path,
                ),
              }"
            >
              <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </template>
    </UDrawer>
  </div>
</template>
