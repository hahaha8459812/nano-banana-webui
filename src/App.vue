<template>
    <div :class="['min-h-screen relative overflow-hidden', 'theme-dark']">
        <div class="container mx-auto px-3 py-4 relative z-10">
            <div class="relative mb-6">
                <BaseCard class="bg-skin-card">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div class="text-center md:text-left">
                            <h1 class="text-4xl font-black mb-1 flex items-center gap-2 justify-center md:justify-start">
                                IMAGE 工作室
                            </h1>
                            <p class="text-base font-medium">上传灵感，后端代你调用任意 API</p>
                        </div>
                        <div class="flex flex-wrap gap-2 justify-center md:justify-end">
                            <template v-if="isAuthenticated">
                                <BaseButton
                                    @click="viewMode = 'workspace'"
                                    :variant="viewMode === 'workspace' ? 'primary' : 'secondary'"
                                >
                                    🎨 工作区
                                </BaseButton>
                                <BaseButton
                                    @click="viewMode = 'gallery'"
                                    :variant="viewMode === 'gallery' ? 'primary' : 'secondary'"
                                >
                                    🖼 图库
                                </BaseButton>
                                <BaseButton @click="handleLogout" variant="secondary">
                                    退出登录
                                </BaseButton>
                            </template>
                        </div>
                    </div>
                </BaseCard>
            </div>

            <div v-if="uiNotice" class="mb-4">
                <div
                    :class="[
                        'px-4 py-3 rounded-lg border-4 border-black text-sm font-semibold shadow-lg',
                        uiNotice.type === 'success' ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900'
                    ]"
                >
                    {{ uiNotice.message }}
                </div>
            </div>

            <div v-if="!isAuthenticated" class="max-w-md mx-auto">
                <BaseCard title="🔐 输入工作密码">
                    <form class="space-y-4" @submit.prevent="handleLogin">
                        <div class="space-y-2">
                            <BaseInput
                                label="🌐 后端 API 地址"
                                v-model="serverBaseUrl"
                                @input="clearBaseUrlMessage"
                                placeholder="https://example.com:51130"
                                :error="baseUrlError"
                                :hint="baseUrlHint"
                            />
                            <div class="flex flex-col gap-2 sm:flex-row">
                                <BaseButton
                                    type="button"
                                    @click="handleSaveServerBaseUrl"
                                    variant="primary"
                                    class="flex-1"
                                >
                                    保存地址
                                </BaseButton>
                                <BaseButton
                                    type="button"
                                    @click="resetServerBaseUrl"
                                    variant="secondary"
                                    class="flex-1"
                                >
                                    恢复默认
                                </BaseButton>
                            </div>
                        </div>
                        <BaseInput
                            type="password"
                            v-model="password"
                            placeholder="请输入部署者设置的密码"
                            :error="authError"
                        />
                        <BaseButton
                            type="submit"
                            :disabled="!password.trim() || isAuthenticating"
                            :loading="isAuthenticating"
                            variant="primary"
                            block
                        >
                            {{ isAuthenticating ? '正在验证...' : '进入工作区' }}
                        </BaseButton>
                    </form>
                </BaseCard>
            </div>

            <template v-else>
                <div class="mb-6">
                    <ApiConfigSelector
                        :configs="apiConfigs"
                        :default-config-id="defaultApiConfigId"
                        :selected-config-id="selectedConfigId"
                        :selected-model-id="selectedModelId"
                        :model-options="modelOptions"
                        :model-loading="isFetchingModels"
                        :model-error="modelsError"
                        :management-loading="isApiConfigMutating"
                        @update:selected-config-id="updateSelectedConfig"
                        @update:selected-model-id="value => (selectedModelId = value)"
                        @fetch-models="handleFetchModels"
                        @create-api-config="handleCreateApiConfig"
                        @update-api-config="handleUpdateApiConfig"
                        @delete-api-config="handleDeleteApiConfig"
                        @set-default-api-config="handleSetDefaultApiConfig"
                    />
                </div>

                <div v-if="viewMode === 'workspace'" class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:items-start">
                    <div v-if="!hasImageToImageInput" class="flex flex-col gap-4 order-2 lg:order-1" :class="{ 'lg:col-span-2': hasTextToImageInput }">
                        <div class="flex flex-col h-full">
                            <BaseCard title="📝 文生图 · 灵感工作台" class="h-full flex flex-col">
                                <div class="flex flex-col gap-3 flex-1">
                                    <BaseInput
                                        type="textarea"
                                        v-model="textToImagePrompt"
                                        label="🍌 描述你的创意："
                                        placeholder="如：暮色中的赛博都市，霓虹光影交错..."
                                        :rows="6"
                                        class="flex-1"
                                    />
                                </div>
                                <template #footer>
                                    <p class="text-xs sm:text-sm text-skin-muted font-medium flex items-center gap-2">
                                        <span>💡</span>
                                        <span>输入提示词后即可单击按钮生成，结果会自动保存到图库。</span>
                                    </p>
                                </template>
                            </BaseCard>
                        </div>
                    </div>

                    <div v-if="!hasTextToImageInput" class="flex flex-col gap-4 h-full order-1 lg:order-2" :class="{ 'lg:col-span-2': hasImageToImageInput }">
                        <div class="flex flex-col">
                            <BaseCard title="🖼 图文生图 · 上传参考" class="h-full flex flex-col">
                                <div class="flex-1">
                                    <ImageUpload v-model="selectedImages" />
                                </div>
                            </BaseCard>
                        </div>

                        <div class="flex flex-col h-full">
                            <BaseCard title="🎨 选择风格或自定义提示词" class="h-full flex flex-col">
                                <div class="flex-1">
                                    <StylePromptSelector
                                        v-model:selectedStyle="selectedStyle"
                                        v-model:customPrompt="customPrompt"
                                        :templates="templates"
                                        @create-template="handleCreateTemplate"
                                        @update-template="handleUpdateTemplate"
                                        @delete-template="handleDeleteTemplate"
                                    />
                                </div>
                            </BaseCard>
                        </div>
                    </div>
                </div>

                <!-- Shared Configuration Section -->
                <div v-if="viewMode === 'workspace' && (showAspectRatioSelector || showGemini3ProConfig)" class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                    <div v-if="showAspectRatioSelector" class="flex flex-col">
                        <BaseCard title="🧮 图像宽高比">
                            <AspectRatioSelector v-model="selectedAspectRatio" :model-type="showGemini3ProConfig ? 'gemini-3-pro-image' : 'default'" :image-size="gemini3ImageSize" />
                        </BaseCard>
                    </div>

                    <div v-if="showGemini3ProConfig" class="flex flex-col">
                        <BaseCard title="🧠 Gemini 3 Pro Image 参数">
                            <Gemini3ProConfig v-model:imageSize="gemini3ImageSize" v-model:enableGoogleSearch="gemini3EnableGoogleSearch" />
                        </BaseCard>
                    </div>
                </div>

                <div v-if="viewMode === 'workspace'" class="mb-6">
                    <div class="flex flex-col gap-4 lg:flex-row lg:gap-6">
                        <BaseButton
                            v-if="!hasImageToImageInput"
                            @click="handleTextToImageGenerate"
                            :disabled="!canGenerateTextImage"
                            :loading="isTextToImageLoading"
                            variant="primary"
                            class="flex-1 py-4 text-xl"
                        >
                            🍌 纯提示词生成
                        </BaseButton>
                        <BaseButton
                            v-if="!hasTextToImageInput"
                            @click="handleGenerate"
                            :disabled="!canGenerate"
                            :loading="isLoading"
                            variant="primary"
                            class="flex-1 py-4 text-xl"
                        >
                            🍌 图文混合生成
                        </BaseButton>
                    </div>
                </div>

                <div v-if="viewMode === 'workspace'" class="w-full">
                    <BaseCard title="✅ 最新结果">
                        <ResultDisplay
                            :result="displayResult"
                            :response-text="displayResponseText"
                            :loading="displayLoading"
                            :error="displayError"
                            @download="handleDownloadResult"
                        />
                    </BaseCard>
                </div>

                <div v-else class="mb-6">
                    <GalleryView
                        :entries="paginatedGalleryEntries"
                        :total="galleryEntries.length"
                        :page="galleryPage"
                        :page-count="totalGalleryPages"
                        @refresh="loadGallery"
                        @delete-entry="handleDeleteGalleryEntry"
                        @change-page="changeGalleryPage"
                        @show-detail="openGalleryDetail"
                    />
                    <GalleryDetailModal
                        :visible="Boolean(selectedGalleryEntry)"
                        :entry="selectedGalleryEntry"
                        @close="selectedGalleryEntry = null"
                    />
                </div>

            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import BaseButton from './components/BaseButton.vue'
