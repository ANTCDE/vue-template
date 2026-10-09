<script setup lang="ts">
import type { Task } from '@antcde/connect-ts'
import ExampleSection from '@/examples/_shared/ExampleSection.vue'
import ScopeNotice from '@/examples/_shared/ScopeNotice.vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'
import { useOpenTasks } from './useOpenTasks'

const { comms: { notepad, signal }, i18n: { t } } = injectContext()
const { licenseId, projectReadOnly } = useGlobalStore()
const { tasks, isLoading, setStatus } = useOpenTasks()

// Don't build task detail screens — the OS notepad already has one.
function open(task: Task) {
  notepad.showTask({ id: task.id })
}

// A task with subtasks is a workflow; the OS flow window shows and edits it.
function openFlow(task: Task) {
  signal({ openFlow: { taskId: task.id, title: task.title } })
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <ExampleSection :title="t('examples.tasks.title')" :description="t('examples.tasks.description')" doc="docs/capabilities/tasks-and-workflows.md">
      <ScopeNotice v-if="!licenseId" needs="license" />

      <v-list v-else density="compact" border rounded>
        <v-list-item
          v-for="task in tasks"
          :key="task.id"
          :title="task.title"
          :subtitle="task.task_project?.name ?? t('examples.tasks.licenseTask')"
          @click="open(task)"
        >
          <template #append>
            <v-btn
              v-if="task.hasChildren"
              icon="mdi-sitemap-outline"
              variant="text"
              size="small"
              :aria-label="t('examples.tasks.openFlow', { title: task.title })"
              @click.stop="openFlow(task)"
            />
            <v-btn
              icon="mdi-check"
              variant="text"
              size="small"
              :disabled="projectReadOnly || task.can_update === false"
              :aria-label="t('examples.tasks.close', { title: task.title })"
              @click.stop="setStatus(task, 'closed')"
            />
          </template>
        </v-list-item>
        <v-list-item v-if="!isLoading && tasks.length === 0" :title="t('examples.tasks.empty')" />
      </v-list>
    </ExampleSection>
  </div>
</template>
