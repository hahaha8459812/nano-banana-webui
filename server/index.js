import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG_PATH = path.join(__dirname, 'config', 'app.config.json')
const CONFIG_EXAMPLE_PATH = path.join(__dirname, 'config', 'app.config.example.json')
const DATA_DIR = path.join(__dirname, 'data')
const GALLERY_DATA_PATH = path.join(DATA_DIR, 'gallery.json')
const TASKS_DATA_PATH = path.join(DATA_DIR, 'tasks.json')
const GALLERY_DIR = path.join(__dirname, 'gallery')
const DIST_DIR = path.join(__dirname, '..', 'dist')
const THUMBNAILS_DIR = path.join(GALLERY_DIR, 'thumbnails')

const PORT = process.env.PORT || 51130

const app = express()

const DEFAULT_UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 180_000)
const DEFAULT_UPSTREAM_RETRIES = Number(process.env.UPSTREAM_RETRIES || 1)
const DEFAULT_UPSTREAM_RETRY_DELAY_MS = Number(process.env.UPSTREAM_RETRY_DELAY_MS || 800)
const MAX_CONCURRENT_TASKS = Number(process.env.MAX_CONCURRENT_TASKS || 1)
const MAX_QUEUE_SIZE = Number(process.env.MAX_QUEUE_SIZE || 10)
const TASK_TTL_MS = Number(process.env.TASK_TTL_MS || 24 * 60 * 60 * 1000)
const SSE_HEARTBEAT_MS = Number(process.env.SSE_HEARTBEAT_MS || 15_000)
const LOG_BUFFER_LIMIT = Number(process.env.LOG_BUFFER_LIMIT || 2000)

const logBuffer = []
const logListeners = new Set()

function pushLog(level, scope, message, extra, requestId) {
    const entry = {
        id: uuid(),
        time: new Date().toISOString(),
        level,
        scope,
        message,
        requestId: requestId || '',
        extra: extra ?? null
    }

    logBuffer.push(entry)
    if (logBuffer.length > LOG_BUFFER_LIMIT) {
        logBuffer.splice(0, logBuffer.length - LOG_BUFFER_LIMIT)
    }

    for (const res of logListeners) {
        try {
            res.write(`event: log\n`)
            res.write(`data: ${JSON.stringify(entry)}\n\n`)
        } catch {
            // ignore
        }
    }
}

function isTransientNetworkError(error) {
    if (!error) return false
    const message = error instanceof Error ? error.message : String(error)
    const cause = error instanceof Error ? error.cause : undefined
    const causeCode = cause && typeof cause === 'object' ? cause.code : undefined
    const code = error instanceof Error ? error.code : undefined
    const anyCode = code || causeCode
    if (anyCode && ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED'].includes(anyCode)) return true
    return /terminated|socket hang up|network timeout|timed out|ECONNRESET/i.test(message)
}

function isRetryableStatus(status) {
    return [408, 425, 429, 500, 502, 503, 504].includes(status)
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('upstream timeout')), timeoutMs)
    try {
        const combinedSignal = options?.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal
        return await fetch(url, { ...options, signal: combinedSignal })
    } finally {
        clearTimeout(timer)
    }
}

async function fetchWithRetry(url, options, { timeoutMs, retries, retryDelayMs } = {}) {
    const effectiveTimeout = Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_UPSTREAM_TIMEOUT_MS
    const effectiveRetries = Number.isFinite(retries) ? retries : DEFAULT_UPSTREAM_RETRIES
    const effectiveDelay = Number.isFinite(retryDelayMs) ? retryDelayMs : DEFAULT_UPSTREAM_RETRY_DELAY_MS

    let lastError
    for (let attempt = 0; attempt <= effectiveRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options, effectiveTimeout)
            if (!response.ok && isRetryableStatus(response.status) && attempt < effectiveRetries) {
                await delay(effectiveDelay * (attempt + 1))
                continue
            }
            return response
        } catch (error) {
            lastError = error
            const retryable = isTransientNetworkError(error)
            if (!retryable || attempt >= effectiveRetries) {
                throw error
            }
            await delay(effectiveDelay * (attempt + 1))
        }
    }
    throw lastError || new Error('upstream request failed')
}

function logInfo(scope, message, extra, requestId) {
    const time = new Date().toISOString()
    const prefix = requestId ? `[${time}][${scope}][${requestId}]` : `[${time}][${scope}]`
    if (extra) {
        console.log(`${prefix} ${message}`, extra)
    } else {
        console.log(`${prefix} ${message}`)
    }
    pushLog('info', scope, message, extra, requestId)
}

function logError(scope, message, error, requestId) {
    const time = new Date().toISOString()
    const prefix = requestId ? `[${time}][${scope}][${requestId}]` : `[${time}][${scope}]`
    console.error(`${prefix} ${message}`, error)
    const extra = error instanceof Error ? { message: error.message, stack: error.stack } : error
    pushLog('error', scope, message, extra, requestId)
}

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
app.use((req, res, next) => {
    req.requestId = uuid().slice(0, 8)
    req._startAt = Date.now()
    res.setHeader('x-request-id', req.requestId)
    next()
})

morgan.token('id', req => req.requestId || '-')
app.use(
    morgan('[HTTP][:id] :method :url -> :status :response-time ms', {
        stream: {
            write: message => process.stdout.write(message)
        }
    })
)

app.use((req, res, next) => {
    const start = Date.now()
    logInfo('HTTP', `收到请求 ${req.method} ${req.originalUrl}`, { ip: req.ip }, req.requestId)
    res.on('finish', () => {
        logInfo('HTTP', `请求结束 ${req.method} ${req.originalUrl} -> ${res.statusCode}，耗时 ${Date.now() - start}ms`, null, req.requestId)
    })
    next()
})
app.use('/gallery', express.static(GALLERY_DIR))
if (fs.existsSync(DIST_DIR)) {
    app.use('/webui', express.static(DIST_DIR))
}