import BaseCard from './components/BaseCard.vue'
import BaseInput from './components/BaseInput.vue'
import ApiConfigSelector from './components/ApiConfigSelector.vue'
import ImageUpload from './components/ImageUpload.vue'
import StylePromptSelector from './components/StylePromptSelector.vue'
import ResultDisplay from './components/ResultDisplay.vue'
import AspectRatioSelector from './components/AspectRatioSelector.vue'
import Gemini3ProConfig from './components/Gemini3ProConfig.vue'
import GalleryView from './components/GalleryView.vue'
import GalleryDetailModal from './components/GalleryDetailModal.vue'
import {
    createApiConfig as createApiConfigRequest,
    createTemplate,
    deleteApiConfig as deleteApiConfigRequest,
    deleteGalleryEntry as deleteGalleryEntryRequest,
    deleteTemplate as deleteTemplateRequest,
    fetchApiConfigs,
    fetchGallery,
    fetchModels,
    fetchTemplates,
    generateImage,
    login,
    setDefaultApiConfig as setDefaultApiConfigRequest,
    updateApiConfig as updateApiConfigRequest,
    updateTemplate as updateTemplateRequest,
    verifySession
} from './services/backend'
import { LocalStorage } from './utils/storage'
import type {
    ApiConfigSummary,
    GalleryEntry,
    ModelOption,
    StyleTemplate,
    ApiModel,
    CreateApiConfigPayload,
    UpdateApiConfigPayload
} from './types'
import { DEFAULT_MODEL_ID } from './config/api'
import { getApiBaseUrl, getDefaultApiBaseUrl, setApiBaseUrl } from './config/client'

