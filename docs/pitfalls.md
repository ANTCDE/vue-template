# Pitfalls

> **TL;DR** The mistakes ANT apps actually make, each as *symptom → cause → fix*. Scan the
> headings before you ship, and after an AI assistant has written code for you.
> **Use when** something behaves oddly, or as a review checklist.

## Calling the API

1. **A failed save shows "Saved".** `useApi().execute()` resolves (to the initial value) on
   error instead of throwing. → Check `api.error.value` after `execute`, or create the
   `useApi` with `{ throwError: true }` and use `try/catch`.
   [calling-the-api.md](calling-the-api.md#does-not-throw-the-most-common-bug)
2. **Two error toasts for one failure.** The OS already toasts failed `connect` calls. → Don't
   call `notifications.error` for API failures. Do call it for failures the OS can't see
   (uploads to storage, your own validation).
3. **`error.response` is `undefined`, so status-code handling never matches.** Errors cross the
   iframe boundary as a message only. → Design for "failed" plus the OS toast; branch on the
   message only when unavoidable.
4. **An upload or date argument arrives empty or as `{}`.** Arguments are cloned as JSON:
   `File`, `Blob`, `FormData` and `Date` don't survive. → Presigned upload for files
   ([files-dms.md](capabilities/files-dms.md)); ISO strings for dates.
5. **Wrong error or loading state after parallel calls.** Several requests share one `useApi`
   instance, for example `Promise.all` over the same instance. → One instance per verb, or a
   fresh instance per call when calls can overlap.
6. **The list briefly shows the previous project's data.** A slow response from before the
   context switch lands after the new one. → "Latest wins" generation counter.
   [calling-the-api.md](calling-the-api.md#latest-wins)
7. **The task list is huge or slow.** `getV2Tasks` without `per_page` returns everything. →
   Always pass `per_page` and `page` via `buildTaskQuery`.
8. **It works on test data and times out in production.** A huge page size
   (`per_page: 5000`, `limit: 100000`), or a whole table pulled in to aggregate in the browser.
   → Real pagination; only query the columns you need; aggregate on smaller, filtered sets.
9. **`connect.triggers` (or `vault`, `files`, `store`) is undefined.** Those namespaces don't
   exist. → `webhookTriggers`, `secrets`, `dms`, `apps`. See the service map in
   [calling-the-api.md](calling-the-api.md#service-map).

## Context

10. **After switching project the app shows, or writes into, the old project.** The iframe is
    not reloaded on a context switch, and a cached id (table id, folder token) still points at
    the previous project. → `watch(projectId)`: clear cached ids and state, then reload.
11. **The wrong task is used.** `context.task` is deprecated and ambiguous. → `selectedTask`
    (the working context) or `notepadTask` (open in the side panel); pick deliberately.
12. **Writes fail with an "archived" error.** The project is archived. →
    `context.projectReadOnly`: disable write controls up front.
13. **The app stays light in dark mode.** The theme is bound to the raw colour mode, which can
    be `'auto'`. → `colorMode.isDark.value ? 'dark' : 'light'`.
14. **The language doesn't follow the user.** vue-i18n is used without `useAntI18n(comms)`. →
    Keep the template's context plugin; always translate through `t()`; keep `en`/`nl`/`de` in step.
15. **A deep link opens the app in its default state.** The app waited for a `route` signal
    at startup; signals from before the handshake are lost. → Read
    `context.initialRouteQuery` once on load.
16. **Nothing works at `http://localhost:5174`.** There is no OS around the app: no comms, no
    API. → Develop inside ANT-OS at `/developer/5174`.
17. **The user's URL doesn't reflect the app's state.** The app changed its own iframe URL. →
    `signal({ route: { query } })`, declared in `capabilities.queryParams`.

## Signals and realtime

18. **Handlers fire twice, then three times…** `receive()` / `.with()` were never
    unsubscribed. → Keep the returned function and call it in `onScopeDispose`.
19. **Live updates stop after a project switch.** A `.with()` subscription is bound to the
    project/license at subscribe time. → Re-subscribe inside a `watch` on the context.
20. **Slow startup, many auth requests.** One `.with('task', id)` per row. → One subscription
    per collection (`userProjectTask`, `projectTask`) and filter in the handler.
21. **Task updates never arrive.** `.with('licenseProjectTask')` is deprecated and never fires.
    → `userProjectTask`.
22. **The same change is processed several times.** One event is fanned out to every app in the
    tab and can repeat. → Idempotent handlers; debounce and refetch.
23. **An optimistic edit flickers back.** The echo of your own change arrives while the save is
    still running. → Ignore events for an entity while your save for it is in flight.
24. **A channel subscription receives nothing.** The channel name has a typo; it authorises fine
    anyway. → Copy channel names exactly ([signals-and-realtime.md](signals-and-realtime.md#channels)).
25. **A topic message doesn't arrive.** The sender never receives its own message, and a tab
    that has only received joins the cross-tab channel only after it first publishes. → Test
    with two apps or two tabs; publish once on startup if the tab must hear other tabs.
26. **The app opened its own websocket.** → Don't. The OS holds the only realtime connection;
    use signals.

## Tables

27. **A write fails with "table not found".** It was sent with the table *name*. → Writes take
    the table **id**, which every `queryTables` response returns (`result[alias].id`).
28. **`is_unique` rejects a value used in another project.** Uniqueness is table-wide. →
    Enforce scoped uniqueness yourself (query before insert).
29. **A removed column still exists.** Activation never drops columns. → Plan renames as
    add → migrate → stop using.
30. **The query result is silently cut off.** The result was truncated at a limit. → Paginate
    with `limit`/`offset` and compare with `stats.count`.

31. **The app's own table "doesn't exist" when running from `/developer/<port>`.** The developer
    URL never activates the app, so declared tables were never created. → Create the table for
    development, or activate a published version once; activation adopts it later. Handle the
    missing state in code. [app-anatomy.md](app-anatomy.md#declared-tables-dont-exist-in-developer-mode)

## Files

32. **The preview shows a download, or raw bytes.** `fileName` lacks the extension. → Send
    `fileName` as `name.extension` plus `fileExtension`.
33. **Rename or move is refused although the user can edit the file.** Folder permissions apply
    *inside* the folder. → Check the parent folder's permissions for rename/move.
34. **The app downloads and renders files itself.** → `signal({ openFilePreview })`; the OS
    resolves signed URLs and handles formats.
35. **Upload (or another write) is disabled for an admin.** The gate reads
    `project.user_permissions` only. Those maps hold role grants, not admin rights. → Gate on
    `usePermissions(context).isProjectAdmin` **or** the grant.

36. **The label filter is ignored, or applied when it shouldn't be.** → Apply
    `context.selectedLabels` only when its `resources` includes your resource type
    (`dms_files`, `projects`, …).

37. **Upload fails from `/developer/<port>` (or a self-hosted app) with a CORS error, but works in
    the installed app.** The presigned `PUT` goes from your origin straight to Amazon S3, and the
    environment's S3 bucket CORS doesn't allow that origin (the console names an
    `*.s3.<region>.amazonaws.com` URL). → An environment setting: the bucket needs a CORS rule
    allowing your origin (e.g. `http://localhost:*`) for `PUT`, with headers `*` and exposed `ETag`.
    Other API calls are unaffected, because they go through the OS.
    [files-dms.md](capabilities/files-dms.md#uploading-from-your-own-origin)

38. **The S3 `PUT` returns 403.** The URL expired (it is valid for 300 s), or you added headers
    that aren't signed, such as `x-amz-*`. → Request the URLs right before uploading; send only
    `config.headers` minus `Host`.
    [files-dms.md](capabilities/files-dms.md#uploading-from-your-own-origin)

## Triggers and Vault

39. **Third-party API keys are stored in a table column, or provider tokens are minted in the
    browser.** → Store credentials in the Vault, bind them to a trigger, and dispatch the
    trigger. The app never sees the credential. [vault.md](capabilities/vault.md)
40. **A refused dispatch shows as "no data".** The dispatch ran without `throwError`. →
    `useApi(connect.webhookTriggers.dispatch, null, { throwError: true })`.
41. **The consent popup never opens for a per-user OAuth secret.** "Authorization required" is
    a successful (200) result, not an error. → Wrap the dispatch in `useTriggerDispatch(comms)`.
42. **A trigger is called with `fetch(dispatch_url)` from the browser.** → Use
    `connect.webhookTriggers.dispatch`. It goes through the OS session and works with Vault
    bindings and consent.

## Build, tooling and tests

43. **`ref is not defined` (or the same for `useRouter`) after copying code.** Auto-imports
    cover only `vue`, `@vueuse/core`, `@vueuse/math`, `useDisplay` and `src/composables|stores|plugins`. →
    Import everything else explicitly.
44. **Type-check fails on a fresh clone with unknown globals.** The generated
    `auto-imports.d.ts` / `components.d.ts` don't exist yet. → Run `pnpm dev` or `pnpm build`
    once.
45. **The App Store shows the wrong version or changelog.** `package.json`, `app-config.json`
    and `CHANGELOG.md` disagree. → Bump all three together.
46. **Styles or theme are subtly off.** Vite/Uno/Vuetify configs were hand-rolled. → Use the
    `createAnt*` factories; pass overrides instead of replacing them.
47. **A test for an error path passes when it shouldn't.** In tests, the mocked `useApi`
    swallows errors even with `throwError: true`. → Assert on `api.error` / UI state, not on a
    thrown error. [testing.md](testing.md)

## See also

[AGENTS.md](../AGENTS.md) · [calling-the-api.md](calling-the-api.md) ·
[signals-and-realtime.md](signals-and-realtime.md) · [shell-integration.md](shell-integration.md)
