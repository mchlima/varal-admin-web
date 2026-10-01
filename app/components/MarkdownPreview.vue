<script setup lang="ts">
/** Prévia do texto de um comunicado (markdown simples, já escapado). */
const props = defineProps<{ source: string }>()
const html = computed(() => renderMarkdown(props.source))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- saída escapada por renderMarkdown -->
  <div class="markdown flex flex-col gap-3" v-html="html" />
</template>

<style scoped>
.markdown :deep(ul) {
  list-style: disc;
  padding-inline-start: 1.5rem;
}
.markdown :deep(ol) {
  list-style: decimal;
  padding-inline-start: 1.5rem;
}
.markdown :deep(a) {
  color: var(--color-primary-deep);
  font-weight: 700;
  text-decoration: underline;
}
.markdown :deep(strong) {
  font-weight: 700;
}
</style>