const theme = ref<'light' | 'dark'>('dark')

const password = ref('')
const authError = ref('')
const uiNotice = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const isAuthenticating = ref(false)
const authToken = ref(LocalStorage.getAuthToken())
const isAuthenticated = computed(() => Boolean(authToken.value))
const viewMode = ref<'workspace' | 'gallery'>('workspace')

const apiConfigs = ref<ApiConfigSummary[]>([])
const defaultApiConfigId = ref('')
const selectedConfigId = ref(LocalStorage.getSelectedConfigId())
const selectedModelId = ref('')
const modelOptions = ref<ModelOption[]>([])
const isFetchingModels = ref(false)
const modelsError = ref<string | null>(null)

const templates = ref<StyleTemplate[]>([])
const galleryEntries = ref<GalleryEntry[]>([])
const galleryPage = ref(1)
const isMobileGallery = ref(false)
const galleryPageSize = computed(() => (isMobileGallery.value ? 6 : 12))
const totalGalleryPages = computed(() => {
    const total = galleryEntries.value.length
    return Math.max(1, Math.ceil(Math.max(total, 1) / galleryPageSize.value))
})
const paginatedGalleryEntries = computed(() => {
    const start = (galleryPage.value - 1) * galleryPageSize.value
    return galleryEntries.value.slice(start, start + galleryPageSize.value)
})
const selectedGalleryEntry = ref<GalleryEntry | null>(null)

const selectedImages = ref<string[]>([])
const selectedStyle = ref('')
const customPrompt = ref('')
const textToImagePrompt = ref('')
const serverBaseUrl = ref(getApiBaseUrl())
const baseUrlError = ref('')
const baseUrlHint = ref('')

