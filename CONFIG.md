# NanoBanana Configuration Guide (`config/app.config.json`)

During startup the backend loads `config/app.config.json` to determine how users authenticate, which API endpoints can be used, and what prompt templates should be available. The file is JSON and can be edited by hand or maintained through the web UI—changes are written back immediately.

> Tip: always edit a copy of `app.config.example.json` and keep the real file out of version control.

---

## Top-Level Structure

```json
{
  "auth": { ... },
  "apiConfigs": [ ... ],
  "templates": [ ... ],
  "defaultApiConfigId": "optional-id"
}
```

- `auth` – login password / hash and JWT settings.
- `apiConfigs` – array of backend endpoints (each entry contains the secret API key).
- `templates` – default prompt templates shown in the workspace.
- `defaultApiConfigId` – optional ID that should be preselected when the front end loads. If omitted, the first config is used.

---

## `auth`

| Field             | Type   | Description                                                                 |
|-------------------|--------|-----------------------------------------------------------------------------|
| `password`        | string | Plain-text password (optional). Use only during development.                |
| `passwordHash`    | string | Bcrypt hash of the password (recommended). When both exist, hash is used.   |
| `jwtSecret`       | string | Secret for signing/verifying JWT tokens. Must be a random string.           |
| `tokenExpiresIn`  | string | JWT expiration (e.g. `"12h"`, `"7d"`). Defaults to `12h` if omitted.        |

> Generate a hash with `npx bcrypt-cli hash yourPassword`.

---

## `apiConfigs`

Each configuration describes one upstream model endpoint. The front end lists them, allows selecting a default, and never exposes the `apiKey`.

| Field          | Type   | Description                                                                 |
|----------------|--------|-----------------------------------------------------------------------------|
| `id`           | string | Unique identifier (letters, numbers, hyphen). Used internally and in logs.  |
| `label`        | string | Display name shown in the UI.                                               |
| `endpoint`     | string | Complete API URL (e.g. OpenRouter `/chat/completions`).                     |
| `model`        | string | Default model name. Users can override it after fetching model list.        |
| `description`  | string | Optional helper text shown under the card.                                  |
| `apiKey`       | string | Secret key used when calling the endpoint. Stored server-side only.         |

> The web UI allows creating/updating/deleting these entries via authenticated API calls; manual edits are still supported.

---

## `templates`

Prompt templates displayed inside the workspace card. Users can add, edit, or delete templates through the UI, and the changes are saved back to this file.

| Field          | Type   | Description                                                                 |
|----------------|--------|-----------------------------------------------------------------------------|
| `id`           | string | Unique identifier. If omitted when creating via UI, one is generated.       |
| `title`        | string | Template name.                                                              |
| `description`  | string | Short helper text (optional).                                               |
| `prompt`       | string | The full prompt content sent to the model.                                  |
| `image`        | string | Optional preview image URL (e.g. `/samples/figurine.png`).                  |

---

## Example

```json
{
  "auth": {
    "passwordHash": "$2a$10$examplehash",
    "jwtSecret": "super-secret-string",
    "tokenExpiresIn": "12h"
  },
  "defaultApiConfigId": "openrouter-default",
  "apiConfigs": [
    {
      "id": "openrouter-default",
      "label": "OpenRouter 免费模型",
      "endpoint": "https://openrouter.ai/api/v1/chat/completions",
      "model": "google/gemini-2.5-flash-image-preview:free",
      "description": "默认使用 OpenRouter 免费 Gemini 2.5 Flash Image 模型",
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    },
    {
      "id": "gemini-pro",
      "label": "Gemini 3 Pro",
      "endpoint": "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent",
      "model": "gemini-3-pro-image",
      "description": "启用 Google Search / 自定义比例",
      "apiKey": "AIza..."
    }
  ],
  "templates": [
    {
      "id": "figurine",
      "title": "潮玩手办风格",
      "description": "将角色转化为逼真手办，包含包装盒和制作过程细节",
      "prompt": "Using the nano-banana model, create ...",
      "image": "/templates/figurine.png"
    }
  ]
}
```

---

## Operational Tips

- **Backup often**: `app.config.json` is the single source of truth for API keys, templates, and defaults. Keep encrypted backups.
- **Consider read-only mounts**: In production you may mount the config file as read-only and rely on CI/CD to deliver updates, but remember that the UI will be unable to save API or template changes in that mode.
- **Sensitive data**: The file contains API keys in plain text. Avoid committing it to Git, and restrict access on the server.

With this reference you can safely customize all runtime behaviors before starting the NanoBanana backend.