ensureDirectories()
ensureThumbnails()
ensureTasksStore()

function ensureDirectories() {
    if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
        logInfo('初始化', '已创建配置目录')
    }

    if (!fs.existsSync(CONFIG_PATH) && fs.existsSync(CONFIG_EXAMPLE_PATH)) {
        fs.copyFileSync(CONFIG_EXAMPLE_PATH, CONFIG_PATH)
        logInfo('初始化', '已复制 app.config.example.json -> app.config.json')
    }

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
        logInfo('初始化', '已创建 data/')
    }

    if (!fs.existsSync(GALLERY_DIR)) {
        fs.mkdirSync(GALLERY_DIR, { recursive: true })
        logInfo('初始化', '已创建 gallery/')
    }

    if (!fs.existsSync(THUMBNAILS_DIR)) {
        fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })
        logInfo('初始化', '已创建 gallery/thumbnails/')
    }

    if (!fs.existsSync(GALLERY_DATA_PATH)) {
        fs.writeFileSync(GALLERY_DATA_PATH, JSON.stringify([]))
        logInfo('初始化', '已创建 data/gallery.json')
    }
}

function ensureTasksStore() {
    if (!fs.existsSync(TASKS_DATA_PATH)) {
        try {
            fs.writeFileSync(TASKS_DATA_PATH, JSON.stringify([]))
            logInfo('初始化', '已创建 data/tasks.json')
        } catch (error) {
            logError('初始化', '创建 data/tasks.json 失败', error)
        }
    }
}

async function ensureThumbnails() {
    try {
        logInfo('初始化', '正在检查并生成缺失的缩略图...')
        const entries = await loadGallery()
        let changed = false

        for (const entry of entries) {
            // 检查数据字段
            if (!entry.thumbnailPath && entry.fileName) {
                entry.thumbnailPath = `/gallery/thumbnails/thumb-${entry.fileName}`
                changed = true
            }

            // 检查物理文件
            if (entry.fileName) {
                const originalPath = path.join(GALLERY_DIR, entry.fileName)
                const thumbnailFileName = `thumb-${entry.fileName}`
                const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFileName)

                if (fs.existsSync(originalPath) && !fs.existsSync(thumbnailPath)) {
                    try {
                        await sharp(originalPath)
                            .resize(400, 400, {
                                fit: 'cover',
                                position: 'center'
                            })
                            .toFile(thumbnailPath)
                        logInfo('初始化', `已生成缩略图: ${thumbnailFileName}`)
                    } catch (err) {
                        logError('初始化', `生成缩略图失败: ${thumbnailFileName}`, err)
                    }
                }
            }
        }

        if (changed) {
            await saveGallery(entries)
            logInfo('初始化', '已更新 gallery.json 中的缩略图路径')
        }
        logInfo('初始化', '缩略图检查完成')
    } catch (error) {
        logError('初始化', '缩略图检查失败', error)
    }
}

// ---- Generate task queue (single-instance) ----
const tasks = new Map()
const taskQueue = []
const taskListeners = new Map()
let runningTasks = 0
let tasksPersistTimer = null

function serializeTask(task) {
    const { token, abortController, ...rest } = task
    return rest
}

function schedulePersistTasks() {
    if (tasksPersistTimer) return
    tasksPersistTimer = setTimeout(() => {
        tasksPersistTimer = null
        persistTasksStore().catch(() => null)
    }, 300)
}

async function persistTasksStore() {
    try {
        const list = Array.from(tasks.values()).map(serializeTask)
        await fs.promises.writeFile(TASKS_DATA_PATH, JSON.stringify(list, null, 2))
    } catch (error) {
        logError('任务', '写入 tasks.json 失败', error)
    }
}

loadTasksStore()
startTaskCleanup()

function loadTasksStore() {
    try {
        if (!fs.existsSync(TASKS_DATA_PATH)) return
        const raw = fs.readFileSync(TASKS_DATA_PATH, 'utf-8')
        const list = JSON.parse(raw)
        if (!Array.isArray(list)) return
        for (const item of list) {
            if (!item?.id) continue
            const restored = { ...item, token: '', abortController: null, cancelRequested: false }
            if (restored.status === 'running' || restored.status === 'queued') {
                restored.status = 'failed'
                restored.stage = 'failed'
                restored.error = '服务重启导致任务中断，请重新生成'
                restored.finishedAt = new Date().toISOString()
            }
            tasks.set(restored.id, restored)
        }
        if (tasks.size) {
            logInfo('初始化', `已加载历史任务 ${tasks.size} 条`)
        }
    } catch (error) {
        logError('初始化', '加载 tasks.json 失败', error)
    }
}

function startTaskCleanup() {
    setInterval(() => {
        const now = Date.now()
        let changed = false
        for (const [id, task] of tasks.entries()) {
            const createdAt = Date.parse(task.createdAt || '') || 0
            if (createdAt && now - createdAt > TASK_TTL_MS) {
                tasks.delete(id)
                changed = true
            }
        }
        if (changed) schedulePersistTasks()
    }, 60_000)
}

function publicTaskView(task) {
    if (!task) return null
    const { token, abortController, ...rest } = task
    return rest
}

function sseSend(res, event, data) {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
}

function sseComment(res, comment) {
    res.write(`: ${comment}\n\n`)
}

function addTaskListener(taskId, res) {
    if (!taskListeners.has(taskId)) {
        taskListeners.set(taskId, new Set())
    }
    taskListeners.get(taskId).add(res)
}

function removeTaskListener(taskId, res) {
    const set = taskListeners.get(taskId)
    if (!set) return
    set.delete(res)
    if (set.size === 0) {
        taskListeners.delete(taskId)
    }
}