const isLoading = ref(false)
const isTextToImageLoading = ref(false)
const result = ref<string | null>(null)
const resultResponseText = ref<string | null>(null)
const textToImageResult = ref<string | null>(null)
const textToImageResponse = ref<string | null>(null)
const error = ref<string | null>(null)
const textToImageError = ref<string | null>(null)
const latestResultSource = ref<'text' | 'image' | null>(null)

const selectedAspectRatio = ref('1:1')
const gemini3ImageSize = ref('2K')
const gemini3EnableGoogleSearch = ref(false)
const isApiConfigMutating = ref(false)
type ApiConfigFormPayload = {
    id: string
    label: string
    endpoint: string
    model: string
    description?: string
    apiKey?: string
}

const activeTabClass = 'px-4 py-2 rounded-lg border-2 border-black bg-black text-white font-semibold shadow-lg'
const inactiveTabClass = 'px-4 py-2 rounded-lg border-2 border-black bg-white text-black font-semibold hover:bg-yellow-200'

const selectedConfig = computed(() => apiConfigs.value.find(config => config.id === selectedConfigId.value) || null)

watch(
    () => selectedConfigId.value,
    newId => {
        if (!newId) return
        LocalStorage.saveSelectedConfigId(newId)
        modelsError.value = null
        modelOptions.value = []
        const storedModel = LocalStorage.getModelSelection(newId)
        const fallback = selectedConfig.value?.model || DEFAULT_MODEL_ID
        selectedModelId.value = storedModel || fallback
    }
)

watch(
    () => selectedModelId.value,
    newValue => {
        if (newValue && selectedConfigId.value) {
            LocalStorage.saveModelSelection(selectedConfigId.value, newValue)
        }
    }
)

watch(
    () => textToImagePrompt.value,
    () => {
        if (textToImageError.value) {
            textToImageError.value = null
        }
    }
)

const showNotice = (type: 'success' | 'error', message: string, duration = 4000) => {
    uiNotice.value = { type, message }
    if (duration > 0) {
        setTimeout(() => {
            if (uiNotice.value?.message === message) {
                uiNotice.value = null
            }
        }, duration)
    }
}

const clearBaseUrlMessage = () => {
    baseUrlError.value = ''
    baseUrlHint.value = ''
}

const handleGalleryResize = () => {
    if (typeof window === 'undefined') return
    isMobileGallery.value = window.innerWidth < 768
}

watch([() => galleryEntries.value.length, galleryPageSize], () => {
    const max = totalGalleryPages.value
    if (galleryPage.value > max) {
        galleryPage.value = max
    }
    if (galleryPage.value < 1) {
        galleryPage.value = 1
    }
})

const saveServerBaseUrl = (silent = false) => {
    if (!silent) {
        baseUrlHint.value = ''
    }
    baseUrlError.value = ''
    let candidate = serverBaseUrl.value.trim()
    if (!candidate) {
        baseUrlError.value = '后端地址不能为空'
        return false
    }
    if (!/^https?:\/\//i.test(candidate)) {
        candidate = `http://${candidate}`
    }
    try {
        const normalized = new URL(candidate).toString().replace(/\/+$/, '')
        serverBaseUrl.value = setApiBaseUrl(normalized)
        if (!silent) {
            baseUrlHint.value = '已保存后端地址'
        }
        return true
    } catch (error) {
        baseUrlError.value = '请输入合法的 URL，例如 https://example.com:51130'
        return false
    }
}

const handleSaveServerBaseUrl = () => saveServerBaseUrl(false)

const resetServerBaseUrl = () => {
    clearBaseUrlMessage()
    const restored = getDefaultApiBaseUrl()
    serverBaseUrl.value = setApiBaseUrl(restored)
    baseUrlHint.value = '已恢复默认地址'
}

const displayLoading = computed(() => {
    if (latestResultSource.value === 'image') return isLoading.value
    if (latestResultSource.value === 'text') return isTextToImageLoading.value
    return isLoading.value || isTextToImageLoading.value
})

