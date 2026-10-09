<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  /** Path of the doc that explains this capability, shown so readers know where to go next. */
  doc?: string
}>()
</script>

<template>
  <section class="flex flex-col gap-3">
    <div>
      <h3 class="text-heading text-lg font-medium">
        {{ title }}
      </h3>
      <p v-if="description" class="text-muted text-sm">
        {{ description }}
      </p>
      <p v-if="doc" class="text-muted text-xs">
        {{ $t('examples.common.docs') }} <code>{{ doc }}</code>
      </p>
    </div>
    <slot />
  </section>
</template>
