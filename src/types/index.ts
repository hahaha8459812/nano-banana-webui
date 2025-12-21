export interface GenerateRequest {
    configId: string
    prompt: string
    images: string[]
    model?: string
    aspectRatio?: string
    imageSize?: string
    enableGoogleSearch?: boolean
    includeImageData?: boolean
}

export interface GenerateResponse {
    imageUrl: string
    responseText?: string
    imageData?: string
    galleryEntry: GalleryEntry
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
