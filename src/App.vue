<script setup lang="ts">
import {ref, watch} from 'vue'
import {injectContext} from "./plugins/context.ts";
import {useTheme} from "vuetify";
import Main from "./components/Main.vue";

const {colorMode} = injectContext()
const theme = useTheme();

watch(
    colorMode.isDark,
    isDark => theme.change(isDark ? 'dark' : 'light'),
    {immediate: true}
)

const tab = ref('main')
</script>

<template>
  <v-app>
    <v-app-bar density="compact" color="primary">
      <v-tabs v-model="tab" >
        <v-tab value="main">Main</v-tab>
      </v-tabs>
    </v-app-bar>

    <v-main class="h-100">
      <v-tabs-window v-model="tab" class="h-100">
        <v-tabs-window-item value="main" class="h-100 overflow-y-auto">
          <Main/>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-main>
  </v-app>
</template>
