export const MODEL_CAPABILITY_RULES = {
    aspectRatioExactTailIds: ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview'],
    aspectRatioSubstrings: ['gemini-3-pro-image', 'gemini-3.1-flash-image'],
    imageSizeSubstrings: ['gemini-3-pro-image', 'gemini-3.1-flash-image'],
    googleSearchSubstrings: ['gemini-3-pro-image'],
    openAIImagePrefixes: ['gpt-image-']
}

export function normalizeModelId(modelId) {
    return typeof modelId === 'string' ? modelId.toLowerCase().trim() : ''
}

export function getModelTailId(modelId) {
    const normalized = normalizeModelId(modelId)
    if (!normalized) return ''
    const segments = normalized.split('/')
    return segments[segments.length - 1] || ''
}

function matchesAnySubstring(modelId, candidates) {
    return candidates.some(candidate => modelId.includes(candidate))
}

export function supportsAspectRatio(modelId) {
    const normalized = normalizeModelId(modelId)
    if (!normalized) return false
    const tailId = getModelTailId(normalized)
    return (
        MODEL_CAPABILITY_RULES.aspectRatioExactTailIds.includes(tailId) ||
        matchesAnySubstring(normalized, MODEL_CAPABILITY_RULES.aspectRatioSubstrings)
    )
}

export function supportsImageSize(modelId) {
    const normalized = normalizeModelId(modelId)
    if (!normalized) return false
    return matchesAnySubstring(normalized, MODEL_CAPABILITY_RULES.imageSizeSubstrings)
}

export function supportsGoogleSearch(modelId) {
    const normalized = normalizeModelId(modelId)
    if (!normalized) return false
    return matchesAnySubstring(normalized, MODEL_CAPABILITY_RULES.googleSearchSubstrings)
}

export function isOpenAIImageModel(modelId) {
    const tailId = getModelTailId(modelId)
    if (!tailId) return false
    return MODEL_CAPABILITY_RULES.openAIImagePrefixes.some(prefix => tailId.startsWith(prefix))
}

export function supportsOpenAIImageOptions(modelId) {
    return isOpenAIImageModel(modelId)
}

export function supportsOpenAITransparentBackground(_modelId) {
    return false
}
