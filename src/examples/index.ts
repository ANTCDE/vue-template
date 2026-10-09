import type { Component } from 'vue'
import { defineAsyncComponent } from 'vue'

export interface ExampleTab {
  id: string
  /** i18n key for the tab label */
  titleKey: string
  component: Component
}

/**
 * Every capability demo is one folder under src/examples, registered here.
 * Starting a real app? Delete the folders you don't need and their entries below.
 */
export const examples: ExampleTab[] = [
  { id: 'shell', titleKey: 'examples.shell.tab', component: defineAsyncComponent(() => import('./shell/ShellExample.vue')) },
  { id: 'tables', titleKey: 'examples.tables.tab', component: defineAsyncComponent(() => import('./tables/TablesExample.vue')) },
  { id: 'tasks', titleKey: 'examples.tasks.tab', component: defineAsyncComponent(() => import('./tasks/TasksExample.vue')) },
  { id: 'files', titleKey: 'examples.files.tab', component: defineAsyncComponent(() => import('./files/FilesExample.vue')) },
  { id: 'triggers', titleKey: 'examples.triggers.tab', component: defineAsyncComponent(() => import('./triggers/TriggersExample.vue')) },
  { id: 'signals', titleKey: 'examples.signals.tab', component: defineAsyncComponent(() => import('./signals/SignalsExample.vue')) },
]
