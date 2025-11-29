# NanoBanana Web UI

基于 **Vue 3 + TypeScript + TailwindCSS + Vite** 的多模态生图工作台，后端内置 Node.js 服务负责安全持久化 API 密钥、执行 OpenRouter/Gemini 请求，并将结果同步到图库。

## ✨ 主要特性

- 🔐 **密码登录 + 角色分离**：API Key、安全配置都存放在服务器，前端仅需密码即可启用工作区。
- 🧩 **多套 API 配置**：支持在配置文件中维护多个 endpoint/model/key 组合，前端可随时切换并拉取模型列表。
- 🧠 **Gemini/OpenRouter 兼容**：后端自动构造兼容的请求体，支持 Gemini 3 Pro Image 额外参数、宽高比、Google Search 等选项。
- 🗂 **工作区 + 图库**：生成结果连同模型文本回复自动同步到服务器图库并在前端实时展示，可再次下载或二次创作。
- 📝 **模板管理**：预设提示词改为服务器配置，前端可新增/编辑/删除模板，无需改动代码重启即可应用。

## 📁 目录结构

```
.
├─ package.json          # 前端依赖及脚本
├─ server/               # Node.js 后端
│  ├─ index.js           # Express 入口，静默调用 OpenRouter/Gemini
│  ├─ package.json       # 后端依赖
│  ├─ config/
│  │  └─ app.config.example.json  # 配置样例，复制为 app.config.json 后使用
│  ├─ data/
│  │  └─ gallery.json    # 图库索引（运行时自动生成）
│  └─ gallery/           # 实际图片文件（运行时自动生成）
├─ src/                  # 前端源码
│  ├─ components/        # 工作区、图库、配置面板等 Vue 组件
│  ├─ config/client.ts   # API Base URL 配置
│  ├─ services/backend.ts# 前端调用后端接口的封装
│  └─ App.vue            # 顶层界面（登录/工作区/图库）
└─ README.md
```

## ⚙️ 服务器配置（重要）

1. 复制 `server/config/app.config.example.json` 为 `app.config.json`，根据需要修改字段：
    - `auth.password` 或 `auth.passwordHash`：登录密码（可直接明文，也可填入 bcrypt hash）。
    - `auth.jwtSecret`：任意随机字符串，用于签发 token。
    - `apiConfigs`：数组，每个对象包含 `id/label/endpoint/model/apiKey/description`。
    - `templates`：初始提示词模板，可在运行时通过前端再编辑。
2. 建议在服务器上执行 `npm install` 并使用 PM2/systemd 等守护方式运行 `node server/index.js`。

> **提示**：后端会把生成的图片存到 `server/gallery/`，索引存到 `server/data/gallery.json`，仓库已忽略这些文件，部署时请自行做好备份策略。

## 🚀 启动步骤

```bash
# 安装前端依赖
npm install

# 安装并启动后端
cd server
npm install
npm run start   # 或 npm run dev（nodemon 自动重启）

# 启动前端开发服务器
cd ..
npm run dev
```

前端默认走 `http://localhost:3000`，后端监听 `http://localhost:51130`。如需自定义后端地址，可在 `.env` 中设置 `VITE_API_BASE_URL`。

## 🧑‍💻 使用流程

1. 访问前端后输入服务器配置的密码登录；
2. 在“API 配置”面板选择一套后端保存的 endpoint + model；需要时可以点击“获取模型列表”按钮，由后端带着密钥去请求；
3. 进入“工作区”上传参考图/选择模板或自定义提示词，可分别执行“纯提示词”或“图文混合”生成；
4. 生成完毕后，图片 + 文本回复会自动保存到服务器图库，前端的“图库”页签会即时展示；
5. 如需反复创作，可直接把结果推回上传列表，或者在模板面板中编辑/新增提示词（会写回配置文件）；
6. 若需对生成内容做备份，直接下载 `server/gallery` 目录，或在图库界面逐个下载。

## 📝 额外说明

- `ResultDisplay` 组件会展示最新图片与模型回复文本，并允许直接下载或“二次创作”。
- `StylePromptSelector` 新增模板管理表单，每次操作都会通过后端写入 `app.config.json`，无需重启。若多人协作，注意做好文件同步。
- `GalleryView` 只展示元数据和静态链接，如果要对图像做 CDN/OSS 托管，可把 `server/gallery` 指向真正的存储目录，再通过 Nginx 等挂载。
- 默认开放的 API 端口带有 CORS 头，如需上生产环境，建议在反向代理层做 IP 白名单或 Basic Auth，以防止密码被撞库。

## 📄 许可证

MIT License
