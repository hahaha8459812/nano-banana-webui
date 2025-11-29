# NanoBanana Web UI

基于 **Vue 3 + TypeScript + TailwindCSS + Vite** 的多模态生图工作台，后端由 Node.js 服务负责安全保存 API 密钥、发起 OpenRouter/Gemini 请求并把结果写入图库。

## ✨ 主要特性

- 🔐 密码登录 + 服务器密钥保存：前端用户仅需密码即可使用，API Key 永远不离开服务器。
- 🧩 多套 API 配置：后端配置文件中可维护多组 endpoint/model/key，前端随时切换。
- 🧠 Gemini/OpenRouter 兼容：支持 Gemini 3 Pro Image 专属参数、宽高比、Google Search 等。
- 🗂 工作区 + 图库：生成的图片和文本回复会自动同步到图库并可再次下载或推回创作区。
- 📝 模板管理：提示词模板存储在配置文件里，支持在前端新增/编辑/删除。

## 📁 目录结构

```
.
├─ package.json               # 前端依赖与脚本
├─ server/
│  ├─ index.js                # Express 服务入口
│  ├─ package.json            # 后端依赖
│  ├─ config/app.config.example.json  # 配置示例
│  ├─ data/                   # 图库索引（运行时自动生成）
│  └─ gallery/                # 图库原图（运行时自动生成）
├─ src/                       # 前端源码
│  ├─ components/             # Vue 组件
│  ├─ config/client.ts        # 前端 API Base URL
│  ├─ services/backend.ts     # 调用后端的封装
│  └─ App.vue                 # 顶层界面
├─ Dockerfile.frontend
├─ Dockerfile.server
├─ docker-compose.yml
└─ README.md
```

## ⚙️ 服务器配置

1. 复制 `server/config/app.config.example.json` 为 `app.config.json`；
2. 根据需要填写：
   - `auth.password` 或 `auth.passwordHash`（任选其一）；
   - `auth.jwtSecret`：任意随机字符串即可；
   - `apiConfigs`：多套 API endpoint/model/apiKey；
   - `templates`：初始提示词模板；
3. 运行 `npm install && npm run start`（或用 PM2/systemd 等守护）即可启动后端；图库图片会写入 `server/gallery/`，索引写入 `server/data/gallery.json`，记得备份。

## 🚀 本地启动

```bash
# 根目录安装前端依赖
npm install

# 启动后端
cd server
npm install
npm run start

# 另开终端运行前端
cd ..
npm run dev
```

默认前端监听 `http://localhost:3000`，后端在 `http://localhost:51130`。如需自定义后端地址，可在 `.env` 中设置 `VITE_API_BASE_URL`。

## 🐳 Docker Compose 部署

仓库包含完整的容器化脚本，可一键启动：

```bash
# 构建镜像
docker compose build

# 后台运行
docker compose up -d
```

- `backend` 服务会挂载 `server/config/app.config.json`（默认只读），并将图库数据与索引分别持久化到 `gallery-data`、`gallery-meta` 卷中。
- `frontend` 在构建阶段会注入 `VITE_API_BASE_URL=http://backend:51130`，生成的静态文件由 Nginx 提供；若后端地址不同，可修改 `docker-compose.yml` 的 `build.args`。
- 默认映射 `3000:80`（前端）和 `51130:51130`（后端），可按需修改。

## 🧑‍💻 使用流程

1. 打开前端并输入部署者设置的密码；
2. 在“API 配置”卡片中选择需要的 endpoint/model，若需刷新模型列表可点击“获取模型列表”；
3. 在“工作区”上传参考图、选择提示词模板或编写自定义提示词；
4. 选择“纯提示词”或“图文混合”生成，结果会显示在下方并写入图库；
5. “图库”页签可查看全部历史作品、下载图片或复制文本回复。

## 📝 额外说明

- `server/gallery/` 与 `server/data/gallery.json` 默认被 `.gitignore` 忽略，生产环境请挂载到独立存储。
- 若需要更严格的安全策略，可在反向代理层再加一层 Basic Auth 或 IP 白名单。
- 任何模板的增删改都会立即写入 `app.config.json`，无需重启容器或服务。

## 📄 许可证

MIT License