const displayResult = computed(() => {
    if (latestResultSource.value === 'image') return result.value
    if (latestResultSource.value === 'text') return textToImageResult.value
    return result.value || textToImageResult.value
})

const displayResponseText = computed(() => {
    if (latestResultSource.value === 'image') return resultResponseText.value
    if (latestResultSource.value === 'text') return textToImageResponse.value
    return resultResponseText.value || textToImageResponse.value
})

const displayError = computed(() => {
    if (latestResultSource.value === 'image') return error.value
    if (latestResultSource.value === 'text') return textToImageError.value
    return error.value || textToImageError.value
})

const canGenerateTextImage = computed(
    () =>
        isAuthenticated.value &&
        selectedConfigId.value &&
        (selectedModelId.value || selectedConfig.value?.model) &&
        textToImagePrompt.value.trim() &&
        !isTextToImageLoading.value
)

const canGenerate = computed(
    () =>
        isAuthenticated.value &&
        selectedConfigId.value &&
        (selectedModelId.value || selectedConfig.value?.model) &&
        selectedImages.value.length > 0 &&
        (selectedStyle.value || customPrompt.value.trim()) &&
        !isLoading.value
)

const showAspectRatioSelector = computed(() => {
    const modelId = (selectedModelId.value || selectedConfig.value?.model || '').toLowerCase().trim()
    if (!modelId) return false
    const segments = modelId.split('/')
    const normalizedId = segments[segments.length - 1]
    return normalizedId === 'gemini-2.5-flash-image' || normalizedId === 'gemini-2.5-flash-image-preview' || modelId.includes('gemini-3-pro-image')
})

const showGemini3ProConfig = computed(() => {
    const modelId = (selectedModelId.value || selectedConfig.value?.model || '').toLowerCase().trim()
    if (!modelId) return false
    return modelId.includes('gemini-3-pro-image')
})

const hasTextToImageInput = computed(() => textToImagePrompt.value.trim().length > 0)
const hasImageToImageInput = computed(() => selectedImages.value.length > 0 || selectedStyle.value || customPrompt.value.trim().length > 0)

onMounted(async () => {
    if (authToken.value) {
        try {
            await verifySession(authToken.value)
            await loadAllData()
        } catch (err) {
            console.error('session 失效', err)
            handleLogout()
        }
    }
})

onMounted(() => {
    handleGalleryResize()
    window.addEventListener('resize', handleGalleryResize)
    applyTheme(theme.value)
})

onUnmounted(() => {
    window.removeEventListener('resize', handleGalleryResize)
})

const updateSelectedConfig = (value: string) => {
    selectedConfigId.value = value
}

const handleLogin = async () => {
    if (!password.value.trim()) return
    authError.value = ''
    if (!saveServerBaseUrl(true)) {
        return
    }
    isAuthenticating.value = true
    try {
        const { token } = await login(password.value.trim())
        authToken.value = token
        LocalStorage.saveAuthToken(token)
        password.value = ''
        await loadAllData()
    } catch (error) {
        authError.value = error instanceof Error ? error.message : '登录失败'
    } finally {
        isAuthenticating.value = false
    }
}

const handleLogout = () => {
    authToken.value = ''
    LocalStorage.clearAll()
    apiConfigs.value = []
    templates.value = []
    galleryEntries.value = []
    selectedImages.value = []
    selectedConfigId.value = ''
    selectedModelId.value = ''
    modelOptions.value = []
}

const loadAllData = async () => {
    await Promise.all([loadConfigs(), loadTemplates(), loadGallery()])
}

