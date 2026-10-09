# UI and design

> **TL;DR** Your app is one pane inside ANT-OS. The OS owns the chrome; you style the content with
> ANT tokens (UnoCSS first, Vuetify for complex controls), name every control, and translate every string.
> **Use when** building or reviewing any screen, choosing a component, or adding user-facing text.

## Rules

- **Don't rebuild the chrome.** The OS already renders the title bar, search box, toasts, notepad and
  navigation. Drive them through `comms` (see [shell-integration.md](shell-integration.md)): no app-local
  header, search field or snackbar.
- **Use the factories.** `createAntVuetify()` (Vuetify), `createAntUnoConfig()` (UnoCSS) and
  `createAntViteConfig(import.meta.url)` (Vite) give you the ANT themes, tokens and CSS layer order.
  Pass overrides to them instead of hand-rolling a config.
- **UnoCSS first, Vuetify for complex primitives.** Use utilities and ANT tokens for layout, spacing,
  typography and colour. Use Vuetify (or the `Ant*` components below) for controls with behaviour:
  selects, dialogs, menus, data tables.
- **Use tokens, never raw colours.** Don't write hex colours, inline `style`, or `<style>` blocks for
  anything a token or utility covers. Tokens follow the theme, so dark mode works for free.
- **Theme from `colorMode.isDark`.** The raw colour mode can be `'auto'`, which is not a Vuetify theme:

  ```ts
  const { colorMode } = injectContext()
  const theme = computed(() => colorMode.isDark.value ? 'dark' : 'light') // <v-app :theme="theme">
  ```
- **Give every interactive control an accessible name.** Icon-only buttons need `aria-label`. A
  tooltip is not a name.
- **Turn off browser autofill on pickers.** Put `autocomplete="off"` and `aria-autocomplete="none"` on
  every `v-select`, `v-autocomplete` and `v-combobox`.
- **Translate every user-facing string** with `t()`, and keep `en`, `nl` and `de` in step.

## Design tokens (UnoCSS)

`createAntUnoConfig()` adds these rules on top of `presetWind4`:

