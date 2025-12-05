import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG_PATH = path.join(__dirname, 'config', 'app.config.json')
const CONFIG_EXAMPLE_PATH = path.join(__dirname, 'config', 'app.config.example.json')
const DATA_DIR = path.join(__dirname, 'data')
const GALLERY_DATA_PATH = path.join(DATA_DIR, 'gallery.json')
const GALLERY_DIR = path.join(__dirname, 'gallery')

const PORT = process.env.PORT || 51130

const app = express()

function logInfo(scope, message, extra) {
    const time = new Date().toISOString()
    if (extra) {
        console.log(`[${time}][${scope}] ${message}`, extra)
    } else {
        console.log(`[${time}][${scope}] ${message}`)
    }
}

function logError(scope, message, error) {
    const time = new Date().toISOString()
    console.error(`[${time}][${scope}] ${message}`, error)
}

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))
app.use((req, res, next) => {
    const start = Date.now()
    logInfo('HTTP', `收到 ${req.method} ${req.originalUrl}`)
    res.on('finish', () => {
        logInfo('HTTP', `${req.method} ${req.originalUrl} -> ${res.statusCode}，耗时 ${Date.now() - start}ms`)
    })
    next()
})
app.use('/gallery', express.static(GALLERY_DIR))

ensureDirectories()

function ensureDirectories() {
    if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
        logInfo('init', '???????')
    }

    if (!fs.existsSync(CONFIG_PATH) && fs.existsSync(CONFIG_EXAMPLE_PATH)) {
        fs.copyFileSync(CONFIG_EXAMPLE_PATH, CONFIG_PATH)
        logInfo('init', '??????? app.config.json??????????')
    }

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
        logInfo('init', '??????? data/')
    }

    if (!fs.existsSync(GALLERY_DIR)) {
        fs.mkdirSync(GALLERY_DIR, { recursive: true })
        logInfo('init', '??????? gallery/')
    }

    if (!fs.existsSync(GALLERY_DATA_PATH)) {
        fs.writeFileSync(GALLERY_DATA_PATH, JSON.stringify([]))
        logInfo('init', '???? gallery.json')
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
            logInfo('login', '??????')
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
        logError('auth', '????????', error)
            res.status(500).json({ message: '无法读取配置' })
        })
}

app.post('/api/login', async (req, res) => {
    logInfo('login', '??????')
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
            logInfo('login', '??????')
            return res.status(401).json({ message: '密码错误' })
        }

        const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: authConfig.tokenExpiresIn || '12h' })
        logInfo('login', '???????? Token')
        res.json({ token })
    } catch (error) {
        logError('login', '??????', error)
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
        logInfo('api-configs', `?? ${configs.length} ? API ??`)
        res.json({ configs, defaultConfigId })
    } catch (error) {
        logError('api-configs', '??????', error)
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
        logInfo('api-configs', `???? ${newItem.id}`)
        res.json({ config: sanitizeConfig(newItem) })
    } catch (error) {
        logError('api-configs', '??????', error)
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
        logInfo('api-configs', `???? ${nextConfig.id}`)
        res.json({ config: sanitizeConfig(nextConfig) })
    } catch (error) {
        logError('api-configs', '??????', error)
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
        logInfo('api-configs', `???? ${removed.id}`)
        res.json({ config: sanitizeConfig(removed) })
    } catch (error) {
        logError('api-configs', '??????', error)
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
        logInfo('api-configs', `??????????? ${exists.id}`)
        res.json({ defaultConfigId: exists.id })
    } catch (error) {
        logError('api-configs', '??????????????', error)
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

app.get('/api/templates', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        const templates = config.templates || []
        logInfo('templates', `?? ${templates.length} ???`)
        res.json({ templates })
    } catch (error) {
        logError('templates', '读取模板失败', error)
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
        logInfo('templates', `???? ${newTemplate.id}`)
        res.json({ template: newTemplate })
    } catch (error) {
        logError('templates', '新增模板失败', error)
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
        logInfo('templates', `???? ${templates[index].id}`)
        res.json({ template: templates[index] })
    } catch (error) {
        logError('templates', '更新模板失败', error)
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
        logInfo('templates', `???? ${removed.id}`)
        res.json({ template: removed })
    } catch (error) {
        logError('templates', '删除模板失败', error)
        res.status(500).json({ message: '无法删除模板' })
    }
})

app.get('/api/gallery', authMiddleware, async (req, res) => {
    try {
        const entries = await loadGallery()
        logInfo('gallery', `?? ${entries.length} ?????`)
        res.json({ entries })
    } catch (error) {
        logError('gallery', '??????', error)
        res.status(500).json({ message: '无法读取图库' })
    }
})

