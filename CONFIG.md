# 配置文件说明（config/app.config.json）

项目运行时会从根目录的 `config/app.config.json` 读取后端相关配置。该文件使用 JSON 编写，可先复制 `config/app.config.example.json` 再定制内容。下面对各字段逐一说明。

## 根节点结构

```json
{
  "auth": { ... },
  "apiConfigs": [ ... ],
  "templates": [ ... ]
}
```

包含三个主要部分：

- `auth`：登录认证与 token 行为。
- `apiConfigs`：可供前端切换的模型端点列表。
- `templates`：前端“模板管理”卡片的初始内容。

## auth

| 字段              | 类型   | 说明                                                                 |
|-------------------|--------|----------------------------------------------------------------------|
| `password`        | string | （可选）明文密码。与 `passwordHash` 二选一；若同时存在，优先校验 `passwordHash`。 |
| `passwordHash`    | string | （可选）由 bcrypt 生成的密码哈希，用于避免在文件中存放明文。                         |
| `jwtSecret`       | string | JWT 签发与验证所需的密钥，请填写随机字符串。                                     |
| `tokenExpiresIn`  | string | token 有效期，遵循 JWT 的持续时间写法（如 `12h`、`7d` 等），默认 `12h`。          |

## apiConfigs

`apiConfigs` 是数组，可配置多个 API 端点，前端会在“API 配置”卡片展示供用户切换。单个配置包含以下字段：

| 字段          | 类型   | 说明                                                                                  |
|---------------|--------|---------------------------------------------------------------------------------------|
| `id`          | string | 唯一 ID，可使用英文、数字或连字符；用于区分配置并在图库记录来源。                               |
| `label`       | string | 前端展示名称。                                                                          |
| `endpoint`    | string | 实际请求的 API 地址（例如 OpenRouter、兼容的自建服务等）。                               |
| `model`       | string | 默认模型 ID，如 `google/gemini-2.5-flash-image-preview:free`。                          |
| `description` | string | （可选）描述信息。                                                                      |
| `apiKey`      | string | 服务器端调用该端点所需的 API Key，永远不会传给前端。                                          |

## templates

`templates` 是初始提示词模板列表，登录后可在前端继续增删改。每项字段如下：

| 字段         | 类型   | 说明                                                                 |
|--------------|--------|----------------------------------------------------------------------|
| `id`         | string | 唯一标识符。                                                         |
| `title`      | string | 模板名称。                                                           |
| `description`| string | （可选）用于在前端展示的简要说明。                                   |
| `prompt`     | string | 发送给模型的提示词模板内容。                                         |
| `image`      | string | （可选）演示图路径。默认为 `public/` 或 `static/` 下的静态资源 URL。 |

模板数据存储在 `app.config.json` 中，前端的所有编辑都会实时写回；若不希望被覆盖，可在前端关闭模板编辑或在部署层提供只读挂载。

## 配置示例

```json
{
  "auth": {
    "password": "changeme",
    "passwordHash": "",
    "jwtSecret": "please-change-me",
    "tokenExpiresIn": "12h"
  },
  "apiConfigs": [
    {
      "id": "openrouter-default",
      "label": "OpenRouter 免费模型",
      "endpoint": "https://openrouter.ai/api/v1/chat/completions",
      "model": "google/gemini-2.5-flash-image-preview:free",
      "description": "默认使用 OpenRouter 免费 Gemini 2.5 Flash Image 模型",
      "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ],
  "templates": [
    {
      "id": "figurine",
      "title": "潮玩手办风格",
      "description": "将角色转化为逼真手办，包含包装盒和制作过程细节。",
      "prompt": "Using the nano-banana model...",
      "image": "/1.png"
    }
  ]
}
```

## 使用建议

1. **勿直接修改示例文件**：先复制 `config/app.config.example.json` 为 `app.config.json`，后续只动后者。
2. **保护敏感信息**：`app.config.json` 不应进入版本库，可通过部署脚本或秘密管理系统下发。
3. **多端点切换**：要支持多个模型，只需在 `apiConfigs` 数组追加配置；前端会自动刷新列表。
4. **密码安全**：推荐使用 `bcrypt` 生成的 `passwordHash`，避免明文密码泄露。
5. **模板版本管理**：生产环境若需固定模板，可改为只读挂载并通过后端接口或额外配置文件同步。
