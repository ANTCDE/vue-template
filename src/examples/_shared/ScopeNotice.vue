<script setup lang="ts">
// Shown instead of an example when the OS has no license/project selected yet.
defineProps<{ needs: 'license' | 'project' }>()
</script>

<template>
  <v-alert type="info" variant="tonal" density="compact" :text="$t(`examples.common.needs.${needs}`)" />
</template>
