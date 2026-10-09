# Testing

> **TL;DR** `@antcde/component-library/test` gives you a Vitest config, a mocked ANT-OS (`comms`, `connect`,
> i18n, colour mode) and mount helpers. Mount real components, act through the UI, and assert on what the
> user sees or what was sent to the platform.
> **Use when** writing or fixing tests for an ANT app.

**What's expected.** The platform doesn't require feature tests. `tests/app.test.ts` must keep
passing. Add tests where behaviour is worth guarding: pure helpers (parsing a response, mapping
data) are the cheapest wins.

## Rules

- **Mock only at the boundary.** The boundary is the app context: `comms`, `connect`, i18n and colour
  mode. Don't mock your own composables, stores or helpers.
- **Test behaviour through the UI.** Click, type and submit, then assert on rendered text, on the
  `connect` calls that were made, or on the signals that were sent.
- **Every test must catch a real regression.** No snapshot tests, and no assertions that only restate
  the mock.
- **Keep `tests/app.test.ts`.** Its `testAppSetup` checks that the app is wired to ANT-OS.
- **Use one `createMockAppContext()` per test file.** Stores built with `createGlobalState` are created
  once per module and keep the first context they see.

## The setup

`vitest.config.ts`:

```ts
import { createAntVitestConfig } from '@antcde/component-library/test/vitest'

export default createAntVitestConfig(import.meta.url)
```

The factory gives you:
- a happy-dom environment
- the `@` alias
- the same auto-imports as the app
- tests from `src/**` and `tests/**` named `*.test.ts` / `*.spec.ts`
- the shared setup file, which:
  - registers **Vuetify** and a test **i18n** globally (a missing key renders as the key itself);
  - **mocks `@antcde/vue-utils`**:
    - `useCommsClient` returns the mocked comms from `createMockAppContext`.
    - `useAntColorMode` and `useAntI18n` return the mocks.
    - `useTriggerDispatch` runs the dispatch callback once.
    - `useApi` really calls the service function. On success it stores and returns the result; on
      failure it sets `error` and returns `undefined`. It never throws, even when you passed
      `throwError: true`.
  - unmounts wrappers after each test and polyfills `ResizeObserver`, `visualViewport` and `scrollTo`.

So don't create Vuetify or i18n yourself in a test file.

## Helpers (`@antcde/component-library/test`)

| Helper | What it does |
|---|---|
| `createMockAppContext({ license?, connect?, messages? })` | Builds the full mock and returns `{ comms, i18n, colorMode, emitSignal, sentSignals }`. Every `connect.<service>.<method>` is an auto-stubbed `vi.fn()` that resolves `undefined`, which `useApi` turns into your declared default. Pass `connect` only for the methods whose result a test depends on. Pass `messages` (for example your `en.json`) to get real text. The context has a license; `project` and `task` are `null` and there is **no `user`** until you set them (`comms.context.value.user = createMockUser()`). |
| `emitSignal(signal)` / `sentSignals` | `emitSignal` simulates a signal from the OS to every `signal.receive`. The mock's `signal.with()` doesn't filter: its handler also gets every emitted signal **as is** (the whole signal, not the `cause`), so emit the shape your handler reads. `sentSignals` records everything the app sent. |
| `testAppSetup(App, ctx, { provideContext })` | Registers five tests: 1. mounts with your real `provideContext`; 2. throws when it is missing; 3. has a `VApp` and survives a dark ↔ light toggle; 4. renders text with i18n; 5. survives flushing every on-mount fetch. |
| `mountWithContext(component, { mockContext, props?, slots?, user?, context?, pinia?, router?, mountOptions? })` | Mounts with the mock context provided under the `'appContext'` key, so `injectContext()` resolves without any `vi.mock`. Returns `{ wrapper, user, context }`. |
| `mountApp(component, { props?, slots?, plugins?, stubs?, global? })` | Plain `mount` with transitions stubbed. Use it for components that don't call `injectContext()`. |
| `createMockUser(preset)`, `createMockLicense()`, `createMockProject()`, `createMockTask()`, `createMockContext()` | Domain objects with sensible defaults. User presets are `'admin'`, `'editor'` and `'viewer'`. |
| `createMockSignal()`, `createMockApi(initial)`, `createMockApiMap()`, `createTranslator(messages)`, `createTestI18n()`, `useApiMock` | Lower-level building blocks. You'll rarely need them. |

`createTestRouter`, `mockVueRouter` and `createTestPinia` live on their own subpaths
(`@antcde/component-library/test/createTestRouter`, …) so that apps without a router or Pinia don't
pull those in.

## Canonical patterns

### App smoke test

Already in the template, as `tests/app.test.ts`:

```ts
import { createMockAppContext, testAppSetup } from '@antcde/component-library/test'
import App from '@/App.vue'
import { provideContext } from '@/plugins/context'

testAppSetup(App, createMockAppContext(), { provideContext })
```

### Component test

This tests the Tables example: adding a note must create a record in the table the query returned.

```ts
import { createMockAppContext, createMockProject, mountWithContext } from '@antcde/component-library/test'
import { flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import TablesExample from '@/examples/tables/TablesExample.vue'
import en from '@/lang/translations/en.json'

const mockContext = createMockAppContext({
  messages: en,
  connect: {
    tables: {
      queryTables: vi.fn().mockResolvedValue({
        notes: {
          id: 'table-1',
          records: [],
          stats: { count: 0, limit: 10, offset: 0 },
          permissions: { 'tables.read': true, 'tables.create': true, 'tables.update': true, 'tables.delete': true, 'tables.configure': false },
        },
      }),
    },
  },
})
mockContext.comms.context.value.project = createMockProject()

it('creates the note in the table returned by the query', async () => {
  const { wrapper } = mountWithContext(TablesExample, { mockContext })
  await flushPromises()

  await wrapper.find('input').setValue('Order bolts')
  await wrapper.find('form').trigger('submit')
  await flushPromises()

  expect(mockContext.comms.connect.records.createRecord)
    .toHaveBeenCalledWith('table-1', { record: { title: 'Order bolts', status: 'open' } })
})
```

### Signals in and out

```ts
mockContext.emitSignal({ topic: { name: 'template-note-selected', data: { message: 'hi' } } })
await flushPromises()
expect(wrapper.text()).toContain('hi')

expect(mockContext.sentSignals).toContainEqual({ navigate: { to: 'OS.dash' } })
```

## Don't

- Don't `vi.mock` your own composables or stores to make a component testable. Mock `connect` instead.
- Don't assert on serialised HTML or write snapshot tests.
- Don't rely on `throwError: true` to make a test fail on an API error: the mocked `useApi` swallows it.
  Assert on `error` or on what the UI shows.
- Don't instantiate Vuetify or i18n in a test, and don't import the real `@antcde/vue-utils`
  implementation of `useCommsClient`.

## See also

- [calling-the-api.md](calling-the-api.md): `useApi` semantics in the real app
- [signals-and-realtime.md](signals-and-realtime.md)
- [ui-and-design.md](ui-and-design.md)
- [pitfalls.md](pitfalls.md)
