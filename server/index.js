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

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))
app.use('/gallery', express.static(GALLERY_DIR))

ensureDirectories()

function ensureDirectories() {
    if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
        fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
    }

    if (!fs.existsSync(CONFIG_PATH) && fs.existsSync(CONFIG_EXAMPLE_PATH)) {
        fs.copyFileSync(CONFIG_EXAMPLE_PATH, CONFIG_PATH)
        console.log('[server] 已从示例创建 app.config.json，请尽快修改默认配置。')
    }

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
    }

    if (!fs.existsSync(GALLERY_DIR)) {
        fs.mkdirSync(GALLERY_DIR, { recursive: true })
    }

    if (!fs.existsSync(GALLERY_DATA_PATH)) {
        fs.writeFileSync(GALLERY_DATA_PATH, JSON.stringify([]))
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
            console.error('[auth] 验证失败', error)
            res.status(500).json({ message: '无法读取配置' })
        })
}

app.post('/api/login', async (req, res) => {
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
            return res.status(401).json({ message: '密码错误' })
        }

        const token = jwt.sign({ role: 'admin' }, jwtSecret, { expiresIn: authConfig.tokenExpiresIn || '12h' })
        res.json({ token })
    } catch (error) {
        console.error('[login] 错误', error)
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
        res.json({ configs })
    } catch (error) {
        console.error('[api-configs] 读取失败', error)
        res.status(500).json({ message: '无法读取 API 配置' })
    }
})

app.get('/api/api-configs/:id/models', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        const apiConfig = (config.apiConfigs || []).find(item => item.id === req.params.id)
        if (!apiConfig) {
            return res.status(404).json({ message: '找不到对应的 API 配置' })
        }

        const models = await fetchModels(apiConfig)
        res.json({ models })
    } catch (error) {
        console.error('[models] 获取失败', error)
        res.status(500).json({ message: error.message || '无法获取模型列表' })
    }
})

app.get('/api/templates', authMiddleware, async (req, res) => {
    try {
        const config = await loadConfig()
        res.json({ templates: config.templates || [] })
    } catch (error) {
        console.error('[templates] 读取失败', error)
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
        res.json({ template: newTemplate })
    } catch (error) {
        console.error('[templates] 新增失败', error)
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
        res.json({ template: templates[index] })
    } catch (error) {
        console.error('[templates] 更新失败', error)
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
        res.json({ template: removed })
    } catch (error) {
        console.error('[templates] 删除失败', error)
        res.status(500).json({ message: '无法删除模板' })
    }
})

app.get('/api/gallery', authMiddleware, async (req, res) => {
    try {
        const entries = await loadGallery()
        res.json({ entries })
    } catch (error) {
        console.error('[gallery] 读取失败', error)
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

        res.json({
            imageUrl: savedEntry.imagePath,
            imageData: dataUrl,
            responseText: savedEntry.responseText,
            galleryEntry: savedEntry
        })
    } catch (error) {
        console.error('[generate] 失败', error)
        res.status(500).json({ message: error.message || '生成失败' })
    }
})

async function fetchModels(apiConfig) {
    const endpoint = resolveModelsEndpoint(apiConfig.endpoint)
    const response = await fetch(endpoint, {
        headers: {
            Authorization: `Bearer ${apiConfig.apiKey}`,
            'Content-Type': 'application/json'
        }
    })

    if (!response.ok) {
        const text = await response.text()
        throw new Error(`模型接口错误 ${response.status}: ${text}`)
    }

    const data = await response.json()
    if (Array.isArray(data.data)) return data.data
    if (Array.isArray(data.models)) return data.models
    throw new Error('模型列表为空')
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
        (typeof choice.content === 'string' && choice.content.startsWith('data:image/') ? choice.content : null) ||
        extractImageFromContent(choice.content)

    if (!imageUrl) {
        const textResponse = extractTextResponse(choice.content)
        throw new Error(textResponse || '模型未返回图像')
    }

    const textResponse = extractTextResponse(choice.content)
    return { imageUrl, textResponse }
}

function extractImageFromContent(content) {
    if (!content) return null
    if (Array.isArray(content)) {
        const imagePart = content.find(part => part.type === 'image_url')
        if (imagePart?.image_url?.url) {
            return imagePart.image_url.url
        }
    }
    return null
}

function extractTextResponse(content) {
    if (!content) return ''
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
        return content
            .filter(part => part.type === 'text' && typeof part.text === 'string')
            .map(part => part.text)
            .join('\n')
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

app.listen(PORT, () => {
    console.log(`[server] 服务已启动，端口 ${PORT}`)
})
