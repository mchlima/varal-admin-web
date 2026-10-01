<script setup lang="ts">
/**
 * Consumo de e-mail do mês (RN-01.04, CA-01.09): contagem, limite, barra e
 * o nível vindo da API (`ok`, `warning` a partir de 80%, `critical` em 100%),
 * com texto e ícone além da cor.
 */
const props = defineProps<{ usage: EmailUsage }>()

const level = computed(() => EMAIL_USAGE_LEVELS[props.usage.level])
const percent = computed(() => usagePercent(props.usage))
const warningPercent = computed(() =>
  props.usage.limit > 0
    ? Math.min(100, (props.usage.warningThreshold / props.usage.limit) * 100)
    : 0,
)
</script>

<template>
  <UCard
    :data-level="usage.level"
    :class="{
      'border-l-4 border-l-(--color-status-preparing-text)': usage.level === 'warning',
      'border-l-4 border-l-(--color-status-late-text)': usage.level === 'critical',
    }"
  >
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold">E-mails do mês</h2>
          <p class="text-sm text-(--color-text-muted) first-letter:uppercase">
            {{ formatMonth(usage.month) }}
          </p>
        </div>
        <UBadge
          :color="level.badgeColor"
          variant="soft"
          size="lg"
          :icon="level.icon"
          :label="level.label"
          data-testid="email-usage-level"
        />
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <p class="tabular-nums">
        <span class="font-heading text-2xl font-extrabold">{{ formatCount(usage.count) }}</span>
        <span class="text-(--color-text-muted)"> de {{ formatCount(usage.limit) }} envios</span>
        <span class="text-(--color-text-muted)"> ({{ percent }}%)</span>
      </p>

      <div
        role="progressbar"
        aria-label="Envios de e-mail no mês"
        :aria-valuenow="usage.count"
        aria-valuemin="0"
        :aria-valuemax="usage.limit"
        :aria-valuetext="`${formatCount(usage.count)} de ${formatCount(usage.limit)} envios`"
        class="relative h-3 overflow-hidden rounded-full bg-(--color-border)"
      >
        <div
          class="h-full rounded-full"
          :class="level.barClass"
          :style="{ width: `${percent}%` }"
        />
        <!-- Marca dos 80% (início do alerta) -->
        <div
          class="absolute inset-y-0 w-0.5 bg-(--color-text)"
          :style="{ left: `${warningPercent}%` }"
          aria-hidden="true"
        />
      </div>

      <p
        :role="usage.level === 'ok' ? undefined : 'status'"
        class="flex items-start gap-2"
        :class="usage.level === 'ok' ? 'text-(--color-text-muted)' : 'font-bold'"
        data-testid="email-usage-message"
      >
        <UIcon :name="level.icon" class="mt-1 size-5 shrink-0" aria-hidden="true" />
        <span>{{ usageMessage(usage) }}</span>
      </p>
    </div>
  </UCard>
</template>
