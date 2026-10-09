# Feature flags

> **TL;DR** ANT-OS sends the environment's feature flags to your app in `comms.context.features`.
> Read one with `useFeature(comms.context, 'name')`, a `ComputedRef<boolean>` that is `false` unless the
> flag is explicitly on. **Use when** a part of your app depends on a platform capability that isn't
> enabled in every ANT environment yet.

Requires `@antcde/vue-utils` ≥ 0.2.28 with `@antcde/connect-ts` ≥ 0.4.33 (the versions this template asks for).

## Concepts

- Flags belong to the **environment**, not to your app. The OS loads them once and passes them on as
  `Record<string, boolean>`.
- A flag that is missing counts as **off**, so code written against a flag is safe on environments that
  don't know it yet.

## Rules

- Read flags with `useFeature`; never compare `context.features` values by hand.
- Treat "absent" as off. Never invert a check (`!useFeature(…)` meaning "on by default").
- Gate only the UI and calls that depend on the capability. The API still enforces availability.
- Don't create your own build-time flags (`VITE_…`) for platform capabilities.

## Canonical pattern

```ts
import { useFeature } from '@antcde/vue-utils'

const { comms: { context } } = injectContext()
const canUseNewThing = useFeature(context, 'new-thing')
```

```vue
<v-btn v-if="canUseNewThing" :text="t('newThing.open')" @click="open" />
```

## Don't

- Don't fetch flags yourself (`connect.features.getFeatures()`); the OS already passes them in.
- Don't keep a flag check around after the capability is everywhere. Remove it when the flag goes away.

## See also

[../shell-integration.md](../shell-integration.md) · [permissions.md](permissions.md)
