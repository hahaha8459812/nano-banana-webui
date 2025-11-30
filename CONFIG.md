# 配置文件说明（config/app.config.json）

项目运行时会从根目录的 `config/app.config.json` 读取后端相关配置。该文件使用 JSON 格式，可参考 `config/app.config.example.json` 进行复制与修改。以下为各字段含义：

## 根节点结构

```json
{
    "auth": { ... },
    "apiConfigs": [ ... ]
}
```

目前包含 `auth`（登录认证配置）和 `apiConfigs`（可用的 API 端点列表）两个部分。

## auth

| 字段              | 类型   | 说明                                                                 |
|-------------------|--------|----------------------------------------------------------------------|
| `password`        | string | （可选）明文密码。与 `passwordHash` 二选一；若同时存在，优先校验 `passwordHash`。 |
| `passwordHash`    | string | （可选）使用 bcrypt 生成的密码哈希。这样可避免将明文写入配置。                       |
| `jwtSecret`       | string | 用于签发和校验登录 token 的密钥；务必填写随机字符串。                               |
| `tokenExpiresIn`  | string | token 有效期，传入 JWT 支持的写法（如 `12h`、`7d` 等）。默认 `12h`。                |

## apiConfigs

`apiConfigs` 为数组，可配置多个可供选择的模型端点。在前端登录后会展示列表供用户切换。单个配置包含以下字段：

| 字段          | 类型   | 说明                                                                                  |
|---------------|--------|---------------------------------------------------------------------------------------|
| `id`          | string | 配置唯一 ID，可自定义英文 / 数字 / 连字符。                                           |
| `label`       | string | 前端展示的名称。                                                                      |
| `endpoint`    | string | 实际调用 API 的地址（OpenRouter / 自建兼容端等）。                                   |
| `model`       | string | 默认使用的模型 ID，例如 `google/gemini-2.5-flash-image-preview:free`。               |
| `description` | string |（可选）描述信息，会在前端展示。                                                      |
| `apiKey`      | string | 调用该端点所需的 API Key；所有生成请求都会在服务器端使用此密钥，前端不会暴露。      |

配置示例：

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
            "apiKey": "sk-xxxxxxxxxxxxxxxx"
        }
    ]
}
```

## 使用建议

1. **不要直接修改示例文件**：拷贝 `config/app.config.example.json` 为 `app.config.json`，然后编辑后者。
2. **保护敏感信息**：`app.config.json` 不要加入版本控制，可在部署时通过环境变量或密钥管理系统注入。
3. **多端点切换**：如需提供多个模型，只需在 `apiConfigs` 中追加对象，前端登录后即可下拉选择。
4. **密码管理**：推荐将 `passwordHash` 设置为使用 `bcrypt` 生成的哈希，避免在文件中存放明文密码。