function broadcastTaskEvent(taskId, event, payload) {
    const listeners = taskListeners.get(taskId)
    if (!listeners) return
    for (const res of listeners) {
        try {
            sseSend(res, event, payload)
        } catch {
            // ignore
        }
    }
}

function createTaskState({ requestId, token, payload }) {
    const id = uuid()
    return {
        id,
        requestId: requestId || '',
        status: 'queued',
        stage: 'queued',
        createdAt: new Date().toISOString(),
        startedAt: '',
        finishedAt: '',
        error: '',
        cancelRequested: false,
        token: token || '',
        abortController: null,
        rawPayload: payload,
        payload: {
            configId: payload.configId,
            model: payload.model || '',
            aspectRatio: payload.aspectRatio || '',
            imageSize: payload.imageSize || '',
            enableGoogleSearch: Boolean(payload.enableGoogleSearch),
            promptLength: typeof payload.prompt === 'string' ? payload.prompt.length : 0,
            imagesCount: Array.isArray(payload.images) ? payload.images.length : 0
        },
        result: null
    }
}

function enqueueTask(task) {
    if (taskQueue.length >= MAX_QUEUE_SIZE) {
        throw new Error('任务队列已满，请稍后重试')
    }
    tasks.set(task.id, task)
    taskQueue.push(task.id)
    schedulePersistTasks()
    drainQueue()
}

function drainQueue() {
    while (runningTasks < MAX_CONCURRENT_TASKS && taskQueue.length) {
        const nextId = taskQueue.shift()
        const task = tasks.get(nextId)
        if (!task || task.status !== 'queued') continue
        runningTasks += 1
        runTask(nextId)
            .catch(() => null)
            .finally(() => {
                runningTasks -= 1
                drainQueue()
            })
    }
}

async function runTask(taskId) {
    const task = tasks.get(taskId)
    if (!task) return

    if (task.cancelRequested) {
        task.status = 'canceled'
        task.stage = 'canceled'
        task.finishedAt = new Date().toISOString()
        schedulePersistTasks()
        broadcastTaskEvent(taskId, 'done', publicTaskView(task))
        return
    }

    task.status = 'running'
    task.stage = 'calling_upstream'
    task.startedAt = new Date().toISOString()
    schedulePersistTasks()
    broadcastTaskEvent(taskId, 'status', publicTaskView(task))

    const abortController = new AbortController()
    task.abortController = abortController

    try {
        const config = await loadConfig()
        const apiConfig = (config.apiConfigs || []).find(item => item.id === task.rawPayload.configId)
        if (!apiConfig) {
            throw new Error('找不到对应的 API 配置')
        }

        const upstreamStart = Date.now()
        logInfo(
            '生成',
            '开始调用上游模型',
            {
                apiConfigId: apiConfig.id,
                apiConfigLabel: apiConfig.label,
                model: task.rawPayload.model || apiConfig.model,
                promptLength: task.payload?.promptLength || 0,
                imagesCount: task.payload?.imagesCount || 0,
                aspectRatio: task.rawPayload.aspectRatio || '',
                imageSize: task.rawPayload.imageSize || '',
                enableGoogleSearch: Boolean(task.rawPayload.enableGoogleSearch)
            },
            task.requestId
        )
        const result = await generateImage(
            {
                apiConfig,
                prompt: task.rawPayload.prompt,
                images: task.rawPayload.images || [],
                model: task.rawPayload.model || apiConfig.model,
                aspectRatio: task.rawPayload.aspectRatio,
                imageSize: task.rawPayload.imageSize,
                enableGoogleSearch: task.rawPayload.enableGoogleSearch
            },
            task.requestId,
            abortController.signal
        )

        task.stage = 'saving'
        task.upstreamMs = Date.now() - upstreamStart
        task.candidates = Array.isArray(result.imageCandidates) ? result.imageCandidates.length : 0
        schedulePersistTasks()
        broadcastTaskEvent(taskId, 'status', publicTaskView(task))
        logInfo(
            '生成',
            '上游返回完成',
            {
                apiConfigId: apiConfig.id,
                durationMs: task.upstreamMs,
                candidates: task.candidates
            },
            task.requestId
        )

        const { entry: savedEntry } = await persistGalleryEntry(
            {
                prompt: task.rawPayload.prompt,
                responseText: result.textResponse,
                imageSource: result.imageUrl,
                imageCandidates: result.imageCandidates,
                configLabel: apiConfig.label,
                configId: apiConfig.id,
                modelId: result.modelUsed,
                aspectRatio: result.aspectRatioUsed,
                imageSize: result.imageSizeUsed
            },
            task.requestId,
            { includeImageData: false }
        )

        task.status = 'done'
        task.stage = 'done'
        task.finishedAt = new Date().toISOString()
        task.result = { galleryEntry: savedEntry }
        schedulePersistTasks()
        broadcastTaskEvent(taskId, 'done', publicTaskView(task))
    } catch (error) {
        if (task.cancelRequested) {
            task.status = 'canceled'
            task.stage = 'canceled'
            task.error = '已取消'
        } else {
            task.status = 'failed'
            task.stage = 'failed'
            task.error = error instanceof Error ? error.message : String(error)
        }
        task.finishedAt = new Date().toISOString()
        schedulePersistTasks()
        broadcastTaskEvent(taskId, 'error', publicTaskView(task))
    } finally {
        task.abortController = null
    }
}


async function loadConfig() {
    const raw = await fs.promises.readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw)
}

async function saveConfig(config) {
    await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(config, null, 4))
}

async function loadGallery() {
    const raw = await fs.promises.readFile(GALLERY_DATA_PATH, 'utf-8')
    return JSON.parse(raw)
}