app.post('/api/generate', authMiddleware, async (req, res) => {
    const payload = req.body || {}
    const configId = payload.configId
    if (!configId) {
        return res.status(400).json({ message: '必须指定 API 配置' })
    }

    try {
        const config = await loadConfig()
        const apiConfig = (config.apiConfigs || []).find(item => item.id === configId)
        if (!apiConfig) {
            return res.status(404).json({ message: '找不到对应的 API 配置' })
        }

        logInfo('generate', `????????? ${apiConfig.id}`)
        const result = await generateImage({
            apiConfig,
            prompt: payload.prompt,
            images: payload.images || [],
            model: payload.model || apiConfig.model,
            aspectRatio: payload.aspectRatio,
            imageSize: payload.imageSize,
            enableGoogleSearch: payload.enableGoogleSearch
        })

        const { entry: savedEntry, dataUrl } = await persistGalleryEntry({
            prompt: payload.prompt,
            responseText: result.textResponse,
            imageSource: result.imageUrl,
            configLabel: apiConfig.label,
            configId: apiConfig.id
        })

        logInfo('generate', `????????? ${savedEntry.id}`)
        res.json({
            imageUrl: savedEntry.imagePath,
            imageData: dataUrl,
            responseText: savedEntry.responseText,
            galleryEntry: savedEntry
        })
    } catch (error) {
        logError('generate', '??????', error)
        res.status(500).json({ message: error.message || '生成失败' })
    }
})

async function fetchModels(apiConfig) {
    const endpoint = resolveModelsEndpoint(apiConfig.endpoint)
    logInfo('models', `? ${apiConfig.id} ??????`, { endpoint })
    const response = await fetch(endpoint, {
        headers: {
            Authorization: `Bearer ${apiConfig.apiKey}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`?????? ${response.status}: ${text}`)
    }

    const data = await response.json()
    const list = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : null
    if (!list) {
        throw new Error('??????')
    }

    logInfo('models', `?? ${list.length} ???`, { endpoint })
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

async function generateImage({ apiConfig, prompt, images, model, aspectRatio, imageSize, enableGoogleSearch }) {
    if (!prompt && (!images || !images.length)) {
        throw new Error('缺少提示词或参考图像')
    }

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
        model: model || apiConfig.model,
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

    const response = await fetch(apiConfig.endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiConfig.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`API 请求失败 ${response.status}: ${text}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]?.message
    if (!choice) {
        throw new Error('API 返回内容为空')
    }

    const imageUrl =
        choice.images?.[0]?.image_url?.url ||
        extractImageFromContent(choice.content) ||
        extractImageFromContent(choice)

    if (!imageUrl) {
        const textResponse = extractTextResponse(choice.content)
        throw new Error(textResponse || '模型未返回图像')
    }

    const textResponse = extractTextResponse(choice.content)
    return { imageUrl, textResponse }
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

async function persistGalleryEntry({ prompt, responseText, imageSource, configLabel, configId }) {
    const { fileName, imagePath, dataUrl } = await saveImageToGallery(imageSource)
    const entries = await loadGallery()
    const entry = {
        id: uuid(),
        prompt,
        responseText: responseText || '',
        imagePath,
        fileName,
        configLabel,
        configId,
        createdAt: new Date().toISOString()
    }
    entries.unshift(entry)
    await saveGallery(entries)
    logInfo('gallery', `??????? ${entry.id}`)
    return { entry, dataUrl }
}

async function saveImageToGallery(imageSource) {
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

    const fileName = `${Date.now()}-${uuid()}.${extension}`
    const filePath = path.join(GALLERY_DIR, fileName)
    await fs.promises.writeFile(filePath, buffer)
    const dataUrl = `data:image/${extension};base64,${buffer.toString('base64')}`
    return { fileName, imagePath: `/gallery/${fileName}`, dataUrl }
}


app.delete('/api/gallery/:id', authMiddleware, async (req, res) => {
    try {
        const entries = await loadGallery()
        const index = entries.findIndex(entry => entry.id === req.params.id)
        if (index === -1) {
            return res.status(404).json({ message: '?????????' })
        }
        const removed = entries.splice(index, 1)[0]
        await saveGallery(entries)
        if (removed.fileName) {
            const filePath = path.join(GALLERY_DIR, removed.fileName)
            if (fs.existsSync(filePath)) {
                await fs.promises.unlink(filePath).catch(() => null)
            }
        }
        logInfo('gallery', `?????? ${removed.id}`)
        res.json({ entry: removed })
    } catch (error) {
        logError('gallery', '?????????', error)
        res.status(500).json({ message: '???????????' })
    }
})

app.listen(PORT, () => {
    console.log(`[server] 服务已启动，端口 ${PORT}`)
})
