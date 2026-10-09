# Developing, building and publishing

> **TL;DR** Develop with `pnpm dev`, viewed inside ANT-OS at `/developer/<port>`. `pnpm build` produces
> `dist/app.zip` for the App Store. A published app is installed on a license, then activated per
> project, and activation creates the tables your `app-config.json` declares.
> **Use when** running the app locally, cutting a release, or deciding how to host the app.

## Rules

- **Keep three versions in step:** `package.json` `version`, `app-config.json` `version` and the newest
  heading in `CHANGELOG.md`.
- **Write the CHANGELOG and README for users.** Both are bundled into the build and shown in the App Store.
- **Declare tables in `app-config.json`; don't create them from code.** Activation creates and updates
  them for you.
- **Treat columns as permanent.** Activation adds and updates columns but never drops them, so removing or
  renaming a column in the manifest does not remove the old column or its data.
- **To publish, you need an ANT license of your own.** External parties get their own ANT license, and
  that license lets them publish apps.

## Canonical pattern: a release

1. Bump `version` in `package.json` **and** `app-config.json` to the same number.
2. Add a `CHANGELOG.md` entry for that version, written for your users.
3. `pnpm build`, then check that `dist/app.zip` contains `app-config.json`, `README.md` and `CHANGELOG.md`.
4. Upload `dist/app.zip` as a new version in the App Store, and release it on a channel.

## Local development

```bash
pnpm install
pnpm dev            # serves the app on http://localhost:5174
```

Open ANT-OS and go to **`/developer`** (port 5174) or **`/developer/<port>`** for another port. The
developer route loads `http://localhost:<port>` inside the OS as a regular app frame. You then get the
real handshake, context, toolbar, signals and API proxy, using your own login and the license/project you
select in the OS.

Opening `http://localhost:5174` directly gives you a page with no OS around it. The app then waits for a
host that never answers. See [shell-integration.md](shell-integration.md).

## Build output

```bash
pnpm build
```

1. Clears `dist/`, then runs `vite build`.
2. Copies `app-config.json`, `README.md` and `CHANGELOG.md` into `dist/`.
3. Zips everything into **`dist/app.zip`**, which is what you upload as a new version.

Check before uploading:

```bash
unzip -l dist/app.zip | grep -E 'app-config.json|README.md|CHANGELOG.md'
```

The Vite factory builds with `base: '/__APP_URL__/'`. Leave that alone for apps uploaded to the App
Store.

## The lifecycle in the App Store

The SDK's `connect.apps` service describes the model:

| Step | What happens |
|---|---|
| **App** | Created once by the publisher. It carries title, description, media and category. |
| **Version** | One per uploaded `app.zip`. The store reads the version's `app-config.json`, `README.md` and `CHANGELOG.md`. |
| **Release channel** | Every app has a default channel, and you can add more (for example a beta channel limited to specific licenses). Each channel points at an active version. |
| **Install** | A license installs the app (`installApp(licenseId, versionId, channelId?)`). This makes it available inside that license. |
| **Activate** | The app is activated in a project (`activateApp(projectId, versionId, channelId?)`). This is when project tables from `app-config.json` are created or updated. Tables with `"context": "license"` are created at license level instead. |
| **Update** | Licenses and projects follow their channel; auto-update can be switched on per license or project. |
| **Deprecate** | A publisher can deprecate an app with a message, and later undeprecate it. |

**Shared tables.** If two apps declare the same table name in the same scope, they share it: both
read and write the same records. This is a valid way for apps to work on common data. Keep the column
declarations compatible, because both apps' activations update the same table.

Bump the version for every upload, and describe the change in `CHANGELOG.md` the way a user would
want to read it.

## Externally hosted apps

Instead of uploading a zip, an app can be registered with an **absolute URL** that you host
yourself. Third parties may do this. Two consequences:

1. **Assets and base path are yours.** Override the factory's `base` to the path you serve from:

   ```ts
   // vite.config.ts
   export default createAntViteConfig(import.meta.url, { base: '/' })
   ```

2. **You may authenticate with your own token.** By default `useCommsClient()` sends every `connect.*`
   call through the OS, which adds the user's session and the current license/project/task. An
   externally hosted app can use its own API client instead:

   ```ts
   import { newAntConnect, newAntHttpClient } from '@antcde/connect-ts'
   import { useCommsClient } from '@antcde/vue-utils'

   const connect = newAntConnect(newAntHttpClient({ baseUrl: 'https://<your ANT API host>', token }))
   const comms = useCommsClient(connect)
   ```

   In this mode the calls go straight from your app to the API with your token. The OS does **not** add
   anything:
   - pass license, project and task ids explicitly in every call;
   - handle 401/403 and token refresh yourself;
   - expect no automatic error toast for failed calls.

   Context, toolbar, notifications and signals still come from the OS as usual.

3. **Your origin and the environment's CORS.**
   - **DMS uploads need nothing:** with `comms.uploadDmsFiles` the OS performs the transfer from its
     own origin. A presigned `PUT` you make yourself is refused from your domain; see
     [capabilities/files-dms.md](capabilities/files-dms.md#uploading-files-commsuploaddmsfiles).
   - **In own-token mode, every API call leaves from your domain.** The environment's API CORS
     allowlist must contain your exact origin. Ask the environment's operator to add it.

Most apps should keep the default proxy mode: the app holds no token at all, and access is always
exactly what the signed-in user is allowed to do. See [calling-the-api.md](calling-the-api.md).

## Don't

- Don't upload a zip whose `app-config.json` version differs from `package.json`.
- Don't rename or retype a column in the manifest and expect the old one to disappear.
- Don't create your app's tables from code at runtime. Declare them, and let activation create them.
- Don't hard-code license or project ids. They come from the context (proxy mode) or from your own
  configuration (own-token mode).

## See also

- [app-manifest.md](app-manifest.md): every `app-config.json` field
- [capabilities/tables.md](capabilities/tables.md): using the tables you declared
- [app-anatomy.md](app-anatomy.md): scripts and project layout
- [concepts.md](concepts.md): licenses, projects and how apps fit in
- [pitfalls.md](pitfalls.md)