async function saveGallery(entries) {
    await fs.promises.writeFile(GALLERY_DATA_PATH, JSON.stringify(entries, null, 4))
}

function sanitizeConfig(apiConfig) {
    const { apiKey, ...rest } = apiConfig
    return rest
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization
    if (!header) {
        logInfo('鉴权', '缺少 Authorization 请求头', null, req.requestId)
        return res.status(401).json({ message: '未提供 Authorization 头' })
    }

    const [, token] = header.split(' ')
    if (!token) {
        return res.status(401).json({ message: '无效的认证信息' })
    }

    loadConfig()
        .then(config => {
            const secret = config?.auth?.jwtSecret
            if (!secret) {
                return res.status(500).json({ message: '服务器未配置 jwtSecret' })
            }
            jwt.verify(token, secret, (err, decoded) => {
                if (err) {
                    return res.status(401).json({ message: '认证失效，请重新登录' })
                }
                req.user = decoded
                next()
            })
        })
        .catch(error => {
            logError('鉴权', '读取配置失败', error, req.requestId)
            res.status(500).json({ message: '无法读取配置' })
        })
}

app.post('/api/login', async (req, res) => {
    logInfo('登录', '收到登录请求', null, req.requestId)
    const { password } = req.body
    if (!password) {
        return res.status(400).json({ message: '密码不能为空' })
    }

    try {
        const config = await loadConfig()
        const authConfig = config.auth || {}
        const jwtSecret = authConfig.jwtSecret

        if (!jwtSecret) {
            return res.status(500).json({ message: '服务器未配置 jwtSecret' })
        }

        let isValid = false
        if (authConfig.passwordHash) {
            isValid = await bcrypt.compare(password, authConfig.passwordHash)
        } else if (authConfig.password) {
            isValid = password === authConfig.password
        }

        if (!isValid) {
            logInfo('登录', '密码错误', null, req.requestId)
            return res.status(401).json({ message: '密码错误' })
        }

        const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: authConfig.tokenExpiresIn || '12h' })
        logInfo('登录', '登录成功，已签发 Token', null, req.requestId)
        res.json({ token })
    } catch (error) {
        logError('登录', '登录失败', error, req.requestId)
        res.status(500).json({ message: '服务器异常，无法登录' })
    }
})

app.get('/api/session', authMiddleware, (req, res) => {
    res.json({ ok: true })
})

app.get('/api/api-configs', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        const configs = (config.apiConfigs || []).map(sanitizeConfig)
        const defaultConfigId = config.defaultApiConfigId || ''
        logInfo('API 配置', `读取配置成功，共 ${configs.length} 条`, null, req.requestId)
        res.json({ configs, defaultConfigId })
    } catch (error) {
        logError('API 配置', '读取配置失败', error, req.requestId)
        res.status(500).json({ message: '???? API ??' })
    }
})

app.post('/api/api-configs', authMiddleware, async (req, res) => {
    const payload = req.body || {}
    if (!payload.id || !payload.label || !payload.endpoint || !payload.model || !payload.apiKey) {
        return res.status(400).json({ message: 'id????endpoint?model?apiKey ????' })
    }
    try {
        const config = await loadConfig()
        const list = config.apiConfigs || []
        if (list.find(item => item.id === payload.id)) {
            return res.status(409).json({ message: 'ID ??????????' })
        }
        const newItem = {
            id: String(payload.id).trim(),
            label: String(payload.label).trim(),
            endpoint: String(payload.endpoint).trim(),
            model: String(payload.model).trim(),
            description: payload.description ? String(payload.description).trim() : '',
            apiKey: String(payload.apiKey).trim()
        }
        list.push(newItem)
        config.apiConfigs = list
        if (!config.defaultApiConfigId) {
            config.defaultApiConfigId = newItem.id
        }
        await saveConfig(config)
        logInfo('API 配置', `已新增配置 ${newItem.id}`, { label: newItem.label }, req.requestId)
        res.json({ config: sanitizeConfig(newItem) })
    } catch (error) {
        logError('API 配置', '新增配置失败', error, req.requestId)
        res.status(500).json({ message: '???? API ??' })
    }
})

app.put('/api/api-configs/:id', authMiddleware, async (req, res) => {
    const payload = req.body || {}
    try {
        const config = await loadConfig()
        const list = config.apiConfigs || []
        const index = list.findIndex(item => item.id === req.params.id)
        if (index === -1) {
            return res.status(404).json({ message: '?????' })
        }
        const current = list[index]
        const nextConfig = {
            ...current,
            label: payload.label ? String(payload.label).trim() : current.label,
            endpoint: payload.endpoint ? String(payload.endpoint).trim() : current.endpoint,
            model: payload.model ? String(payload.model).trim() : current.model,
            description: payload.description !== undefined ? String(payload.description).trim() : current.description
        }
        if (payload.apiKey && String(payload.apiKey).trim()) {
            nextConfig.apiKey = String(payload.apiKey).trim()
        }
        list[index] = nextConfig
        config.apiConfigs = list
        await saveConfig(config)
        logInfo('API 配置', `已更新配置 ${nextConfig.id}`, { label: nextConfig.label }, req.requestId)
        res.json({ config: sanitizeConfig(nextConfig) })
    } catch (error) {
        logError('API 配置', '更新配置失败', error, req.requestId)
        res.status(500).json({ message: '???? API ??' })
    }
})

app.delete('/api/api-configs/:id', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        const list = config.apiConfigs || []
        const index = list.findIndex(item => item.id === req.params.id)
        if (index === -1) {
            return res.status(404).json({ message: '?????' })
        }
        const removed = list.splice(index, 1)[0]
        config.apiConfigs = list
        if (config.defaultApiConfigId === removed.id) {
            config.defaultApiConfigId = list[0]?.id || ''
        }
        await saveConfig(config)
        logInfo('API 配置', `已删除配置 ${removed.id}`, { label: removed.label }, req.requestId)
        res.json({ config: sanitizeConfig(removed) })
    } catch (error) {
        logError('API 配置', '删除配置失败', error, req.requestId)
        res.status(500).json({ message: '???? API ??' })
    }
})


