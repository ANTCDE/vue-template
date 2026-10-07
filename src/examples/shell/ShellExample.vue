<script setup lang="ts">
import type { NotepadVisibilityTabs } from '@antcde/connect-ts'
import { computed, onMounted, ref, watch } from 'vue'
import ExampleSection from '@/examples/_shared/ExampleSection.vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'

// The shell owns the chrome: title bar, search box, toasts, notepad and navigation.
// An app drives them through comms instead of rendering its own. See docs/shell-integration.md.
const { comms, i18n: { t } } = injectContext()
const { context, toolbar, notifications, notepad, appState, signal } = comms
const { projectReadOnly, permissions } = useGlobalStore()

const contextRows = computed(() => [
  { label: t('examples.shell.user'), value: context.value.user?.name ?? '—' },
  { label: t('examples.shell.license'), value: context.value.license?.name ?? '—' },
  { label: t('examples.shell.project'), value: context.value.project?.name ?? '—' },
  { label: t('examples.shell.selectedTask'), value: context.value.selectedTask?.title ?? '—' },
  { label: t('examples.shell.sbs'), value: context.value.sbs?.code ?? '—' },
  { label: t('examples.shell.readOnly'), value: projectReadOnly.value ? t('common.yes') : t('common.no') },
  { label: t('examples.shell.licenseAdmin'), value: permissions.isLicenseAdmin.value ? t('common.yes') : t('common.no') },
])

// The toolbar fields are writable refs; setting them updates the OS title bar.
onMounted(() => {
  toolbar.title.value = t('app.title')
  toolbar.searchEnabled.value = true
  toolbar.menu.value = [
    { icon: 'mdi-information-outline', title: t('examples.shell.menuAbout'), onClick: () => notifications.info(t('examples.shell.aboutMessage')) },
  ]
})

// The OS search box: debounced by the host, read it like any ref.
const search = computed(() => toolbar.search.value)

// appState is persisted by the OS in the URL hash, so it survives a reload or a shared link.
const visits = ref(Number(appState.value) || 0)
watch(visits, value => appState.value = String(value))

const notepadTabs: NotepadVisibilityTabs[] = ['tasks', 'sbs', 'apps']
</script>

<template>
  <div class="flex flex-col gap-8 p-6">
    <ExampleSection :title="t('examples.shell.contextTitle')" :description="t('examples.shell.contextDescription')" doc="docs/shell-integration.md">
      <v-table density="compact">
        <tbody>
          <tr v-for="row in contextRows" :key="row.label">
            <th class="w-48">
              {{ row.label }}
            </th>
            <td>{{ row.value }}</td>
          </tr>
        </tbody>
      </v-table>
    </ExampleSection>

    <ExampleSection :title="t('examples.shell.toolbarTitle')" :description="t('examples.shell.toolbarDescription')">
      <p class="text-body text-sm">
        {{ t('examples.shell.searchValue') }} <code>{{ search || '—' }}</code>
      </p>
    </ExampleSection>

    <ExampleSection :title="t('examples.shell.notificationsTitle')" :description="t('examples.shell.notificationsDescription')">
      <div class="flex flex-wrap gap-2">
        <v-btn variant="outlined" :text="t('examples.shell.notifySuccess')" @click="notifications.success(t('examples.shell.successMessage'))" />
        <v-btn variant="outlined" :text="t('examples.shell.notifyWarning')" @click="notifications.warning(t('examples.shell.warningMessage'))" />
      </div>
    </ExampleSection>

    <ExampleSection :title="t('examples.shell.notepadTitle')" :description="t('examples.shell.notepadDescription')">
      <div class="flex flex-wrap gap-2">
        <v-btn v-for="tab in notepadTabs" :key="tab" variant="outlined" :text="t(`examples.shell.notepadTab.${tab}`)" @click="notepad.show(tab)" />
        <v-btn variant="text" :text="t('examples.shell.notepadHide')" @click="notepad.hide()" />
      </div>
    </ExampleSection>

    <ExampleSection :title="t('examples.shell.appStateTitle')" :description="t('examples.shell.appStateDescription')">
      <div>
        <v-btn variant="outlined" :text="t('examples.shell.appStateButton', { count: visits })" @click="visits++" />
      </div>
    </ExampleSection>

    <ExampleSection :title="t('examples.shell.navigateTitle')" :description="t('examples.shell.navigateDescription')">
      <div>
        <v-btn variant="outlined" prepend-icon="mdi-view-dashboard-outline" :text="t('examples.shell.toDashboard')" @click="signal({ navigate: { to: 'OS.dash' } })" />
      </div>
    </ExampleSection>
  </div>
</template>
