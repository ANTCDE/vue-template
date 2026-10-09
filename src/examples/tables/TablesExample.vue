<script setup lang="ts">
import type { Note } from './useNotes'
import { ref, watch } from 'vue'
import ExampleSection from '@/examples/_shared/ExampleSection.vue'
import ScopeNotice from '@/examples/_shared/ScopeNotice.vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'
import { NOTES_TABLE, useNotes } from './useNotes'

const { comms: { context, signal }, i18n: { t } } = injectContext()
const { projectId } = useGlobalStore()
const { state, notes, total, page, pageCount, isLoading, creatingTable, canCreate, canDelete, canCreateTable, create, remove, createTableForDevelopment } = useNotes()

const newTitle = ref('')

async function submit() {
  const title = newTitle.value.trim()
  if (!title)
    return
  await create(title)
  newTitle.value = ''
}

// Deep link: `noteId` is declared under capabilities.queryParams in app-config.json.
// Read it once from initialRouteQuery (signals sent before the handshake are lost),
// then mirror every change back to the OS URL with a `route` signal.
const selectedId = ref<string | null>(context.value.initialRouteQuery?.noteId ?? null)
watch(selectedId, noteId => signal({ route: { query: { noteId } } }))

function select(note: Note) {
  selectedId.value = selectedId.value === note.id ? null : note.id
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <ExampleSection
      :title="t('examples.tables.title')"
      :description="t('examples.tables.description', { table: NOTES_TABLE })"
      doc="docs/capabilities/tables.md"
    >
      <ScopeNotice v-if="!projectId" needs="project" />

      <!-- Declared tables exist only after the app is activated in the project. -->
      <v-alert
        v-else-if="state === 'missing'"
        type="warning"
        variant="tonal"
        :title="t('examples.tables.missingTitle', { table: NOTES_TABLE })"
      >
        <p class="text-sm">
          {{ t('examples.tables.missingText') }}
        </p>
        <v-btn
          v-if="canCreateTable"
          class="mt-3"
          variant="outlined"
          :loading="creatingTable"
          :text="t('examples.tables.createForDevelopment')"
          @click="createTableForDevelopment"
        />
      </v-alert>

      <template v-else-if="state === 'ready'">
        <form class="flex gap-2" @submit.prevent="submit">
          <v-text-field
            v-model="newTitle"
            :label="t('examples.tables.newTitle')"
            density="compact"
            hide-details
            :disabled="!canCreate"
          />
          <v-btn type="submit" color="primary" :disabled="!canCreate || !newTitle.trim()" :text="t('examples.tables.add')" />
        </form>

        <v-list density="compact" border rounded>
          <v-list-item
            v-for="note in notes"
            :key="note.id"
            :title="note.title"
            :subtitle="note.status ?? undefined"
            :active="note.id === selectedId"
            @click="select(note)"
          >
            <template #append>
              <v-btn
                v-if="canDelete"
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                :aria-label="t('examples.tables.delete', { title: note.title })"
                @click.stop="remove(note)"
              />
            </template>
          </v-list-item>
          <v-list-item v-if="!isLoading && notes.length === 0" :title="t('examples.tables.empty')" />
        </v-list>

        <div class="flex items-center justify-between">
          <span class="text-muted text-sm">{{ t('examples.tables.total', { count: total }) }}</span>
          <v-pagination v-model="page" :length="pageCount" density="compact" total-visible="5" />
        </div>
      </template>

      <v-progress-linear v-else indeterminate color="primary" :aria-label="t('examples.common.loading')" />
    </ExampleSection>
  </div>
</template>
