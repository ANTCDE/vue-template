<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import ExampleSection from '@/examples/_shared/ExampleSection.vue'
import { injectContext } from '@/plugins/context'

// Declared under signals.topics in app-config.json. See docs/signals-and-realtime.md.
const TOPIC = 'template-note-selected'

const { comms: { signal }, i18n: { t } } = injectContext()

const message = ref('')
const received = ref<string[]>([])

function publish() {
  if (!message.value.trim())
    return
  // Delivered to every OTHER app on the topic in this project — never back to the sender.
  signal({ topic: { name: TOPIC, scope: 'project', data: { message: message.value.trim() } } })
  message.value = ''
}

const stop = signal.receive((s) => {
  if (s.topic?.name === TOPIC && typeof s.topic.data?.message === 'string')
    received.value = [s.topic.data.message, ...received.value].slice(0, 10)
})
onScopeDispose(() => stop())

// Split screen: open another app next to this one. A real app should pass `app: { id }` (stable);
// this demo takes a title only because it can't know the ids of apps installed on your license.
const splitTitle = ref('')
function openSplit() {
  if (splitTitle.value.trim())
    signal({ openSplit: { app: { title: splitTitle.value.trim() }, pane: 1, layout: 'v' } })
}
</script>

<template>
  <div class="flex flex-col gap-8 p-6">
    <ExampleSection :title="t('examples.signals.topicTitle')" :description="t('examples.signals.topicDescription', { topic: TOPIC })" doc="docs/signals-and-realtime.md">
      <form class="flex gap-2" @submit.prevent="publish">
        <v-text-field v-model="message" :label="t('examples.signals.message')" density="compact" hide-details />
        <v-btn type="submit" color="primary" :disabled="!message.trim()" :text="t('examples.signals.publish')" />
      </form>
      <v-list density="compact" border rounded>
        <v-list-item v-for="(item, index) in received" :key="index" :title="item" prepend-icon="mdi-message-arrow-left-outline" />
        <v-list-item v-if="received.length === 0" :title="t('examples.signals.nothingReceived')" />
      </v-list>
    </ExampleSection>

    <ExampleSection :title="t('examples.signals.splitTitle')" :description="t('examples.signals.splitDescription')">
      <form class="flex gap-2" @submit.prevent="openSplit">
        <v-text-field v-model="splitTitle" :label="t('examples.signals.appTitle')" density="compact" hide-details />
        <v-btn type="submit" variant="outlined" :disabled="!splitTitle.trim()" :text="t('examples.signals.openSplit')" />
      </form>
    </ExampleSection>
  </div>
</template>