app.post('/api/api-configs/:id/default', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        const list = config.apiConfigs || []
        const exists = list.find(item => item.id === req.params.id)
        if (!exists) {
            return res.status(404).json({ message: '??????' })
        }
        config.defaultApiConfigId = exists.id
        await saveConfig(config)
        logInfo('API 配置', `已设置默认配置 ${exists.id}`, { label: exists.label }, req.requestId)
        res.json({ defaultConfigId: exists.id })
    } catch (error) {
        logError('API 配置', '设置默认配置失败', error, req.requestId)
        res.status(500).json({ message: '?????????? API ?????' })
    }
})

app.get('/api/api-configs/:id/models', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        const apiConfig = (config.apiConfigs || []).find(item => item.id === req.params.id)
        if (!apiConfig) {
            return res.status(404).json({ message: '?????? API ??' })
        }

        const models = await fetchModels(apiConfig)
        res.json({ models })
    } catch (error) {
        logError('models', '????????', error)
        res.status(500).json({ message: error.message || '????????' })
    }
})

app.get('/api/logs', authMiddleware, (req, res) => {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 200), 2000))
    const slice = logBuffer.slice(-limit)
    res.json({ logs: slice })
})

app.get('/api/logs/events', authMiddleware, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const heartbeatTimer = setInterval(() => {
        try {
            res.write(`: ping\n\n`)
        } catch {
            // ignore
        }
    }, SSE_HEARTBEAT_MS)

    logListeners.add(res)

    req.on('close', () => {
        clearInterval(heartbeatTimer)
        logListeners.delete(res)
    })
})

app.get('/api/templates', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        const templates = config.templates || []
        logInfo('模板', `读取模板成功，共 ${templates.length} 条`, null, req.requestId)
        res.json({ templates })
    } catch (error) {
        logError('模板', '读取模板失败', error, req.requestId)
        res.status(500).json({ message: '无法读取模板' })
    }
})

app.post('/api/templates', authMiddleware, async (req, res) => {
    const template = req.body
    if (!template?.title || !template?.prompt) {
        return res.status(400).json({ message: '模板标题和提示词不能为空' })
    }

    try {
        const config = await loadConfig()
        const templates = config.templates || []
        const newTemplate = {
            id: template.id || uuid(),
            title: template.title,
            prompt: template.prompt,
            description: template.description || '',
            image: template.image || ''
        }
        templates.push(newTemplate)
        config.templates = templates
        await saveConfig(config)
        logInfo('模板', `已新增模板 ${newTemplate.id}`, { title: newTemplate.title }, req.requestId)
        res.json({ template: newTemplate })
    } catch (error) {
        logError('模板', '新增模板失败', error, req.requestId)
        res.status(500).json({ message: '无法保存模板' })
    }
})

app.put('/api/templates/:id', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        const templates = config.templates || []
        const index = templates.findIndex(item => item.id === req.params.id)
        if (index === -1) {
            return res.status(404).json({ message: '模板不存在' })
        }
        const payload = req.body || {}
        templates[index] = {
            ...templates[index],
            title: payload.title || templates[index].title,
            prompt: payload.prompt || templates[index].prompt,
            description: payload.description ?? templates[index].description,
            image: payload.image ?? templates[index].image
        }
        config.templates = templates
        await saveConfig(config)
        logInfo('模板', `已更新模板 ${templates[index].id}`, { title: templates[index].title }, req.requestId)
        res.json({ template: templates[index] })
    } catch (error) {
        logError('模板', '更新模板失败', error, req.requestId)
        res.status(500).json({ message: '无法更新模板' })
    }
})

app.delete('/api/templates/:id', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        const templates = config.templates || []
        const index = templates.findIndex(item => item.id === req.params.id)
        if (index === -1) {
            return res.status(404).json({ message: '模板不存在' })
        }
        const removed = templates.splice(index, 1)[0]
        config.templates = templates
        await saveConfig(config)
        logInfo('模板', `已删除模板 ${removed.id}`, { title: removed.title }, req.requestId)
        res.json({ template: removed })
    } catch (error) {
        logError('模板', '删除模板失败', error, req.requestId)
        res.status(500).json({ message: '无法删除模板' })
    }
})

app.get('/api/gallery', authMiddleware, async (req, res) => {
    try {
        const entries = await loadGallery()
        logInfo('图库', `读取图库成功，共 ${entries.length} 条`, null, req.requestId)
        res.json({ entries })
    } catch (error) {
        logError('图库', '读取图库失败', error, req.requestId)
        res.status(500).json({ message: '无法读取图库' })
    }
})

// --- 异步任务接口 ---
app.post('/api/generate/task', authMiddleware, async (req, res) => {
    const payload = req.body || {}
    if (!payload.configId) {
        return res.status(400).json({ message: '必须指定 API 配置' })
    }
    try {
        const summary = {
            configId: payload.configId || '',
            model: payload.model || '',
            promptLength: typeof payload.prompt === 'string' ? payload.prompt.length : 0,
            imagesCount: Array.isArray(payload.images) ? payload.images.length : 0,
            aspectRatio: payload.aspectRatio || '',
            imageSize: payload.imageSize || '',
            enableGoogleSearch: Boolean(payload.enableGoogleSearch)
        }
        logInfo('生成', '收到生成任务请求', summary, req.requestId)
        const task = createTaskState({ requestId: req.requestId, token: '', payload })
        enqueueTask(task)
        logInfo('任务', '已创建生成任务', { taskId: task.id, configId: payload.configId }, req.requestId)
        res.status(202).json({ taskId: task.id, status: task.status })
    } catch (error) {
        logError('任务', '创建任务失败', error, req.requestId)
        res.status(429).json({ message: error instanceof Error ? error.message : '任务队列繁忙，请稍后重试' })
    }
})