| Token | Use for |
|---|---|
| `bg-ant-surface` | Card and panel surfaces (the theme's surface colour) |
| `bg-ant-panel` | A subtly tinted area on a surface |
| `bg-ant-inset` | Recessed areas: code blocks, wells, inputs |
| `bg-ant-hover` | Hover state on rows and list items |
| `text-heading` | Titles, primary text |
| `text-body` | Regular text |
| `text-muted` | Secondary text, captions |
| `text-disabled` | Disabled text |
| `border-ant` | Borders, used together with `border` / `border-b` / … |

`dark:` variants work against Vuetify's `.v-theme--dark`, and the breakpoints match Vuetify's. Vuetify
theme colours are available as utilities too (`bg-primary/8`, `text-primary`). The config also ships
ready-made shortcuts (`ant-section`, `ant-pill`, `ant-info-box`, `ant-warning-box`, `ant-page-title`,
`ant-icon-button`, …), which are worth reading in `@antcde/component-library/build/uno` before you
invent your own.

```vue
<section class="ant-section">
  <div class="ant-section__header">
    <h3 class="text-heading text-sm font-semibold">{{ t('settings.title') }}</h3>
  </div>
  <p class="ant-section__row text-muted text-sm">{{ t('settings.hint') }}</p>
</section>
```

## Components from `@antcde/component-library`

Import them by name from the package root. Prefer them over a hand-built equivalent, because they
already follow the tokens and the accessibility rules.

**Form primitives** (the current field idiom):
- `AntField`: a label plus hint around any control.
- `AntInput`, `AntNumberField`, `AntSelect`, `AntMultiSelect`, `AntToggle`, `AntOptionPicker`: inputs.
- `AntRadioCards`, `AntCheckboxCards`: single or multiple choice shown as cards.
- `AntSearchField`, `AntFilterChips`, `AntFilterSelect`: search and filtering.
- `AntSectionCard`, `AntPanelSection`, `AntScopePanel`: grouping a form into sections. `AntScopePanel`
  groups settings by who is allowed to change them.
- `AntSaveBar`: the floating "unsaved changes" bar with save and discard.
- `AntDialogShell`: standard dialog chrome.
- `AntHintBanner`, `AntHintTip`: inline guidance.
- `AntStatusPill`: a status badge. Its tone is one of the `PillTone` values.
- `AntActionMenu`: an overflow menu of actions.
- `AntResourceTile`, `AntColumnMapRow`: a resource tile, and a source→target column mapping row.

**Platform-aware components:**
- `StackedLabels`, `BulkLabelsMenu`, `GlobalLabelBadge`, `LabelsMenuCard`: show and assign labels
  (see [capabilities/labels-sbs.md](capabilities/labels-sbs.md)).
- `DmsFilePicker`: pick files from the project's document management.
- `PermissionCard`: show and edit role permissions.
- `RichTextEditor`: rich text with mentions.
- `TaskFlow`: an embedded workflow view.
- `BaseDeleteDialog`, `BaseConfirmDialog`: confirmation dialogs.
- `BaseLimitedButton`: a button that shows the plan-limit badge when a license limit is reached.
- `AntTourZone`: highlights a region while the OS tour is running. Connect it with
  `useAppTourMode().connectContext(comms.context)` (exported by `@antcde/vue-utils`, and re-exported by
  the component library).

**Bundle size.** The library doesn't mark itself side-effect free yet, so the first component you
import pulls in the whole library (several hundred kB, including the rich-text editor). That cost is
worth paying for a real form built from `Ant*` primitives. For a single dialog or button, a plain
Vuetify component is lighter. Check `pnpm build` output after adding the first import.

**Superseded:** `BaseAntInput` and `BaseAntDatePicker` still exist but are deprecated for new code
(`SUPERSEDED_FIELD_COMPONENTS`). Use the `Ant*` primitives, and don't mix the two idioms in one form.

## What the Vite factory gives you

- **Auto-imports:** the APIs of `vue`, `@vueuse/core` and `@vueuse/math`, Vuetify's `useDisplay`, plus
  everything exported from `src/composables`, `src/stores` and `src/plugins`. Nothing else is
  auto-imported. In particular, import `vue-i18n`, `vue-router` and the `@antcde/*` packages explicitly.
  The template imports explicitly everywhere, which is easier to read and easier for tools to follow.
- **Component auto-registration:** every `.vue` under `src/components` is registered globally, except
  files or folders whose name starts with `_` and anything inside a nested `components/` folder. Use
  `_Private.vue` for components that belong to one parent.
- **Icons:** Vuetify components take icon names like `mdi-check`.
- **Translations:** every file in `src/lang/translations/` is compiled into the `messages` import that
  `src/lang/language.ts` passes to `createI18n`. Adding `fr.json` adds French.
- **Generated files:** `auto-imports.d.ts`, `components.d.ts` and `.eslintrc-auto-import.json` are
  generated by `pnpm dev` / `pnpm build` and are git-ignored.

## i18n

- Get `t` from the app context (`injectContext().i18n`). `useAntI18n(comms)` keeps the locale in step
  with the user's language in ANT-OS.
- Use named parameters (`t('files.uploaded', { count })`) rather than concatenating strings.
- Give icon buttons translated labels: `:aria-label="t('notes.delete', { title })"`.
- **Tone:** German uses the formal "Sie", Dutch the informal "je/jij", English plain second person.
  Keep platform terms as they appear in ANT-OS (trigger, DMS, SBS) rather than translating them.
- Messages from the server (errors, trigger results) may arrive in English. Show them as they are,
  inside your own translated sentence.

## Don't

- Don't build a toolbar, search box or toast inside the app.
- Don't write hex colours or inline `style`, and don't override Vuetify colours per component.
- Don't use `:theme="colorMode"` directly, since it can be `'auto'`.
- Don't use `BaseAntInput` or `BaseAntDatePicker` in new forms.
- Don't ship a control without an accessible name, or a string without a translation.

## See also

- [shell-integration.md](shell-integration.md): toolbar, notifications, notepad, theme
- [app-anatomy.md](app-anatomy.md): where the factories and plugins are wired up
- [testing.md](testing.md): mounting components with Vuetify and i18n already installed
- [pitfalls.md](pitfalls.md)
