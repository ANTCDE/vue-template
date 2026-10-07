<script setup lang="ts">
import { ref } from 'vue'
import ExampleSection from '@/examples/_shared/ExampleSection.vue'
import ScopeNotice from '@/examples/_shared/ScopeNotice.vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'
import { useProjectFiles } from './useProjectFiles'

const { i18n: { t } } = injectContext()
const { projectId } = useGlobalStore()
const { files, isLoading, uploading, canUpload, upload, preview } = useProjectFiles()

const picked = ref<File[]>([])

async function submit() {
  await upload(picked.value)
  picked.value = []
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <ExampleSection :title="t('examples.files.title')" :description="t('examples.files.description')" doc="docs/capabilities/files-dms.md">
      <ScopeNotice v-if="!projectId" needs="project" />

      <template v-else>
        <form class="flex gap-2" @submit.prevent="submit">
          <v-file-input
            v-model="picked"
            :label="t('examples.files.pick')"
            multiple
            density="compact"
            hide-details
            :disabled="!canUpload || uploading"
          />
          <v-btn type="submit" color="primary" :loading="uploading" :disabled="!canUpload || picked.length === 0" :text="t('examples.files.upload')" />
        </form>

        <v-list density="compact" border rounded>
          <v-list-item
            v-for="file in files"
            :key="file.token"
            :title="file.name"
            :subtitle="file.extension ?? undefined"
            prepend-icon="mdi-file-outline"
            @click="preview(file)"
          />
          <v-list-item v-if="!isLoading && files.length === 0" :title="t('examples.files.empty')" />
        </v-list>
      </template>
    </ExampleSection>
  </div>
</template>