app.get('/api/generate/task/:id', authMiddleware, (req, res) => {
    const task = tasks.get(req.params.id)
    if (!task) {
        return res.status(404).json({ message: '任务不存在' })
    }
    res.json(publicTaskView(task))
})

app.get('/api/generate/task/:id/events', authMiddleware, (req, res) => {
    const task = tasks.get(req.params.id)
    if (!task) {
        return res.status(404).end()
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const sendHeartbeat = () => sseComment(res, 'ping')
    const heartbeatTimer = setInterval(sendHeartbeat, SSE_HEARTBEAT_MS)
    addTaskListener(task.id, res)

    // 先推送当前状态
    sseSend(res, 'status', publicTaskView(task))

    req.on('close', () => {
        clearInterval(heartbeatTimer)
        removeTaskListener(task.id, res)
    })
})

app.delete('/api/generate/task/:id', authMiddleware, (req, res) => {
    const task = tasks.get(req.params.id)
    if (!task) {
        return res.status(404).json({ message: '任务不存在' })
    }
    task.cancelRequested = true
    if (task.abortController) {
        task.abortController.abort()
    }
    task.status = 'canceled'
    task.stage = 'canceled'
    task.error = '已取消'
    task.finishedAt = new Date().toISOString()
    schedulePersistTasks()
    broadcastTaskEvent(task.id, 'error', publicTaskView(task))
    logInfo('任务', '已取消任务', { taskId: task.id }, req.requestId)
    res.json(publicTaskView(task))
})

async function fetchModels(apiConfig) {
    const endpoint = resolveModelsEndpoint(apiConfig.endpoint)
    logInfo('模型', `获取模型列表：${apiConfig.id}`, { endpoint })
    const response = await fetchWithRetry(
        endpoint,
        {
            headers: {
                Authorization: `Bearer ${apiConfig.apiKey}`,
                'Content-Type': 'application/json'
            }
        },
        { timeoutMs: 30_000, retries: 1, retryDelayMs: 500 }
    )

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`获取模型列表失败 ${response.status}: ${text}`)
    }

    const data = await response.json()
    const list = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : null
    if (!list) {
        throw new Error('模型列表返回格式不符合预期')
    }

    logInfo('模型', `模型列表获取成功，共 ${list.length} 条`, { endpoint })
    return list
}


function resolveModelsEndpoint(endpoint) {
    try {
        const url = new URL(endpoint)
        const segments = url.pathname.split('/').filter(Boolean)
        if (!segments.length) {
            url.pathname = '/models'
            return url.toString()
        }

        const last = segments[segments.length - 1]
        if (last === 'models') {
            return url.toString()
        }

        if (['completions', 'complete', 'generate'].includes(last)) {
            segments.pop()
        }

        if (segments[segments.length - 1] === 'chat') {
            segments[segments.length - 1] = 'models'
        } else {
            segments.push('models')
        }

        url.pathname = '/' + segments.join('/')
        return url.toString()
    } catch (error) {
        console.warn('[models] 无法解析 endpoint，将采用默认规则', error)
        return endpoint.replace(/\/$/, '') + '/models'
    }
}

