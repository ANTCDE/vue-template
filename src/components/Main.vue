<script setup lang="ts">
import type {NotepadVisibility, SbsRecord} from '@antcde/connect-ts'
import {onMounted, onUnmounted, ref, watch} from 'vue'
import {injectContext} from "../plugins/context.ts";
import {objectPick} from "@vueuse/core";
import qs from "qs";

const {comms, i18n} = injectContext()
const {t} = i18n
const {toolbar, notepad, context, connect, notifications, appState, signal} = comms
const count = ref(0)
const sbs = ref<SbsRecord[]>([])
const tasks = ref<{ id: string, title: string }[]>([])

appState.value = 'test 123'

watch(() => context.value.project, async (project) => {
  if (project?.id) {
    const flatten = (records: SbsRecord[]): SbsRecord[] => records.flatMap(r => [r].concat((r.children?.length ? flatten(r.children) : [])))
    const records = await connect.sbs.getSbs(project.id)

    sbs.value = flatten(records)
  }
})

watch(() => context.value.license, async (license) => {
  if (license) {
    tasks.value = await connect.tasks
        .getV2Tasks(license.id, qs.stringify({per_page: 3}))
        .then(e => e.data.map(t => objectPick(t, ['id', 'title'])))
  }
})

watch(count, count => toolbar.title.value = t('toolbar.count', {count}))

onMounted(() => {
  toolbar.title.value = t('app.toolbarTitle')
  toolbar.menu.value = ['mdi-home-outline', 'mdi-cog-outline'].map((icon, index) => ({
    icon,
    title: t('toolbar.menuItem', {index: index + 1}),
    onClick: () => comms.notifications.info(t('notifications.itemClicked', {index: index + 1})),
  }))

  toolbar.searchEnabled.value = true
})

let unsubscribeSignal: (() => void) | undefined

const query = ref<string>('')

onMounted(() => unsubscribeSignal = signal.receive((s) => {
  if (s.route?.query) query.value = JSON.stringify(s.route.query)
}))

onUnmounted(() => unsubscribeSignal?.())

const navigation = [
  {title: t('navigation.dashboard'), subtitle: 'OS.dash'},
  {title: t('navigation.login'), subtitle: 'OS.login'},
  {title: t('navigation.profile'), subtitle: 'OS.profile'},
  {title: t('navigation.store'), subtitle: 'store'},
]
</script>

<template>
  <div class="pa-8">
    <h3>{{ t('app.title') }}</h3>
    <i18n-t keypath="app.description" tag="p">
      <template #link>
        <a href="os.antcde.io/developer">{{ t('app.developerPage') }}</a>
      </template>
    </i18n-t>
    <v-btn-group divided variant="outlined">
      <v-btn @click="notifications.success(t('notifications.amazing'))" :text="t('actions.sendNotification')"/>
      <v-btn type="button" @click="count++">{{ t('actions.countIs', {count}) }}</v-btn>
    </v-btn-group>

    <h4>{{ t('sections.queryParams.title') }}</h4>
    <p>{{ t('sections.queryParams.description') }}</p>
    <code>{{ query }}</code>

    <v-form>
      <h4>{{ t('sections.selectSbs.title') }}</h4>
      <p>{{ t('sections.selectSbs.description') }}</p>
      <v-select
          density="compact"
          :items="sbs"
          :item-props="item => ({...item, value: item.code, title: item.code})"
          @update:model-value="code => notepad.show('sbs').then(() => notepad.selectSbs({ code }))"
      />

      <h4>{{ t('sections.selectTask.title') }}</h4>
      <p>{{ t('sections.selectTask.description') }}</p>
      <v-select
          density="compact"
          :items="tasks"
          :item-props="(task) => ({ ...task, value: task.id  })"
          @update:model-value="id => notepad.showTask({ id })"
      />

      <h4>{{ t('sections.notepad.title') }}</h4>
      <p>{{ t('sections.notepad.description') }}</p>
      <v-select
          density="compact"
          clearable
          :items="['task', 'apps', 'tasks', 'sbs'] as NotepadVisibility[]"
          @update:model-value="item => notepad.show(item ?? undefined)"
          @click:clear="notepad.hide"
      />

      <h4>{{ t('sections.overlay.title') }}</h4>
      <p>{{ t('sections.overlay.description') }}</p>
      <v-select
          density="compact"
          :items="tasks"
          :item-props="item => ({ ...item, value: item.id })"
          @update:model-value="(id) => signal({overlay: {action: {id}}})"
      />

      <h4>{{ t('sections.navigateTo.title') }}</h4>
      <p>{{ t('sections.navigateTo.description') }}</p>
      <v-select
          density="compact"
          :items="navigation"
          :item-props="item => ({ ...item, value: item.subtitle })"
          @update:model-value="to => comms.signal({navigate: {to}})"/>
    </v-form>
  </div>
</template>
