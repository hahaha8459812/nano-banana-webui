<template>
    <div class="min-h-screen bg-gradient-to-br from-yellow-200 via-yellow-300 to-orange-200 text-gray-900 relative overflow-hidden">
        <div class="absolute top-10 left-10 text-6xl opacity-20 animate-bounce">🍌</div>
        <div class="absolute top-32 right-20 text-4xl opacity-30 animate-pulse">🍌</div>
        <div class="absolute bottom-20 left-32 text-5xl opacity-25 animate-bounce delay-1000">🍌</div>
        <div class="absolute bottom-40 right-10 text-3xl opacity-20 animate-pulse delay-500">🍌</div>

        <div class="container mx-auto px-3 py-4 relative z-10">
            <div class="relative mb-6">
                <div class="bg-gradient-to-r from-orange-400 to-yellow-500 rounded-lg p-6 border-4 border-black shadow-lg">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div class="text-center md:text-left">
                            <h1 class="text-4xl font-black text-white mb-1 flex items-center gap-2 justify-center md:justify-start">
                                🍌 Nano <span class="text-yellow-100 text-5xl">Banana</span>
                            </h1>
                            <p class="text-white text-base font-medium">上传灵感，服务器帮你静默调用 OpenRouter/Gemini</p>
                        </div>
                        <div v-if="isAuthenticated" class="flex flex-wrap gap-2 justify-center md:justify-end">
                            <button
                                @click="viewMode = 'workspace'"
                                :class="viewMode === 'workspace' ? activeTabClass : inactiveTabClass"
                            >
                                🎨 工作区
                            </button>
                            <button
                                @click="viewMode = 'gallery'"
                                :class="viewMode === 'gallery' ? activeTabClass : inactiveTabClass"
                            >
                                🖼 图库
                            </button>
                            <button @click="handleLogout" class="px-4 py-2 rounded-lg border-2 border-black bg-black text-white font-semibold hover:bg-gray-900">
                                退出登录
                            </button>
                        </div>
                    </div>
                </div>
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

            <div v-if="!isAuthenticated" class="max-w-md mx-auto bg-white border-4 border-black rounded-2xl p-6 shadow-xl">
                <h2 class="text-2xl font-black text-center mb-4">🔐 输入工作密码</h2>
                <form class="space-y-4" @submit.prevent="handleLogin">
                    <div class="space-y-2">
                        <label class="font-bold flex items-center gap-2 text-base">
                            <span>🌐 后端 API 地址</span>
                        </label>
                        <div class="flex flex-col gap-2">
                            <input
                                type="text"
                                v-model="serverBaseUrl"
                                @input="clearBaseUrlMessage"
                                placeholder="https://example.com:51130"
                                class="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <div class="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    @click="handleSaveServerBaseUrl"
                                    class="flex-1 px-4 py-2 border-2 border-black rounded-lg bg-yellow-300 hover:bg-yellow-400 font-semibold"
                                >
                                    保存地址
                                </button>
                                <button
                                    type="button"
                                    @click="resetServerBaseUrl"
                                    class="flex-1 px-4 py-2 border-2 border-black rounded-lg bg-white hover:bg-gray-100 font-semibold"
                                >
                                    恢复默认
                                </button>
                            </div>
                        </div>
                        <p v-if="baseUrlError" class="text-sm text-red-500 flex items-center gap-1">⚠️ {{ baseUrlError }}</p>
                        <p v-else-if="baseUrlHint" class="text-sm text-green-600 flex items-center gap-1">✅ {{ baseUrlHint }}</p>
                    </div>
                    <input
                        type="password"
                        v-model="password"
                        placeholder="请输入部署者设置的密码"
                        class="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <p v-if="authError" class="text-sm text-red-500">⚠️ {{ authError }}</p>
                    <button
                        type="submit"
                        :disabled="!password.trim() || isAuthenticating"
                        class="w-full px-4 py-3 font-bold text-white rounded-lg border-2 border-black bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:text-gray-600"
                    >
                        {{ isAuthenticating ? '正在验证...' : '进入工作区' }}
                    </button>
                </form>
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

                <div v-if="viewMode === 'workspace'" class="grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:items-start">
                    <div class="flex flex-col h-full gap-4">
                        <div class="flex flex-col h-full">
                            <div class="bg-gradient-to-r from-blue-400 to-purple-500 text-white font-bold px-4 py-2 rounded-t-lg border-4 border-black border-b-0 flex items-center gap-2">
                                📝 文生图 · 灵感工作台
                            </div>
                            <div class="bg-white border-4 border-black border-t-0 rounded-b-lg p-5 shadow-lg flex flex-col h-full gap-4">
                                <div class="flex flex-col gap-3 flex-1">
                                    <label class="font-bold flex items-center gap-2 text-base">🍌 描述你的创意：</label>
                                    <textarea
                                        v-model="textToImagePrompt"
                                        placeholder="如：暮色中的赛博都市，霓虹光影交错..."
                                        class="w-full px-4 py-3 border-2 border-black rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[160px] flex-1"
                                    />
                                </div>
                                <p class="text-sm text-gray-600 font-medium flex items-center gap-2">
                                    <span>💡</span>
                                    <span>输入提示词后即可单击按钮生成，结果会自动保存到图库。</span>
                                </p>
                            </div>
                        </div>

                        <div v-if="showAspectRatioSelector" class="flex flex-col">
                            <div class="bg-gradient-to-r from-purple-400 to-pink-500 text-white font-bold px-4 py-2 rounded-t-lg border-4 border-black border-b-0 flex items-center gap-2">
                                🧮 图像宽高比
                            </div>
                            <AspectRatioSelector v-model="selectedAspectRatio" :model-type="showGemini3ProConfig ? 'gemini-3-pro-image' : 'default'" :image-size="gemini3ImageSize" />
                        </div>

                        <div v-if="showGemini3ProConfig" class="flex flex-col">
                            <div class="bg-gradient-to-r from-indigo-400 to-purple-500 text-white font-bold px-4 py-2 rounded-t-lg border-4 border-black border-b-0 flex items-center gap-2">
                                🧠 Gemini 3 Pro Image 参数
                            </div>
                            <Gemini3ProConfig v-model:imageSize="gemini3ImageSize" v-model:enableGoogleSearch="gemini3EnableGoogleSearch" />
                        </div>
                    </div>

                    <div class="flex flex-col gap-4 h-full">
                        <div class="flex flex-col h-full">
                            <div class="bg-pink-400 text-white font-bold px-4 py-2 rounded-t-lg border-4 border-black border-b-0 flex items-center gap-2">
                                🖼 图文生图 · 上传参考
                            </div>
                            <div class="flex-1">
                                <ImageUpload v-model="selectedImages" />
                            </div>
                        </div>

                        <div class="flex flex-col h-full">
                            <div class="bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold px-4 py-2 rounded-t-lg border-4 border-black border-b-0 flex items-center gap-2">
                                🎨 选择风格或自定义提示词
                            </div>
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
                        </div>
                    </div>
                </div>

                <div v-if="viewMode === 'workspace'" class="mb-6">
                    <div class="flex flex-col gap-4 lg:flex-row lg:gap-6">
                        <button
                            @click="handleTextToImageGenerate"
                            :disabled="!canGenerateTextImage"
                            :class="generateButtonClass(canGenerateTextImage)"
                        >
                            <span v-if="!isTextToImageLoading" class="flex items-center gap-2 text-xl">🍌 纯提示词生成</span>
                            <span v-else class="flex items-center gap-2 text-xl">🍌 正在施法...</span>
                            <div v-if="isTextToImageLoading" class="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        </button>
                        <button
                            @click="handleGenerate"
                            :disabled="!canGenerate"
                            :class="generateImageButtonClass(canGenerate)"
                        >
                            <span v-if="!isLoading" class="flex items-center gap-2 text-xl">🍌 图文混合生成</span>
                            <span v-else class="flex items-center gap-2 text-xl">🍌 正在施法...</span>
                            <div v-if="isLoading" class="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        </button>
                    </div>
                </div>

                <div v-if="viewMode === 'workspace'" class="w-full">
                    <div class="bg-black text-white font-bold px-4 py-2 rounded-t-lg border-4 border-black border-b-0 flex items-center gap-2">✅ 最新结果</div>
                    <ResultDisplay
                        :result="displayResult"
                        :response-text="displayResponseText"
                        :loading="displayLoading"
                        :error="displayError"
                        :can-push="canPushDisplayResult"
                        @download="handleDownloadResult"
                        @push="handlePushDisplayResult"
                    />
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
                    <GalleryDetailModal :visible="Boolean(selectedGalleryEntry)" :entry="selectedGalleryEntry" @close="selectedGalleryEntry = null" />
                </div>

                <Footer />
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ApiConfigSelector from './components/ApiConfigSelector.vue'
import ImageUpload from './components/ImageUpload.vue'
import StylePromptSelector from './components/StylePromptSelector.vue'
import ResultDisplay from './components/ResultDisplay.vue'
import Footer from './components/Footer.vue'
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
type ApiConfigFormPayload = CreateApiConfigPayload & { apiKey?: string }

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

const canPushDisplayResult = computed(() => Boolean(displayResult.value))

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

const handlePushDisplayResult = () => {
    if (!displayResult.value) return
    pushImageToUpload(displayResult.value)
}

const pushImageToUpload = (image: string) => {
    if (!image) return
    const filtered = selectedImages.value.filter(existing => existing !== image)
    selectedImages.value = [image, ...filtered]
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

const generateButtonClass = (enabled: boolean) =>
    [
        'flex-1 px-6 py-4 rounded-lg font-bold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 border-4 border-black shadow-lg',
        enabled
            ? 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 hover:-translate-y-1 hover:shadow-xl'
            : 'bg-gray-400 cursor-not-allowed'
    ].join(' ')

const generateImageButtonClass = (enabled: boolean) =>
    [
        'flex-1 px-6 py-4 rounded-lg font-bold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 border-4 border-black shadow-lg',
        enabled
            ? 'bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-600 hover:-translate-y-1 hover:shadow-xl'
            : 'bg-gray-400 cursor-not-allowed'
    ].join(' ')

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
    imagePath: withServerBase(entry.imagePath)
})

const normalizeGalleryEntries = (entries: GalleryEntry[]) => entries.map(normalizeGalleryEntry)
</script>
