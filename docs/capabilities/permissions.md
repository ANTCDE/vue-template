# Permissions

> **TL;DR** Users get permissions per license and per project through roles. The OS sends them to
> your app in `comms.context`. Check them with `usePermissions(context)` to show or hide UI. The
> API enforces them regardless.
> **Use when** a button, a screen or a write action should only appear for users who may use it.

## Concepts

- **Two levels:**
  - `context.value.license.user_permissions` and `.user_is_admin`
  - `context.value.project.user_permissions` and `.user_is_admin`

  Both permission maps are `Record<permissionName, boolean>`. Roles are listed in `user_roles`.
- **Global admin.** `context.value.user.is_admin` marks a platform administrator.
- **Admin bypass.** These are the rules in `usePermissions` (published `@antcde/vue-utils`):
  - A global admin or a license admin passes every `hasLicense*` and `hasProjectPermission` check.
  - `isProjectAdmin` is true for the project's own admin **and** for a license admin.
  - `hasProjectPermission` does **not** include the project's own admin. When a project admin
    should pass, check `isProjectAdmin || hasProjectPermission(…)` yourself.
- **Resource-level permissions.** Some resources carry their own:
  - Every dynamic table query result has `permissions['tables.read' | 'tables.create' | …]`
    (see [tables.md](tables.md)).
  - Every DMS file has `permissions['dms.read' | 'dms.upload' | 'dms.delete' | 'dms.configure']`
    (see [files-dms.md](files-dms.md)).
- **Archived projects.** `context.value.projectReadOnly` is `true` when the selected project is
  archived. The API refuses every write there, whatever the user's permissions.

## Rules

- Read permissions from `comms.context`. Don't fetch them yourself; the OS keeps them up to date
  when the user switches license or project.
- Treat checks in the UI as UX only. The API enforces every permission, so the only purpose of
  gating is that users never see a button that will fail.
- Hide or disable write actions when `projectReadOnly` is true, before the user meets a refusal.
- For **table** actions, use the table's `permissions` combined with `isProjectAdmin` (the
  template's Tables example shows how).
- For **file** actions, use each file's own `permissions` as they are. The server already computed
  them, admin rights included. For a folder, rename and move depend on its parent's permissions.
- Fail closed. With no license or project selected, `usePermissions` returns `false`, and your UI
  should treat that as "not allowed".

## Canonical pattern

The template exposes `permissions` once, from `src/stores/app.store.ts`:

```ts
// src/stores/app.store.ts
const permissions = usePermissions(context) // context = injectContext().comms.context

// anywhere
const { permissions, projectReadOnly } = useGlobalStore()
const canConfigureTriggers = computed(() =>
  !projectReadOnly.value
  && (permissions.isProjectAdmin.value || permissions.hasProjectPermission('triggers.configure')))
```

```vue
<v-btn v-if="canConfigureTriggers" :text="t('triggers.new')" @click="create" />
```

`usePermissions(context)` returns:

| Member | Type | Meaning |
|---|---|---|
| `isGlobalAdmin` | `ComputedRef<boolean>` | Platform administrator |
| `isLicenseAdmin` | `ComputedRef<boolean>` | Admin of the selected license |
| `isProjectAdmin` | `ComputedRef<boolean>` | Admin of the selected project, or a license admin |
| `hasLicensePermission(name)` | `boolean` | License permission (admins pass) |
| `hasLicenseRole(roleName)` | `boolean` | Holds a license role with this name (admins pass) |
| `hasProjectPermission(name)` | `boolean` | Project permission (global and license admins pass) |
| `hasProjectRole(roleName)` | `boolean` | Holds a project role with this name (all admins pass) |

## Permission names (typed in the published SDK)

| License (`LicensePermission`) | Project (`ProjectPermission`) |
|---|---|
| `projects.create`, `projects.update`, `projects.delete` | `tasks.read`, `tasks.configure` |
| `triggers.read`, `triggers.configure` | `triggers.read`, `triggers.configure` |
| `tables.configure` | `tables.configure` |
| `apps.configure` | `apps.configure` |
| `rbac.configure` | `rbac.configure` |
| `users.configure` | `users.read`, `users.configure` |
| | `sbs.configure` |

The maps are also typed `Record<string, boolean>`, so other permission names the backend sends can
be checked too, e.g. `dms.read`, `dms.upload`, `dms.delete` and `dms.configure` on a project. An
unknown name returns `false`.

Prefer permissions over role names: a license can rename its roles, but permission names are
stable.

## Managing access (rarely needed)

Most apps only **check** permissions. Users and roles are managed in the OS's RBAC apps. If your
app really has to manage access:

| Call | Purpose |
|---|---|
| `rbacRoles.fetchRoles(resourceType, resourceId)` | Roles of a license or project |
| `rbacRoles.createRole` / `updateRole` / `deleteRole` | Manage roles |
| `rbacRoles.givePermission` / `revokePermission` / `syncPermissions` | Change a role's permissions |
| `rbacRoles.addUserRole` / `removeUserRole` / `syncUsers` | Assign users to roles |
| `rbacPermissions.fetchUserRolesAndPermissions(resource, resourceId)` | The current user's roles and permissions |
| `rbacPermissions.giveUserResourcePermissions` / `revokeUserResourcePermissions` | Direct, per-resource grants to a user |

## Don't

- Don't use permission checks as security. A hidden button is not an authorization layer.
- Don't call `hasProjectPermission` alone where project admins should also pass.
- Don't cache permissions across a license or project switch. Derive them with `computed` from the
  context, as `usePermissions` does.

## See also

[tables.md](tables.md) · [files-dms.md](files-dms.md) · [triggers.md](triggers.md) ·
[../concepts.md](../concepts.md) · [../shell-integration.md](../shell-integration.md)
