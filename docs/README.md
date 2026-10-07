# ANT app developer documentation

Start with [concepts.md](concepts.md) if ANT is new to you. AI assistants start at
[../AGENTS.md](../AGENTS.md).

**Foundations**

- [concepts.md](concepts.md): the shell, iframe apps, license → project → task, the app lifecycle
- [app-anatomy.md](app-anatomy.md): the template file by file; running inside ANT-OS
- [shell-integration.md](shell-integration.md): context, toolbar, notifications, notepad, URL, theme, i18n
- [calling-the-api.md](calling-the-api.md): `connect`, `useApi`, errors, pagination, service map
- [signals-and-realtime.md](signals-and-realtime.md): asking the OS, live updates, topics, channels
- [app-manifest.md](app-manifest.md): `app-config.json` reference

**Capabilities**

- [capabilities/tables.md](capabilities/tables.md): dynamic tables
- [capabilities/files-dms.md](capabilities/files-dms.md): documents and files
- [capabilities/tasks-and-workflows.md](capabilities/tasks-and-workflows.md): tasks, templates, workflows
- [capabilities/triggers.md](capabilities/triggers.md): server-side actions
- [capabilities/vault.md](capabilities/vault.md): credentials and OAuth applications
- [capabilities/scripts.md](capabilities/scripts.md): server-side Python
- [capabilities/permissions.md](capabilities/permissions.md): roles and permissions
- [capabilities/labels-sbs.md](capabilities/labels-sbs.md): labels and SBS codes
- [capabilities/types-and-templates.md](capabilities/types-and-templates.md): custom types and project templates

**Building and shipping**

- [ui-and-design.md](ui-and-design.md): tokens, shared components, accessibility
- [testing.md](testing.md): test helpers and conventions
- [publishing.md](publishing.md): build, version, publish, self-hosting
- [scenarios.md](scenarios.md): how capabilities combine (illustrative examples)
- [pitfalls.md](pitfalls.md): symptom → cause → fix

Every capability has a working example in `src/examples/`.
