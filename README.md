# NanoBanana Web UI

NanoBanana 是一款基于 **Vue 3 + TypeScript + TailwindCSS + Vite** 的多模态工作台，后端使用 **Express（Node.js）** 提供统一 API，负责安全地保存密钥、转发请求到 Gemini / OpenRouter，并将生成结果写入图库。

---

## 🌟 核心特性

- **安全的密钥管理**：用户只需要输入登录密码，真正的 API Key 永远保留在服务器。
- **可视化 API 配置**：在前端即可新增 / 编辑 / 删除多套 endpoint，并设定默认配置。
- **模板 + 图库闭环**：提示词模板可以在线维护；生成结果会记录到图库，可查看详情、下载原图、删除记录。
- **Gemini / OpenRouter 特性**：支持 Gemini 3 Pro Image 的宽高比、分辨率以及 Google Search 等扩展参数。
- **部署灵活**：可在本地运行，也支持 Docker Compose；前端可以通过 `VITE_API_BASE_URL` 指向任意后端。

---

## 📦 目录概览

```
.
├── server/                    # Node.js 后端
│   ├── index.js               # Express 入口
│   ├── config/app.config.json # 运行时配置（复制 example 后修改）
│   ├── data/gallery.json      # 图库索引（自动生成）
│   └── gallery/               # 生成的图片（自动生成）
├── src/                       # Vue 前端
│   ├── components/            # API 配置卡片、图库等组件
│   ├── services/backend.ts    # 调用后端的封装
│   └── App.vue
├── docker-compose.yml
├── Dockerfile.frontend
├── Dockerfile.server
├── CONFIG.md                  # 配置字段说明
└── README.md
```

---

## ⚙️ 环境要求

- Node.js ≥ 18、npm ≥ 9（本地开发需要）
- Docker + Docker Compose v2（推荐用于部署）

---

## 🔐 快速配置

1. 复制示例文件
   ```bash
   cp server/config/app.config.example.json server/config/app.config.json
   ```
2. 编辑 `app.config.json`：
   - `auth`：配置登录密码（明文或者 bcrypt hash）和 `jwtSecret`
   - `apiConfigs`：至少一条 endpoint（包含 `id`、`endpoint`、`model`、`apiKey` 等）
   - `templates`：可选，预置提示词
3. 启动服务器后，会自动在 `server/gallery/`、`server/data/` 生成图库相关文件。

详细字段可参考 [CONFIG.md](CONFIG.md)。

---

## 🧑‍💻 本地开发

```bash
# 安装前端依赖
npm install

# 运行后端（另开终端）
cd server
npm install
npm run start

# 回到根目录，运行前端
cd ..
npm run dev
```

- 前端默认地址：`http://localhost:5173`
- 后端默认地址：`http://localhost:51130`
- 需要连接远程后端时，在根目录 `.env` 中设置 `VITE_API_BASE_URL=http://your-server:51130`

---

## 🐳 Docker Compose

```bash
git clone https://github.com/hahaha8459812/nano-banana-webui.git
cd nano-banana-webui
cp server/config/app.config.example.json server/config/app.config.json
# 修改配置后
docker compose up -d --build
```

- `frontend` 映射 `51131:80`
- `backend` 映射 `51130:51130`
- 图库文件存储在 `gallery-data`、`gallery-meta` 卷中
- 浏览器访问 `http://服务器IP:51131`，在登录界面填入后端地址（如 `http://服务器IP:51130`）并保存，再输入密码使用

---

## 🧑‍🎨 使用流程

1. **登录**：输入密码 + 后端 API 地址（浏览器会记住）
2. **API 配置卡片**：展开折叠面板后，可创建/编辑/删除配置、设置默认项、刷新模型列表
3. **工作区**：选择模板或自定义提示词，上传参考图，设置宽高比 / Gemini 3 Pro 配置，触发纯提示词或图文生图
4. **图库**：分页展示（桌面 4×3，移动 1×6），卡片包含时间戳与来源；点击进入详情可查看原图、模型信息、分辨率，并支持下载或删除

---

## 🔒 小贴士

- `server/config/app.config.json` 含有敏感信息，别提交到 Git，可通过 CI/CD 或密钥管理系统分发
- `server/gallery`、`server/data` 建议在生产环境挂载到持久化磁盘
- 面向公网时，可在反向代理层增加 HTTPS、Basic Auth、IP 白名单等额外保护
- 后端结构简单，如需队列、Webhook、更多接口，可在 `server/index.js` 基础上扩展

---

## 📄 License

MIT License © Nano Banana Contributors
