import { API_BASE_URL } from '../config/client'
import type {
    ApiConfigSummary,
    ApiModel,
    GalleryEntry,
    GenerateRequest,
    GenerateResponse,
    StyleTemplate
} from '../types'

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers
    })

    if (!response.ok) {
        const message = await extractErrorMessage(response)
        throw new Error(message)
    }

    return (await response.json()) as T
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
    const data = await request<{ configs: ApiConfigSummary[] }>('/api/api-configs', { method: 'GET' }, token)
    return data.configs || []
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

export async function generateImage(token: string, payload: GenerateRequest) {
    return request<GenerateResponse>('/api/generate', { method: 'POST', body: JSON.stringify(payload) }, token)
}

export async function fetchGallery(token: string) {
    const data = await request<{ entries: GalleryEntry[] }>('/api/gallery', { method: 'GET' }, token)
    return data.entries || []
}
