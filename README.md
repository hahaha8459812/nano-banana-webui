# IMAGE 工作室（NanoBanana Web UI）

基于 **Vue 3 + TypeScript + TailwindCSS + Vite** 的多模态前端，配合 **Express（Node.js）** 后端统一托管。后端负责认证、API 配置管理、代发模型请求（OpenRouter / Gemini 等）、结果持久化到图库，并通过 `/webui` 静态提供前端。支持同步生成，也支持**异步任务 + SSE 推送**（防止长链路超时）。

---

## ✨ 特性
- **一站式托管**：同一端口 `51130` 同时提供前端 `/webui` 与 API `/api/*`。
- **安全的密钥管理**：只输入工作密码；API Key 留在后端配置，前端不会暴露。
- **模型配置面板**：前端新增/编辑/删除/设默认，支持获取模型列表。
- **模板+图库闭环**：提示词模板在线维护；生成结果落地磁盘并写入 `gallery.json`，含主图/缩略图。
- **异步生成**：提供任务队列接口与 SSE 状态推送，默认单实例内存队列+持久化，可避免长链路 504。
- **Gemini 3 Pro Image 支持**：宽高比、分辨率、Google Search 等参数。
- **稳健调用**：上游请求带超时+重试，断线时返回 502 友好提示；生成时多图候选自动选择最大分辨率，缺小图自动生成缩略图。

---

## 🗂 目录
```
.
├── server/                    # Node 后端
│   ├── index.js               # Express 入口，托管 /api 与 /webui
│   ├── config/app.config.json # 运行配置（复制 example 后修改）
│   ├── data/gallery.json      # 图库索引（自动生成）
│   └── gallery/               # 生成的图片及缩略图（自动生成）
├── src/                       # Vue 前端
│   ├── components/            # UI 组件
│   ├── services/backend.ts    # 后端调用封装
│   └── App.vue
├── docker-compose.yml         # 单容器（后端+前端静态）部署
├── Dockerfile.server          # 多阶段：先构建前端，再打包后端
├── CONFIG.md                  # 配置字段说明
└── README.md
```

---

## ⚙️ 前置
- Node.js ≥ 18（本地开发） / npm ≥ 9
- Docker + Docker Compose v2（推荐部署）

---

## 🚀 部署（Docker Compose，单容器）
```bash
git clone https://github.com/hahaha8459812/nano-banana-webui.git
cd nano-banana-webui
cp server/config/app.config.example.json server/config/app.config.json
# 编辑 app.config.json：设置登录密码/jwtSecret，填好 apiConfigs/apiKey

docker compose up -d --build
```
- 端口：`51130`（同时提供 `/api/*` 与 `/webui`）
- 持久化：`./server/gallery`、`./server/data`、`./server/config/app.config.json` 挂载到容器内
- 访问：浏览器打开 `http://<服务器IP>:51130/webui`

容器名：`image-studio`（compose 已指定）。

---

## 🧑‍💻 本地开发
```bash
# 前后端依赖
npm install
cd server && npm install && cd ..

# 启动后端
cd server && npm run start
# 启动前端（根目录）
cd .. && npm run dev
```
- 前端：`http://localhost:5173`（开发）
- 后端：`http://localhost:51130`
- 生产构建：`npm run build`（输出 `dist/`，由后端 `/webui` 托管）

---

## 🔐 配置要点（server/config/app.config.json）
- `auth.password` 或 `auth.passwordHash`：登录密码（明文或 bcrypt）
- `auth.jwtSecret`：JWT 密钥
- `apiConfigs`：至少一条，包含 `id/endpoint/model/apiKey`（可多套并设默认）
- `templates`：预置提示词（可空，前端可增删改）

详见 `CONFIG.md`。

---

## 🧭 使用流程
1) **登录**：输入密码；后端地址默认为当前站点，可一键“使用当前地址”。
2) **API 配置**：在面板中新增/编辑/删除/设默认，支持拉取模型列表。
3) **工作区**：分为文生图 / 图文生图两个模式；可设置宽高比、Gemini 3 Pro 参数，使用模板或自定义提示词、上传参考图。
4) **生成**：调用 `/api/generate`，结果自动落库；主图选最大分辨率，缩略图优先用小图，否则自动生成。
5) **图库**：分页查看、详情、下载、删除，缩略图加速列表加载。

### 异步生成（可选）
- 创建任务：`POST /api/generate/task`（参数与同步接口一致），立即返回 `taskId`。
- 推送进度：`GET /api/generate/task/:id/events`（SSE），事件含 queued/running/saving/done/error，带心跳。
- 查询状态：`GET /api/generate/task/:id`（SSE 断开时兜底）。
- 取消任务：`DELETE /api/generate/task/:id`（尽力 abort，上游不保证立刻停）。
- 环境变量：`MAX_CONCURRENT_TASKS`（默认 1）、`MAX_QUEUE_SIZE`（默认 10）、`TASK_TTL_MS`（默认 24h）、`SSE_HEARTBEAT_MS`。

---

## 🛡️ 运维提示
- 上游超时/重试：  
  - `UPSTREAM_TIMEOUT_MS`（默认 180000）  
  - `UPSTREAM_RETRIES`（默认 1）  
  - `UPSTREAM_RETRY_DELAY_MS`（默认 800）  
- 反向代理超时需大于后端超时（如 nginx `proxy_read_timeout` ≥ 180s）。SSE 需关闭 proxy buffering、保持长连接。
- 任务队列为单实例内存 + tasks.json 持久化，重启会保留历史完成/失败记录，正在跑的会标记失败；多实例需要共享队列/存储时自行扩展。
- `server/gallery`、`server/data` 建议挂载持久化磁盘。
- `app.config.json` 含敏感信息，勿提交；可用 CI/CD/密管分发。

---

## 🤝 License
MIT License © Nano Banana Contributors
