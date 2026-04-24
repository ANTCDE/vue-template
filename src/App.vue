<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import { injectContext } from '@/plugins/context'
import Main from '@/components/Main.vue'

// Sync Vuetify theme with ANT-OS color mode preference
const { colorMode } = injectContext()
const theme = useTheme()

watch(
  colorMode.isDark,
  isDark => theme.change(isDark ? 'dark' : 'light'),
  { immediate: true },
)

const tab = ref('main')
</script>

<template>
  <v-app>
    <v-app-bar density="compact" color="primary">
      <v-tabs v-model="tab">
        <v-tab value="main" :text="$t('app.title')" />
      </v-tabs>
    </v-app-bar>

    <v-main class="h-full">
      <v-tabs-window v-model="tab" class="h-full">
        <v-tabs-window-item value="main" class="h-full overflow-y-auto">
          <Main />
        </v-tabs-window-item>
      </v-tabs-window>
    </v-main>
  </v-app>
</template>
