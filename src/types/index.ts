export interface GenerateRequest {
    configId: string
    prompt: string
    images: string[]
    model?: string
    aspectRatio?: string
    imageSize?: string
    enableGoogleSearch?: boolean
    outputFormat?: 'png' | 'jpeg' | 'webp'
    quality?: 'auto' | 'low' | 'medium' | 'high'
    background?: 'auto' | 'opaque' | 'transparent'
    size?: string
    includeImageData?: boolean
}

export type GenerateTaskStatus = 'queued' | 'running' | 'saving' | 'done' | 'failed' | 'canceled'

export interface GenerateTaskResult {
    galleryEntry: GalleryEntry
}

export interface GenerateTask {
    id: string
    status: GenerateTaskStatus
    stage?: string
    createdAt: string
    startedAt?: string
    finishedAt?: string
    error?: string
    upstreamMs?: number
    candidates?: number
    payload?: {
        configId?: string
        model?: string
        aspectRatio?: string
        imageSize?: string
        enableGoogleSearch?: boolean
        outputFormat?: string
        quality?: string
        background?: string
        size?: string
        promptLength?: number
        imagesCount?: number
    }
    result?: GenerateTaskResult | null
}

export interface ApiModel {
    id: string
    name?: string
    description?: string
    capabilities?: {
        image?: boolean
        [key: string]: unknown
    }
    [key: string]: unknown
}

export interface ModelListResponse {
    data?: ApiModel[]
    models?: ApiModel[]
}

export interface ModelOption {
    id: string
    label: string
    description?: string
    supportsImages: boolean
}

export interface StyleTemplate {
    id: string
    title: string
    prompt: string
    image: string
    description: string
}

export interface ApiConfigSummary {
    id: string
    label: string
    endpoint: string
    model: string
    description?: string
}

export interface ApiConfigListResponse {
    configs: ApiConfigSummary[]
    defaultConfigId?: string
}

export interface CreateApiConfigPayload {
    id: string
    label: string
    endpoint: string
    model: string
    description?: string
    apiKey: string
}

export interface UpdateApiConfigPayload {
    label?: string
    endpoint?: string
    model?: string
    description?: string
    apiKey?: string
}

export interface GalleryEntry {
    id: string
    prompt: string
    responseText: string
    imagePath: string
    thumbnailPath?: string
    fileName: string
    configLabel: string
    configId: string
    modelId?: string
    aspectRatio?: string
    imageSize?: string
    createdAt: string
}

export type ServerLogLevel = 'info' | 'error'

export interface ServerLogEntry {
    id: string
    time: string
    level: ServerLogLevel
    scope: string
    message: string
    requestId?: string
    extra?: unknown
}
