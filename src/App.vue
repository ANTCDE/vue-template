<script setup lang="ts">
import { computed, ref } from 'vue'
import { examples } from '@/examples'
import { injectContext } from '@/plugins/context'

// `isDark` rather than the raw mode: the raw mode can be 'auto', which is not a Vuetify theme.
const { colorMode } = injectContext()
const theme = computed(() => colorMode.isDark.value ? 'dark' : 'light')

const tab = ref(examples[0]?.id)
</script>

<template>
  <v-app :theme="theme">
    <v-app-bar density="compact" flat border="b">
      <v-tabs v-model="tab" color="primary">
        <v-tab v-for="example in examples" :key="example.id" :value="example.id" :text="$t(example.titleKey)" />
      </v-tabs>
    </v-app-bar>

    <v-main class="h-full">
      <v-tabs-window v-model="tab" class="h-full">
        <v-tabs-window-item v-for="example in examples" :key="example.id" :value="example.id" class="h-full overflow-y-auto">
          <component :is="example.component" />
        </v-tabs-window-item>
      </v-tabs-window>
    </v-main>
  </v-app>
</template>
