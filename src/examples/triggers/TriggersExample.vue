<script setup lang="ts">
import type { Trigger } from '@antcde/connect-ts'
import { computed, ref } from 'vue'
import ExampleSection from '@/examples/_shared/ExampleSection.vue'
import ScopeNotice from '@/examples/_shared/ScopeNotice.vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'
import { useTriggerRunner } from './useTriggerRunner'

const { i18n: { t } } = injectContext()
const { scope } = useGlobalStore()
const { triggers, isLoading, running, result, failure, run } = useTriggerRunner()

const selected = ref<Trigger | null>(null)
const resultText = computed(() => result.value === null ? '' : JSON.stringify(result.value, null, 2))
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <ExampleSection :title="t('examples.triggers.title')" :description="t('examples.triggers.description')" doc="docs/capabilities/triggers.md">
      <ScopeNotice v-if="!scope" needs="license" />

      <template v-else>
        <div class="flex gap-2">
          <v-select
            v-model="selected"
            :items="triggers"
            item-title="name"
            return-object
            :label="t('examples.triggers.pick')"
            :loading="isLoading"
            density="compact"
            hide-details
            autocomplete="off"
            aria-autocomplete="none"
          />
          <v-btn color="primary" :loading="running" :disabled="!selected" :text="t('examples.triggers.run')" @click="selected && run(selected)" />
        </div>

        <v-alert v-if="failure" type="error" variant="tonal" density="compact" :text="failure" />
        <pre v-if="resultText" class="bg-ant-inset text-body overflow-auto rounded p-3 text-xs">{{ resultText }}</pre>
      </template>
    </ExampleSection>
  </div>
</template>
