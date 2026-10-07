import type { Trigger } from '@antcde/connect-ts'
import { useApi, useTriggerDispatch } from '@antcde/vue-utils'
import { ref, shallowRef, watch } from 'vue'
import { injectContext } from '@/plugins/context'
import { useGlobalStore } from '@/stores/app.store'

/**
 * Run a trigger from the app. The app sends a trigger id (and optional parameters);
 * which credentials are used, and where they go, is decided server-side by the Vault
 * binding on the trigger. See docs/capabilities/triggers.md and docs/capabilities/vault.md.
 */
export function useTriggerRunner() {
  const { comms } = injectContext()
  const { scope } = useGlobalStore()

  const listApi = useApi(comms.connect.webhookTriggers.fetchTriggers, null)
  // throwError: without it a failed dispatch resolves to `null` and looks like an empty success.
  const dispatchApi = useApi(comms.connect.webhookTriggers.dispatch, null, { throwError: true })
  // Handles per-user OAuth consent: the OS opens the provider popup, then the call is retried once.
  const { dispatch } = useTriggerDispatch(comms)

  const triggers = shallowRef<Trigger[]>([])
  const result = ref<unknown>(null)
  const failure = ref<string | null>(null)
  const running = ref(false)

  async function load() {
    triggers.value = []
    if (!scope.value)
      return
    const response = await listApi.execute(scope.value.type, scope.value.id, { per_page: 50 })
    triggers.value = response?.data ?? []
  }

  async function run(trigger: Trigger, body: Record<string, unknown> = {}) {
    if (!scope.value)
      return
    const { type, id } = scope.value
    running.value = true
    result.value = null
    failure.value = null
    try {
      // `body` is merged over the trigger's stored request config — the app can steer the
      // question but never sees or sets the credential.
      result.value = await dispatch(() => dispatchApi.execute(type, id, trigger.id, body))
    }
    catch (error) {
      // Only the message crosses the iframe boundary — there is no `error.response` here.
      failure.value = error instanceof Error ? error.message : String(error)
    }
    finally {
      running.value = false
    }
  }

  watch(scope, () => void load(), { immediate: true })

  return { triggers, isLoading: listApi.isLoading, running, result, failure, run }
}