const loadConfigs = async () => {
    if (!authToken.value) return
    const data = await fetchApiConfigs(authToken.value)
    const configs = data.configs || []
    apiConfigs.value = configs
    defaultApiConfigId.value = data.defaultConfigId || ''
    if (!configs.length) {
        selectedConfigId.value = ''
        return
    }
    const stored = LocalStorage.getSelectedConfigId()
    const storedValid = stored && configs.find(config => config.id === stored)
    const defaultValid = defaultApiConfigId.value && configs.find(config => config.id === defaultApiConfigId.value)
    if (storedValid) {
        selectedConfigId.value = stored as string
    } else if (defaultValid) {
        selectedConfigId.value = defaultApiConfigId.value
    } else if (!configs.find(config => config.id === selectedConfigId.value)) {
        selectedConfigId.value = configs[0].id
    }
}

const loadTemplates = async () => {
    if (!authToken.value) return
    templates.value = await fetchTemplates(authToken.value)
}

const loadGallery = async () => {
    if (!authToken.value) return
    const entries = await fetchGallery(authToken.value)
    galleryEntries.value = normalizeGalleryEntries(entries)
    galleryPage.value = 1
}

const handleFetchModels = async () => {
    if (!authToken.value || !selectedConfigId.value) return
    try {
        isFetchingModels.value = true
        modelsError.value = null
        const raw = await fetchModels(authToken.value, selectedConfigId.value)
        const mapped = mapModelsToOptions(raw)
        if (!mapped.length) {
            throw new Error('未获取到可用模型')
        }
        modelOptions.value = mapped
        const preferred = LocalStorage.getModelSelection(selectedConfigId.value) || findPreferredModel(mapped) || selectedConfig.value?.model || DEFAULT_MODEL_ID
        selectedModelId.value = preferred
    } catch (error) {
        modelsError.value = error instanceof Error ? error.message : '获取模型失败'
        modelOptions.value = []
    } finally {
        isFetchingModels.value = false
    }
}

const findPreferredModel = (options: ModelOption[]) => {
    const preferImage = options.find(option => option.supportsImages)
    return preferImage?.id || options[0]?.id || ''
}

const mapModelsToOptions = (models: ApiModel[]): ModelOption[] => {
    const uniqueIds = new Set<string>()
    const options: ModelOption[] = []

    models.forEach(model => {
        if (!model?.id || uniqueIds.has(model.id)) return
        uniqueIds.add(model.id)

        const supportsImages = detectImageSupport(model)
        const label = buildModelLabel(model)
        const description = (typeof model.description === 'string' && model.description.trim()) ||
            (typeof (model as Record<string, unknown>).about === 'string' && String((model as Record<string, unknown>).about).trim()) ||
            ''

        options.push({
            id: model.id,
            label,
            description,
            supportsImages
        })
    })

    return options.sort((a, b) => {
        if (a.supportsImages !== b.supportsImages) {
            return a.supportsImages ? -1 : 1
        }
        return a.label.localeCompare(b.label)
    })
}

const detectImageSupport = (model: ApiModel): boolean => {
    const caps = model.capabilities
    if (caps && typeof caps === 'object') {
        if ((caps as Record<string, unknown>).image === true) return true
        if ((caps as Record<string, unknown>).images === true) return true
        if ((caps as Record<string, unknown>).vision === true) return true
        if ((caps as Record<string, unknown>).multimodal === true) return true
    }

    const tags = (model as Record<string, unknown>).tags
    if (Array.isArray(tags) && tags.some(tag => typeof tag === 'string' && /image|vision|photo|picture|art|draw/i.test(tag))) {
        return true
    }

    return /image|vision|flux|art|picture|photo|illustration/i.test(model.id)
}

const buildModelLabel = (model: ApiModel): string => {
    if (model.name && typeof model.name === 'string' && model.name.trim()) {
        return model.name.trim()
    }
    const segments = model.id.split('/')
    const lastSegment = segments[segments.length - 1]
    return lastSegment || model.id
}

const buildPrompt = () => {
    if (selectedStyle.value) {
        return templates.value.find(template => template.id === selectedStyle.value)?.prompt || customPrompt.value
    }
    return customPrompt.value
}

