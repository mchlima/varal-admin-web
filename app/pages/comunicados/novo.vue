<script setup lang="ts">
/** Novo comunicado: nasce como rascunho (RN-02.15). */
definePageMeta({ permission: 'announcements:manage' })
useHead({ title: 'Novo comunicado' })

const toast = useToast()

async function saved(announcement: Announcement, kind: 'draft' | 'published' | 'scheduled') {
  toast.add({ title: SAVED_MESSAGE[kind], icon: 'i-lucide-circle-check', color: 'success' })
  await navigateTo(`/comunicados/${announcement.id}`, { replace: true })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UButton
      to="/comunicados"
      color="neutral"
      variant="link"
      icon="i-lucide-arrow-left"
      label="Comunicados"
      class="self-start px-0"
    />
    <PageHeader
      title="Novo comunicado"
      description="Aparece numa faixa no topo do painel do dono até ele marcar como lido."
    />
    <AnnouncementEditor @saved="saved" />
  </div>
</template>
