import { getApiBaseUrl } from '../config/client'
import type {
    ApiConfigListResponse,
    ApiConfigSummary,
    ApiModel,
    CreateApiConfigPayload,
    GalleryEntry,
    GenerateRequest,
    GenerateTask,
    StyleTemplate,
    UpdateApiConfigPayload
} from '../types'

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
    const headers = new Headers(options.headers || { 'Content-Type': 'application/json' })
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    const method = options.method || 'GET'
    const logPrefix = `[前端] ${method} ${path}`
    console.info(`${logPrefix} -> 开始请求`)

    try {
        const response = await fetch(`${getApiBaseUrl()}${path}`, {
            ...options,
            headers
        })

        if (!response.ok) {
            const message = await extractErrorMessage(response)
            console.error(`${logPrefix} -> HTTP ${response.status}，服务端返回：${message}`)
            throw new Error(message)
        }

        console.info(`${logPrefix} -> 请求成功`)
        return (await response.json()) as T
    } catch (error) {
        console.error(`${logPrefix} -> 请求失败`, error)
        throw error
    }
}

async function extractErrorMessage(response: Response): Promise<string> {
    try {
        const data = await response.json()
        if (data?.message) {
            return data.message
        }
        return JSON.stringify(data)
    } catch {
        return `${response.status} ${response.statusText}`
    }
}

export async function login(password: string) {
    return request<{ token: string }>('/api/login', { method: 'POST', body: JSON.stringify({ password }) })
}

export async function verifySession(token: string) {
    return request<{ ok: boolean }>('/api/session', { method: 'GET' }, token)
}

export async function fetchApiConfigs(token: string) {
    return request<ApiConfigListResponse>('/api/api-configs', { method: 'GET' }, token)
}

export async function createApiConfig(token: string, payload: CreateApiConfigPayload) {
    const data = await request<{ config: ApiConfigSummary }>('/api/api-configs', { method: 'POST', body: JSON.stringify(payload) }, token)
    return data.config
}

export async function updateApiConfig(token: string, id: string, payload: UpdateApiConfigPayload) {
    const data = await request<{ config: ApiConfigSummary }>(`/api/api-configs/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token)
    return data.config
}

export async function deleteApiConfig(token: string, id: string) {
    const data = await request<{ config: ApiConfigSummary }>(`/api/api-configs/${id}`, { method: 'DELETE' }, token)
    return data.config
}

export async function setDefaultApiConfig(token: string, id: string) {
    return request<{ defaultConfigId: string }>(`/api/api-configs/${id}/default`, { method: 'POST' }, token)
}

export async function fetchTemplates(token: string) {
    const data = await request<{ templates: StyleTemplate[] }>('/api/templates', { method: 'GET' }, token)
    return data.templates || []
}

export async function createTemplate(token: string, template: Partial<StyleTemplate>) {
    const data = await request<{ template: StyleTemplate }>('/api/templates', { method: 'POST', body: JSON.stringify(template) }, token)
    return data.template
}

export async function updateTemplate(token: string, id: string, template: Partial<StyleTemplate>) {
    const data = await request<{ template: StyleTemplate }>(
        `/api/templates/${id}`,
        { method: 'PUT', body: JSON.stringify(template) },
        token
    )
    return data.template
}

export async function deleteTemplate(token: string, id: string) {
    const data = await request<{ template: StyleTemplate }>(`/api/templates/${id}`, { method: 'DELETE' }, token)
    return data.template
}

export async function fetchModels(token: string, configId: string) {
    const data = await request<{ models: ApiModel[] }>(`/api/api-configs/${configId}/models`, { method: 'GET' }, token)
    return data.models || []
}

export async function createGenerateTask(token: string, payload: GenerateRequest) {
    return request<{ taskId: string; status: string }>('/api/generate/task', { method: 'POST', body: JSON.stringify(payload) }, token)
}

export async function fetchGenerateTask(token: string, id: string) {
    return request<GenerateTask>(`/api/generate/task/${id}`, { method: 'GET' }, token)
}

export async function cancelGenerateTask(token: string, id: string) {
    return request<GenerateTask>(`/api/generate/task/${id}`, { method: 'DELETE' }, token)
}

export async function fetchGallery(token: string) {
    const data = await request<{ entries: GalleryEntry[] }>('/api/gallery', { method: 'GET' }, token)
    return data.entries || []
}

export async function deleteGalleryEntry(token: string, id: string) {
    return request<{ entry: GalleryEntry }>(`/api/gallery/${id}`, { method: 'DELETE' }, token)
}