async function generateImage({ apiConfig, prompt, images, model, aspectRatio, imageSize, enableGoogleSearch }, requestId, signal) {
    if (!prompt && (!images || !images.length)) {
        throw new Error('缺少提示词或参考图像')
    }

    const resolvedModel = model || apiConfig.model
    const isGemini3Pro = model?.toLowerCase().includes('gemini-3-pro-image')
    const messageContent =
        !images || images.length === 0
            ? prompt
            : [
                  { type: 'text', text: prompt },
                  ...images.map(url => ({
                      type: 'image_url',
                      image_url: { url }
                  }))
              ]

    const messages = [{ role: 'user', content: messageContent }]
    const payload = {
        model: resolvedModel,
        messages,
        modalities: ['image', 'text']
    }

    const imageConfig = {}
    if (aspectRatio) {
        imageConfig.aspect_ratio = aspectRatio
    }
    if (isGemini3Pro && imageSize) {
        imageConfig.image_size = imageSize
    }
    if (Object.keys(imageConfig).length > 0) {
        payload.image_config = imageConfig
    }
    if (isGemini3Pro && enableGoogleSearch) {
        payload.tools = [{ google_search: {} }]
    }

    const response = await fetchWithRetry(
        apiConfig.endpoint,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            signal
        },
        { timeoutMs: DEFAULT_UPSTREAM_TIMEOUT_MS, retries: DEFAULT_UPSTREAM_RETRIES, retryDelayMs: DEFAULT_UPSTREAM_RETRY_DELAY_MS }
    )

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`API 请求失败 ${response.status}: ${text}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]?.message
    if (!choice) {
        throw new Error('API 返回内容为空')
    }

    const imageCandidates = extractImagesFromChoice(choice)
    const imageUrl = imageCandidates[0] || null

    if (!imageUrl) {
        const textResponse = extractTextResponse(choice.content)
        throw new Error(textResponse || '模型未返回图像')
    }

    const textResponseRaw = extractTextResponse(choice.content)
    const textResponse = filterTextResponse(textResponseRaw)
    return {
        imageUrl,
        imageCandidates,
        textResponse,
        modelUsed: resolvedModel,
        aspectRatioUsed: aspectRatio,
        imageSizeUsed: imageSize
    }
}

function extractImagesFromChoice(choice) {
    const candidates = []

    if (!choice) return candidates

    if (Array.isArray(choice.images)) {
        for (const item of choice.images) {
            const url = item?.image_url?.url
            if (typeof url === 'string' && url.trim()) {
                candidates.push(url.trim())
            }
        }
    }

    const fromContent = extractAllImagesFromContent(choice.content)
    candidates.push(...fromContent)

    // Some providers nest images elsewhere on the message
    const fromChoice = extractAllImagesFromContent(choice)
    candidates.push(...fromChoice)

    // De-dup while keeping order
    const seen = new Set()
    return candidates.filter(item => {
        if (!item) return false
        if (seen.has(item)) return false
        seen.add(item)
        return true
    })
}

function extractImageFromContent(content) {
    if (!content) return null

    // Plain string content that may embed a data URL or markdown link
    if (typeof content === 'string') {
        return extractImageFromString(content)
    }

    // Walk array parts
    if (Array.isArray(content)) {
        for (const part of content) {
            const found = extractImageFromContent(part)
            if (found) return found
        }
        return null
    }

    // Object content with possible image carriers
    if (typeof content === 'object') {
        // Common OpenAI/OpenRouter style
        if (content.type === 'image_url' && content.image_url?.url) {
            return content.image_url.url
        }
        if (content.type === 'response_image_url' && typeof content.url === 'string') {
            return content.url
        }
        if (content.image_url?.url) {
            return content.image_url.url
        }
        if (content.url && typeof content.url === 'string' && isLikelyImageUrl(content.url)) {
            return content.url
        }

        // Gemini style inline_data
        if (content.inline_data?.data) {
            const mime = content.inline_data.mimeType || 'image/png'
            return toDataUrl(content.inline_data.data, mime)
        }

        // Generic base64 fields
        const base64Fields = [content.base64, content.b64_json, content.image_base64, content.data]
        for (const candidate of base64Fields) {
            if (typeof candidate === 'string' && candidate.trim()) {
                return toDataUrl(candidate.trim(), content.mimeType || 'image/png')
            }
        }

        // Text fields that may embed data URL
        if (typeof content.text === 'string') {
            const found = extractImageFromString(content.text)
            if (found) return found
        }

        // Nested collections
        if (content.parts) {
            const found = extractImageFromContent(content.parts)
            if (found) return found
        }
        if (content.content) {
            const found = extractImageFromContent(content.content)
            if (found) return found
        }
    }

    return null
}

function extractAllImagesFromContent(content) {
    if (!content) return []

    if (typeof content === 'string') {
        const found = extractImageFromString(content)
        return found ? [found] : []
    }

    if (Array.isArray(content)) {
        return content.flatMap(part => extractAllImagesFromContent(part))
    }

    if (typeof content === 'object') {
        const hits = []

        if (content.type === 'image_url' && content.image_url?.url) {
            hits.push(content.image_url.url)
        }
        if (content.type === 'response_image_url' && typeof content.url === 'string') {
            hits.push(content.url)
        }
        if (content.image_url?.url) {
            hits.push(content.image_url.url)
        }
        if (typeof content.url === 'string' && isLikelyImageUrl(content.url)) {
            hits.push(content.url)
        }

        if (content.inline_data?.data) {
            const mime = content.inline_data.mimeType || 'image/png'
            hits.push(toDataUrl(content.inline_data.data, mime))
        }

        const base64Fields = [content.base64, content.b64_json, content.image_base64, content.data]
        for (const candidate of base64Fields) {
            if (typeof candidate === 'string' && candidate.trim()) {
                hits.push(toDataUrl(candidate.trim(), content.mimeType || 'image/png'))
            }
        }

        if (typeof content.text === 'string') {
            const fromText = extractImageFromString(content.text)
            if (fromText) hits.push(fromText)
        }

        if (content.parts) {
            hits.push(...extractAllImagesFromContent(content.parts))
        }
        if (content.content) {
            hits.push(...extractAllImagesFromContent(content.content))
        }

        return hits.filter(Boolean)
    }

    return []
}

function extractImageFromString(value) {
    if (!value || typeof value !== 'string') return null

    // Markdown style: ![Generated Image](data:image/...)
    const markdownMatch = value.match(/\((data:image\/[a-zA-Z0-9.+-]+;base64,[^)]+)\)/)
    if (markdownMatch?.[1]) {
        return markdownMatch[1]
    }

    // Direct data URL
    const dataUrlMatch = value.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/)
    if (dataUrlMatch?.[0]) {
        return dataUrlMatch[0]
    }

    // Plain URL that might already be hosted
    const httpMatch = value.match(/https?:\/\/[^\s)]+/i)
    if (httpMatch?.[0] && isLikelyImageUrl(httpMatch[0])) {
        return httpMatch[0]
    }

    return null
}

function isLikelyImageUrl(url) {
    return /^https?:\/\//i.test(url) || url.startsWith('data:image/')
}

function toDataUrl(base64Content, mimeType = 'image/png') {
    const normalized = base64Content.trim()
    if (normalized.startsWith('data:image/')) {
        return normalized
    }
    const cleaned = normalized.replace(/^base64,/, '')
    return `data:${mimeType};base64,${cleaned}`
}

function extractTextResponse(content) {
    if (!content) return ''
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
        return content
            .map(part => extractTextResponse(part))
            .filter(Boolean)
            .join('\n')
    }
    if (typeof content === 'object') {
        if (typeof content.text === 'string') return content.text
        if (content.parts) return extractTextResponse(content.parts)
        if (content.content) return extractTextResponse(content.content)
    }
    return ''
}

function filterTextResponse(text) {
    if (!text || typeof text !== 'string') return ''
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .filter(line => {
            if (/data:image\//i.test(line)) return false
            if (isLikelyImageUrl(line)) return false
            if (/\[generated\s*image\]/i.test(line)) return false
            // very long base64-like strings
            if (/[A-Za-z0-9+/]{80,}={0,2}/.test(line)) return false
            return true
        })
    return lines.join('\n')
}

async function persistGalleryEntry(
    { prompt, responseText, imageSource, imageCandidates, configLabel, configId, modelId, aspectRatio, imageSize },
    requestId,
    { includeImageData } = { includeImageData: false }
) {
    const candidates = Array.isArray(imageCandidates) && imageCandidates.length ? imageCandidates : [imageSource].filter(Boolean)
    const { fileName, imagePath, thumbnailPath, imageData } = await saveImagesToGallery(candidates, requestId, { includeImageData })
    const entries = await loadGallery()
    const entry = {
        id: uuid(),
        prompt,
        responseText: responseText || '',
        imagePath,
        thumbnailPath,
        fileName,
        configLabel,
        configId,
        modelId: modelId || '',
        aspectRatio: aspectRatio || '',
        imageSize: imageSize || '',
        createdAt: new Date().toISOString()
    }
    entries.unshift(entry)
    await saveGallery(entries)
    logInfo('图库', `已写入 gallery.json，记录 ${entry.id}`, { fileName, thumbnailPath }, requestId)
    return { entry, imageData }
}

async function saveImagesToGallery(imageSources, requestId, { includeImageData } = { includeImageData: false }) {
    const downloads = []
    for (const source of imageSources) {
        try {
            downloads.push(await downloadImage(source))
        } catch (error) {
            logError('图库', '下载候选图片失败，将跳过该候选', error, requestId)
        }
    }

    if (!downloads.length) {
        throw new Error('无法下载生成的图片')
    }

    downloads.sort((a, b) => b.byteLength - a.byteLength)
    const primary = downloads[0]
    const smallest = downloads[downloads.length - 1]
    logInfo(
        '图库',
        `候选图片已下载 ${downloads.length} 张，将选择最大作为主图`,
        { sizes: downloads.map(item => item.byteLength) },
        requestId
    )

    const extension = primary.extension || 'png'
    const fileName = `${Date.now()}-${uuid()}.${extension}`
    const filePath = path.join(GALLERY_DIR, fileName)
    await fs.promises.writeFile(filePath, primary.buffer)

    const thumbnailFileName = `thumb-${fileName}`
    const thumbnailFsPath = path.join(THUMBNAILS_DIR, thumbnailFileName)

    const hasDistinctSmall = downloads.length > 1 && smallest.byteLength < primary.byteLength * 0.8
    if (hasDistinctSmall) {
        try {
            await sharp(smallest.buffer)
                .resize(400, 400, { fit: 'cover', position: 'center' })
                .toFile(thumbnailFsPath)
        } catch (error) {
            logError('图库', '写入候选缩略图失败，将回退为本地生成', error, requestId)
            await generateThumbnailFromPrimary(primary.buffer, thumbnailFsPath, requestId)
        }
    } else {
        await generateThumbnailFromPrimary(primary.buffer, thumbnailFsPath, requestId)
    }
    logInfo(
        '图库',
        '图片已落盘',
        { imagePath: `/gallery/${fileName}`, thumbnailPath: `/gallery/thumbnails/${thumbnailFileName}` },
        requestId
    )

    return {
        fileName,
        imagePath: `/gallery/${fileName}`,
        thumbnailPath: `/gallery/thumbnails/${thumbnailFileName}`,
        imageData: includeImageData ? `data:image/${extension};base64,${primary.buffer.toString('base64')}` : null
    }
}

async function downloadImage(imageSource) {
    let buffer
    let extension = 'png'

    if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
        const match = imageSource.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/)
        if (match) {
            extension = match[1]
            buffer = Buffer.from(match[2], 'base64')
        } else {
            throw new Error('无法解析 data URL 图片')
        }
    } else {
        const response = await fetch(imageSource)
        if (!response.ok) {
            throw new Error('无法下载生成的图片')
        }
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('/')) {
            extension = contentType.split('/')[1].split(';')[0]
        }
        buffer = Buffer.from(await response.arrayBuffer())
    }

    return { buffer, extension, byteLength: buffer.length }
}

async function generateThumbnailFromPrimary(buffer, thumbnailPath, requestId) {
    try {
        await sharp(buffer)
            .resize(400, 400, { fit: 'cover', position: 'center' })
            .toFile(thumbnailPath)
    } catch (error) {
        logError('图库', '生成缩略图失败，将回退为直接写入原图', error, requestId)
        await fs.promises.writeFile(thumbnailPath, buffer).catch(() => {})
    }
}


app.delete('/api/gallery/:id', authMiddleware, async (req, res) => {
    try {
        const entries = await loadGallery()
        const index = entries.findIndex(entry => entry.id === req.params.id)
        if (index === -1) {
            return res.status(404).json({ message: '图库记录不存在' })
        }
        const removed = entries.splice(index, 1)[0]
        await saveGallery(entries)
        if (removed.fileName) {
            const filePath = path.join(GALLERY_DIR, removed.fileName)
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath).catch(() => null)
            }
            const thumbnailPath = path.join(THUMBNAILS_DIR, `thumb-${removed.fileName}`)
            if (fs.existsSync(thumbnailPath)) {
                await fs.promises.unlink(thumbnailPath).catch(() => null)
            }
        }
        logInfo('图库', `已删除图库记录 ${removed.id}`, { fileName: removed.fileName }, req.requestId)
        res.json({ entry: removed })
    } catch (error) {
        logError('图库', '删除图库记录失败', error, req.requestId)
        res.status(500).json({ message: '删除图库记录失败' })
    }
})

if (fs.existsSync(DIST_DIR)) {
    app.get(['/webui', '/webui/*'], (_req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'))
    })
}

app.listen(PORT, () => {
    console.log(`[server] 服务已启动，端口 ${PORT}`)
})
