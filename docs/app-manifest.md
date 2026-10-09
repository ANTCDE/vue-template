# The app manifest: `app-config.json`

> **TL;DR** `app-config.json` tells ANT-OS and the App Store what your app is (`title`,
> `version`, `tagline`), which tables it needs (`tables`), which app-to-app topics it uses
> (`signals.topics`), and which deep-link parameters and intents it supports (`capabilities`).
> It is bundled into the build and sent to the OS when the app connects.
> **Use when** your app needs its own data tables, talks to other apps, or should be
> deep-linkable or drivable by the OS assistant.

The file has a JSON Schema. Keep the `$schema` line, and your editor will autocomplete and
validate:

```json
{ "$schema": "node_modules/@antcde/connect-ts/schemas/app-config.schema.json" }
```

The schema is lenient on purpose: unknown keys are allowed and not used. Stick to the keys below.

## Rules

- Keep `version` equal to `package.json` and the newest `CHANGELOG.md` entry.
- Give tables a distinctive uppercase prefix for your app (`ACME_…`).
- Treat columns as permanent: activation adds and updates columns but never drops them.
- Declare the topics you send or receive, and the query parameters you read.
- Keep the `$schema` line, so editors validate the file.

## Canonical pattern

The template's own `app-config.json`: one project table (`TEMPLATE_NOTES`), one topic
(`template-note-selected`) and one deep-link parameter (`noteId`). Each is used by an example tab.

## Top level

| Key | Required | Meaning |
| --- | --- | --- |
| `version` | yes | Semver. Must equal `package.json` `version` and the newest `CHANGELOG.md` entry |
| `title` | | App name shown in the App Store |
| `tagline` | | One-line description shown in the App Store |
| `tables` | | Tables created when the app is activated. Use `[]` if none |
| `signals` | | App-to-app topics |
| `capabilities` | | Deep-link query parameters and intents |

## `tables`

```json
"tables": [
  {
    "name": "TEMPLATE_NOTES",
    "context": "project",
    "columns": [
      { "name": "title", "type": "text", "required": true, "hint": "Short title of the note" },
      { "name": "body", "type": "text-field" },
      { "name": "status", "type": "dropdown", "options_value": ["open", "done"], "default_value": "open" },
      { "name": "due", "type": "date" }
    ]
  }
]
```

**Table keys**

| Key | Meaning |
| --- | --- |
| `name` | Table name, unique within the app. Use a distinctive uppercase prefix for your app (`ACME_INSPECTIONS`); the name is how you query it |
| `context` | `project` (default): one table per project the app is activated in. `license`: one license-wide table |
| `master_table` | Marks the app's primary table |
| `columns` | At least one column |

**Column keys**

| Key | Meaning |
| --- | --- |
| `name` | Column name. Reserved: `id`, `session`, `created_at`, `updated_at`, `deleted_at` |
| `type` | `text`, `text-field` (long text), `integer`, `float`, `boolean`, `date`, `dropdown`, `email`, `link`, `document` (file), `sbscode`, `table` |
| `required` | Value required |
| `is_unique` | Values unique across the **whole** table (not per project or per anything else) |
| `is_indexed` | Indexed for filtering. At most 2 per table; not allowed on `text-field` or `link` |
| `default_value` | Default for new records. For a dropdown, one of `options_value` |
| `options_value` | Allowed values; required for `dropdown` |
| `hint` | Help text shown to users |
| `field_name` | Display name in the UI |

**What activation does.** Tables are created when a license activates the app in a project
(project tables) or for the license (license tables). Activating a new version **creates and
updates columns but never drops them**. A column you remove from the manifest keeps existing
with its data, so plan renames as "add new, migrate, stop using old". If the project already
has a table with the declared name, activation **adopts** it: it adds missing columns and updates
`required`, `is_unique` and `hint` on existing ones.

**Local development.** An app opened from `/developer/<port>` is never activated, so its declared
tables don't exist yet. See [app-anatomy.md](app-anatomy.md#declared-tables-dont-exist-in-developer-mode)
for the two ways to get them.

**Shared tables.** Several apps may declare the same table name. They then simply work on the
same data, which is a legitimate way for apps to share a dataset. Keep their column
declarations compatible.

How to read and write these tables: [capabilities/tables.md](capabilities/tables.md).

## `signals`

```json
"signals": {
  "topics": {
    "template-note-selected": {
      "scope": "project",
      "description": "Published when a user picks a note, so other apps can follow along.",
      "direction": ["send", "receive"],
      "schema": {
        "type": "object",
        "properties": { "message": { "type": "string" } },
        "required": ["message"]
      }
    }
  }
}
```

| Key | Meaning |
| --- | --- |
| topic name (the object key) | Letters, digits, `-`, `_`; no dots |
| `scope` | `project` (default) or `license`: who shares the channel |
| `description` | Shown in the App Store |
| `direction` | `["send"]`, `["receive"]` or both; defaults to `["receive"]` |
| `schema` | JSON Schema of `data`. Documentation for other app developers, not enforced at runtime |

The declaration documents your app's contract. Sending and receiving happen at runtime with
`signal({ topic })`. See [signals-and-realtime.md](signals-and-realtime.md#topics-app-to-app-messages).

## `capabilities`

Describes what the app can be **driven to do via the URL**. The OS uses it to filter and
validate the app-state it keeps in the URL, and its assistant uses it to build tools that open
your app in a given state.

```json
"capabilities": {
  "queryParams": {
    "noteId": { "type": "string", "description": "Id of the selected note.", "access": "readwrite" }
  },
  "intents": [
    { "id": "open-note", "description": "Open a specific note.", "params": ["noteId"] }
  ]
}
```

**`queryParams.<name>`**

| Key | Meaning |
| --- | --- |
| `type` | `string`, `number`, `boolean`, `date`, `time`, `datetime`. On the URL every value is a string; the type is a hint |
| `description` | What it does. The assistant reads this |
| `enum` | Allowed values |
| `multiple` | Several values (comma-separated on the URL) |
| `required` | Must be supplied to open the app |
| `access` | `read`: only reflects app state, never set from outside. `write` / `readwrite` (default): may be set to drive the app |

**`intents[]`:** `id` and `description` are required, and `params` lists the `queryParams` the
intent uses. Write descriptions for a reader who has never seen your app; the assistant matches
user requests against them.

Implementing a parameter means two things: read it at startup from
`context.initialRouteQuery`, and send changes back with `signal({ route: { query } })`. See
[shell-integration.md](shell-integration.md#navigation-and-url) and
`src/examples/tables/TablesExample.vue`.

## Sending the manifest to the OS

The template passes the manifest during the handshake:

```ts
import rawManifest from '../../app-config.json?raw'
const comms = useCommsClient(undefined, undefined, JSON.parse(rawManifest))
```

Keep this. The OS uses it for the running app (its manifest view, the assistant's tools),
independently of the copy in the App Store.

## Don't

- Don't remove or rename a column and expect the old one to disappear.
- Don't rely on `is_unique` per project. It is table-wide.
- Don't add keys the schema doesn't know. They are ignored.

## See also

- [publishing.md](publishing.md): versions, install and activation
- [capabilities/tables.md](capabilities/tables.md)