const buildGeneratePayload = (prompt: string, images: string[]) => {
    return {
        configId: selectedConfigId.value || '',
        prompt,
        images,
        model: selectedModelId.value || selectedConfig.value?.model || DEFAULT_MODEL_ID,
        aspectRatio: showAspectRatioSelector.value ? selectedAspectRatio.value : undefined,
        imageSize: showGemini3ProConfig.value ? gemini3ImageSize.value : undefined,
        enableGoogleSearch: showGemini3ProConfig.value ? gemini3EnableGoogleSearch.value : undefined
    }
}

const handleTextToImageGenerate = async () => {
    if (!canGenerateTextImage.value || !authToken.value) return
    latestResultSource.value = 'text'
    isTextToImageLoading.value = true
    textToImageError.value = null
    textToImageResult.value = null
    try {
        const request = buildGeneratePayload(textToImagePrompt.value, [])
        const response = await generateImage(authToken.value, request)
        const image = response.imageData || withServerBase(response.imageUrl)
        textToImageResult.value = image
        textToImageResponse.value = response.responseText || ''
        galleryEntries.value = [normalizeGalleryEntry(response.galleryEntry), ...galleryEntries.value]
    } catch (error) {
        textToImageError.value = error instanceof Error ? error.message : '生成失败'
        textToImageResult.value = null
    } finally {
        isTextToImageLoading.value = false
    }
}

const handleGenerate = async () => {
    if (!canGenerate.value || !authToken.value) return
    latestResultSource.value = 'image'
    isLoading.value = true
    error.value = null
    result.value = null
    try {
        const prompt = buildPrompt()
        const request = buildGeneratePayload(prompt, selectedImages.value)
        const response = await generateImage(authToken.value, request)
        const image = response.imageData || withServerBase(response.imageUrl)
        result.value = image
        resultResponseText.value = response.responseText || ''
        galleryEntries.value = [normalizeGalleryEntry(response.galleryEntry), ...galleryEntries.value]
    } catch (err) {
        error.value = err instanceof Error ? err.message : '生成失败'
        result.value = null
    } finally {
        isLoading.value = false
    }
}

const handleDownloadResult = async () => {
    const image = displayResult.value
    if (!image) return
    if (typeof window === 'undefined') return

    let downloadUrl = image
    let revokeUrl: string | null = null

    try {
        let target = image
        if (!image.startsWith('data:')) {
            target = withServerBase(image)
            const response = await fetch(target)
            const blob = await response.blob()
            downloadUrl = URL.createObjectURL(blob)
            revokeUrl = downloadUrl
        }

        const link = document.createElement('a')
        const dataMatch = image.match(/^data:image\/([a-zA-Z0-9+]+);/)
        const extension = dataMatch ? dataMatch[1] : 'png'

        link.href = downloadUrl
        link.download = `nano-banana-${Date.now()}.${extension}`
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        if (revokeUrl) {
            URL.revokeObjectURL(revokeUrl)
        }
    } catch (downloadError) {
        window.open(withServerBase(image), '_blank', 'noopener')
    }
}


const handleCreateTemplate = async (template: Omit<StyleTemplate, 'id'>) => {
    if (!authToken.value) return
    try {
        await createTemplate(authToken.value, template)
        await loadTemplates()
        showNotice('success', '模板已创建')
    } catch (error) {
        const message = error instanceof Error ? error.message : '新增模板失败'
        showNotice('error', message)
    }
}

const handleUpdateTemplate = async (template: StyleTemplate) => {
    if (!authToken.value || !template.id) return
    try {
        await updateTemplateRequest(authToken.value, template.id, template)
        await loadTemplates()
        showNotice('success', '模板已更新')
    } catch (error) {
        const message = error instanceof Error ? error.message : '更新模板失败'
        showNotice('error', message)
    }
}

const handleDeleteTemplate = async (id: string) => {
    if (!authToken.value) return
    try {
        await deleteTemplateRequest(authToken.value, id)
        await loadTemplates()
        showNotice('success', '模板已删除')
    } catch (error) {
        const message = error instanceof Error ? error.message : '删除模板失败'
        showNotice('error', message)
    }
}

