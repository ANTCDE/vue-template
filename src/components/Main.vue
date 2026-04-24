<script setup lang="ts">
import type { NotepadVisibility, SbsRecord } from '@antcde/connect-ts'
import { objectPick } from '@vueuse/core'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { injectContext } from '@/plugins/context'

const { comms, i18n } = injectContext()
const { t } = i18n
const { toolbar, notepad, context, connect, notifications, appState, signal } = comms

const count = ref(0)
const sbs = ref<SbsRecord[]>([])
const tasks = ref<{ id: string, title: string }[]>([])

// Persist app state across ANT-OS sessions
appState.value = 'test 123'

// Fetch SBS records when project changes
watch(() => context.value.project, async (project) => {
  if (project?.id) {
    const flatten = (records: SbsRecord[]): SbsRecord[] =>
      records.flatMap(r => [r, ...(r.children?.length ? flatten(r.children) : [])])
    sbs.value = flatten(await connect.sbs.getSbs(project.id))
  }
})

// Fetch tasks when license changes
watch(() => context.value.license, async (license) => {
  if (license) {
    tasks.value = await connect.tasks
      .getV2Tasks(license.id, new URLSearchParams({ per_page: '3' }).toString())
      .then(e => e.data.map(task => objectPick(task, ['id', 'title'])))
  }
})

// Update toolbar title reactively
watch(count, count => toolbar.title.value = t('toolbar.count', { count }))

// Configure toolbar on mount
onMounted(() => {
  toolbar.title.value = t('app.toolbarTitle')
  toolbar.menu.value = ['mdi-home-outline', 'mdi-cog-outline'].map((icon, index) => ({
    icon,
    title: t('toolbar.menuItem', { index: index + 1 }),
    onClick: () => notifications.info(t('notifications.itemClicked', { index: index + 1 })),
  }))
  toolbar.searchEnabled.value = true
})

// Listen for signals from ANT-OS (e.g., URL query param changes)
const query = ref('')
let unsubscribeSignal: (() => void) | undefined

onMounted(() => {
  unsubscribeSignal = signal.receive((s) => {
    if (s.route?.query)
      query.value = JSON.stringify(s.route.query)
  })
})

onUnmounted(() => unsubscribeSignal?.())

const navigation = [
  { title: t('navigation.dashboard'), subtitle: 'OS.dash' },
  { title: t('navigation.login'), subtitle: 'OS.login' },
  { title: t('navigation.profile'), subtitle: 'OS.profile' },
  { title: t('navigation.store'), subtitle: 'store' },
]
</script>

<template>
  <div class="pa-8">
    <h3>{{ t('app.title') }}</h3>
    <i18n-t keypath="app.description" tag="p" class="text-medium-emphasis">
      <template #link>
        <a href="https://os.antcde.io/developer">{{ t('app.developerPage') }}</a>
      </template>
    </i18n-t>

    <v-btn-group divided variant="outlined">
      <v-btn :text="t('actions.sendNotification')" @click="notifications.success(t('notifications.amazing'))" />
      <v-btn @click="count++">
        {{ t('actions.countIs', { count }) }}
      </v-btn>
    </v-btn-group>

    <h4 class="mt-6">
      {{ t('sections.queryParams.title') }}
    </h4>
    <p class="text-medium-emphasis">
      {{ t('sections.queryParams.description') }}
    </p>
    <code>{{ query }}</code>

    <v-form class="mt-4 d-flex flex-column ga-6">
      <div>
        <h4>{{ t('sections.selectSbs.title') }}</h4>
        <p class="text-medium-emphasis">
          {{ t('sections.selectSbs.description') }}
        </p>
        <v-select
          density="compact"
          autocomplete="off"
          aria-autocomplete="none"
          :items="sbs"
          :item-props="item => ({ ...item, value: item.code, title: item.code })"
          @update:model-value="code => notepad.show('sbs').then(() => notepad.selectSbs({ code }))"
        />
      </div>

      <div>
        <h4>{{ t('sections.selectTask.title') }}</h4>
        <p class="text-medium-emphasis">
          {{ t('sections.selectTask.description') }}
        </p>
        <v-select
          density="compact"
          autocomplete="off"
          aria-autocomplete="none"
          :items="tasks"
          :item-props="(task) => ({ ...task, value: task.id })"
          @update:model-value="id => notepad.showTask({ id })"
        />
      </div>

      <div>
        <h4>{{ t('sections.notepad.title') }}</h4>
        <p class="text-medium-emphasis">
          {{ t('sections.notepad.description') }}
        </p>
        <v-select
          density="compact"
          autocomplete="off"
          aria-autocomplete="none"
          clearable
          :items="['task', 'apps', 'tasks', 'sbs'] as NotepadVisibility[]"
          @update:model-value="item => notepad.show(item ?? undefined)"
          @click:clear="notepad.hide"
        />
      </div>

      <div>
        <h4>{{ t('sections.overlay.title') }}</h4>
        <p class="text-medium-emphasis">
          {{ t('sections.overlay.description') }}
        </p>
        <v-select
          density="compact"
          autocomplete="off"
          aria-autocomplete="none"
          :items="tasks"
          :item-props="item => ({ ...item, value: item.id })"
          @update:model-value="(id) => signal({ overlay: { action: { id } } })"
        />
      </div>

      <div>
        <h4>{{ t('sections.navigateTo.title') }}</h4>
        <p class="text-medium-emphasis">
          {{ t('sections.navigateTo.description') }}
        </p>
        <v-select
          density="compact"
          autocomplete="off"
          aria-autocomplete="none"
          :items="navigation"
          :item-props="item => ({ ...item, value: item.subtitle })"
          @update:model-value="to => comms.signal({ navigate: { to } })"
        />
      </div>
    </v-form>
  </div>
</template>
