import { LocalStorage } from '../utils/storage'

const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:51130'

let runtimeApiBaseUrl: string | null = null

const persistedApiBase = LocalStorage.getApiBaseUrl()
if (persistedApiBase) {
    runtimeApiBaseUrl = persistedApiBase
}

const normalizeUrl = (url: string) => url.replace(/\/+$/, '')

export function getDefaultApiBaseUrl(): string {
    return DEFAULT_API_BASE_URL
}

export function getApiBaseUrl(): string {
    return runtimeApiBaseUrl || DEFAULT_API_BASE_URL
}

export function setApiBaseUrl(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) {
        runtimeApiBaseUrl = null
        LocalStorage.clearApiBaseUrl()
        return DEFAULT_API_BASE_URL
    }
    runtimeApiBaseUrl = normalizeUrl(trimmed)
    LocalStorage.saveApiBaseUrl(runtimeApiBaseUrl)
    return runtimeApiBaseUrl
}

export function resetApiBaseUrl(): string {
    runtimeApiBaseUrl = null
    LocalStorage.clearApiBaseUrl()
    return DEFAULT_API_BASE_URL
}
