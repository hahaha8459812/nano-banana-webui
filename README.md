# IMAGE 工作室（IMAGE Studio）

一个“把任意上游 API 变成可用 WebUI”的单容器应用：同一端口同时提供后端 API 与前端页面，支持文生图/图生图（图文混合），并把生成结果持久化到图库。

- WebUI：`/webui`
- API：`/api/*`
- 默认端口：`51130`

核心设计：**生成走任务制异步**（内存队列 + tasks.json 持久化）并用 **SSE 推送进度**，避免长链路请求在反代/CDN 下出现 504。

---

## ✨ 能做什么
- **统一托管**：一个端口 `51130`，打开 `http(s)://<host>:51130/webui` 就能用。
- **安全**：只输入“工作密码”；上游 API Key 永远留在后端配置，不下发前端。
- **任意 API**：后端按 OpenAI/OpenRouter 兼容格式代发请求，可接 OpenRouter/Gemini 等上游（取决于你的 endpoint）。
- **异步生成**：创建任务即返回 `taskId`；前端通过 SSE/轮询显示“排队→调用上游→下载候选图→写盘→生成缩略图→写入索引→完成”。
- **多图候选**：若上游返回 1~2 张图，后端会选择**最大分辨率**作为主图；缩略图优先用“小图候选”，没有就本地生成。
- **持久化图库**：图片落盘到 `server/gallery/`，索引写入 `server/data/gallery.json`，缩略图在 `server/gallery/thumbnails/`。
- **可观测**：WebUI 内置“日志页/任务中心”，可快速定位 504、上游断链、候选数、耗时等问题。

---

## 🚀 最快上手（Docker Compose 单容器）
```bash
git clone https://github.com/hahaha8459812/nano-banana-webui.git
cd nano-banana-webui
cp server/config/app.config.example.json server/config/app.config.json
# 编辑 app.config.json：设置 auth.password 或 passwordHash、auth.jwtSecret、配置 apiConfigs（含 apiKey）

docker compose up -d --build
```

- 访问：`http://<服务器IP>:51130/webui`
- 持久化（compose 已挂载）：
  - `./server/config/app.config.json`（敏感配置）
  - `./server/gallery/`（主图/缩略图）
  - `./server/data/`（gallery/tasks 索引）

---

## 🧭 使用说明（WebUI）
1) 登录：输入工作密码；后端地址可一键“使用当前地址”。
2) API 配置：新增/编辑/删除/设默认；可拉取模型列表。
3) 工作区：文生图 / 图文混合；可设置宽高比、Gemini 3 Pro 参数。
4) 生成：创建异步任务并显示进度；完成后自动写入图库。
5) 图库：分页查看/详情/下载/删除。
6) 任务中心：查看最近任务、候选数、耗时、失败原因、产物链接。
7) 日志：查看后端缓冲日志（支持关键词过滤）。

---

## 📡 接口速览
- 创建任务：`POST /api/generate/task` → `{ taskId, status }`
- 任务进度：`GET /api/generate/task/:id/events`（SSE，含 `status/done/error/canceled`）
- 查询任务：`GET /api/generate/task/:id`
- 取消任务：`DELETE /api/generate/task/:id`
- 任务列表：`GET /api/tasks?limit=200`
- 日志列表：`GET /api/logs?limit=300`
- 日志流：`GET /api/logs/events`（SSE）

---

## 🔧 配置
配置文件：`server/config/app.config.json`  
字段说明见：`CONFIG.md`

最少需要：
- `auth.jwtSecret`
- `auth.password` 或 `auth.passwordHash`
- `apiConfigs[]`（至少 1 条，含 `id/label/endpoint/model/apiKey`）

---

## 🛡️ 反代/稳定性建议（重要）
生成与日志采用 SSE 长连接；反向代理/CDN 必须允许长连接并关闭 buffering，否则可能出现“时好时坏”。

nginx 示例：
```nginx
location /api/ {
  proxy_http_version 1.1;
  proxy_set_header Connection "";
  proxy_buffering off;
  proxy_cache off;
  proxy_read_timeout 360s;
  proxy_send_timeout 360s;
}
```

上游超时/重试：
- `UPSTREAM_TIMEOUT_MS`（默认 180000）
- `UPSTREAM_RETRIES`（默认 1）
- `UPSTREAM_RETRY_DELAY_MS`（默认 800）

任务队列：
- `MAX_CONCURRENT_TASKS`（默认 1）
- `MAX_QUEUE_SIZE`（默认 10）
- `TASK_TTL_MS`（默认 24h）
- `SSE_HEARTBEAT_MS`（默认 15s）
- `LOG_BUFFER_LIMIT`（默认 2000）

---

## 🤝 License
MIT License © Nano Banana Contributors