const handleDeleteGalleryEntry = async (id: string) => {
    if (!authToken.value) return
    try {
        await deleteGalleryEntryRequest(authToken.value, id)
        galleryEntries.value = galleryEntries.value.filter(entry => entry.id !== id)
        if (selectedGalleryEntry.value?.id === id) {
            selectedGalleryEntry.value = null
        }
        showNotice('success', '已删除图库记录')
    } catch (error) {
        const message = error instanceof Error ? error.message : '删除图库记录失败'
        showNotice('error', message)
    }
}

const changeGalleryPage = (page: number) => {
    const max = totalGalleryPages.value
    const next = Math.min(Math.max(page, 1), max)
    galleryPage.value = next
}

const openGalleryDetail = (entry: GalleryEntry) => {
    selectedGalleryEntry.value = entry
}

const withServerBase = (path: string) => {
    if (!path) return path
    if (path.startsWith('http') || path.startsWith('data:')) return path
    return `${getApiBaseUrl().replace(/\/$/, '')}${path}`
}

const mutateApiConfig = async (task: () => Promise<void>, fallbackMessage: string, successMessage = 'API 配置已保存') => {
    if (!authToken.value) return
    isApiConfigMutating.value = true
    try {
        await task()
        showNotice('success', successMessage)
    } catch (error) {
        const message = error instanceof Error ? error.message : fallbackMessage
        showNotice('error', message)
    } finally {
        isApiConfigMutating.value = false
    }
}

const handleCreateApiConfig = async (config: ApiConfigFormPayload) => {
    await mutateApiConfig(
        async () => {
            if (!authToken.value) return
            const payload: CreateApiConfigPayload = {
                id: config.id,
                label: config.label,
                endpoint: config.endpoint,
                model: config.model,
                description: config.description || '',
                apiKey: config.apiKey || ''
            }
            await createApiConfigRequest(authToken.value, payload)
            await loadConfigs()
            selectedConfigId.value = payload.id
        },
        '无法新增 API 配置',
        'API 配置已新增'
    )
}

const handleUpdateApiConfig = async (config: ApiConfigFormPayload) => {
    await mutateApiConfig(
        async () => {
            if (!authToken.value) return
            const { id, ...rest } = config
            const payload: UpdateApiConfigPayload = {
                label: rest.label,
                endpoint: rest.endpoint,
                model: rest.model,
                description: rest.description || ''
            }
            if (rest.apiKey) {
                payload.apiKey = rest.apiKey
            }
            await updateApiConfigRequest(authToken.value, id, payload)
            await loadConfigs()
            selectedConfigId.value = id
        },
        '无法更新 API 配置',
        'API 配置已更新'
    )
}

const handleDeleteApiConfig = async (id: string) => {
    await mutateApiConfig(
        async () => {
            if (!authToken.value) return
            await deleteApiConfigRequest(authToken.value, id)
            await loadConfigs()
        },
        '无法删除 API 配置',
        'API 配置已删除'
    )
}

const handleSetDefaultApiConfig = async (id: string) => {
    await mutateApiConfig(
        async () => {
            if (!authToken.value) return
            const data = await setDefaultApiConfigRequest(authToken.value, id)
            defaultApiConfigId.value = data.defaultConfigId || id
            selectedConfigId.value = id
            LocalStorage.saveSelectedConfigId(id)
        },
        '无法设置默认 API 配置',
        '默认 API 配置已更新'
    )
}

const normalizeGalleryEntry = (entry: GalleryEntry) => ({
    ...entry,
    imagePath: withServerBase(entry.imagePath),
    thumbnailPath: entry.thumbnailPath ? withServerBase(entry.thumbnailPath) : withServerBase(entry.imagePath)
})

const normalizeGalleryEntries = (entries: GalleryEntry[]) => entries.map(normalizeGalleryEntry)

function applyTheme(value: 'light' | 'dark') {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.remove('theme-dark', 'theme-light')
    root.classList.add(value === 'dark' ? 'theme-dark' : 'theme-light')
}

watch(
    () => theme.value,
    newValue => {
        applyTheme(newValue)
    }
)
</script>
