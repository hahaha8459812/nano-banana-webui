<template>
    <div class="bg-white border-4 border-black rounded-lg p-4 shadow-lg space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
                <h3 class="font-bold text-gray-900 text-lg">🔐 API 配置</h3>
                <p class="text-sm text-gray-600">选择后端已保存的 API 配置，前端无需再输入密钥</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <button
                    @click="$emit('fetch-models')"
                    :disabled="!selectedConfigId || modelLoading"
                    :class="[
                        'px-4 py-2 rounded-lg border-2 border-black font-semibold text-sm flex items-center gap-2 transition-colors',
                        modelLoading
                            ? 'bg-gray-200 text-gray-500 cursor-wait'
                            : selectedConfigId
                              ? 'bg-purple-500 text-white hover:bg-purple-600'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    ]"
                >
                    <span v-if="modelLoading">⏳ 正在获取</span>
                    <span v-else>📦 获取模型列表</span>
                </button>
                <button
                    type="button"
                    class="px-4 py-2 rounded-lg border-2 border-black font-semibold text-sm bg-green-300 hover:bg-green-400 transition"
                    @click="openCreateForm"
                >
                    ➕ 新增 API
                </button>
            </div>
        </div>

        <div v-if="!configs.length" class="p-4 bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-lg text-sm text-yellow-700">
            暂未配置可用的 API，使用上方按钮创建一条配置。
        </div>

        <div class="grid md:grid-cols-2 gap-3" v-else>
            <label
                v-for="config in configs"
                :key="config.id"
                class="border-2 border-black rounded-lg p-3 cursor-pointer transition-all hover:-translate-y-1"
                :class="selectedConfigId === config.id ? 'bg-yellow-200 shadow-lg' : 'bg-gray-50'"
            >
                <div class="flex items-start gap-3">
                    <input
                        type="radio"
                        class="mt-1"
                        :value="config.id"
                        :checked="selectedConfigId === config.id"
                        @change="$emit('update:selectedConfigId', config.id)"
                    />
                    <div class="flex-1">
                        <div class="font-bold text-base flex items-center justify-between gap-2">
                            <span>{{ config.label }}</span>
                            <div class="flex gap-1">
                                <button
                                    class="text-xs px-2 py-1 border border-black rounded bg-white hover:bg-gray-100"
                                    type="button"
                                    @click.stop="openEditForm(config)"
                                >
                                    ✏️ 编辑
                                </button>
                                <button
                                    class="text-xs px-2 py-1 border border-black rounded bg-white hover:bg-gray-100 text-red-600"
                                    type="button"
                                    @click.stop="confirmDelete(config)"
                                >
                                    🗑️ 删除
                                </button>
                            </div>
                        </div>
                        <p class="text-xs text-gray-600 break-all">{{ config.endpoint }}</p>
                        <p class="text-xs text-gray-600">模型：{{ config.model }}</p>
                        <p v-if="config.description" class="text-xs text-gray-500 mt-1">{{ config.description }}</p>
                    </div>
                </div>
            </label>
        </div>

        <div class="space-y-2">
            <label class="block text-xs font-semibold text-gray-600">工作模型</label>
            <select
                :value="selectedModelId"
                :disabled="!modelOptions.length"
                @change="$emit('update:selectedModelId', ($event.target as HTMLSelectElement).value)"
                class="w-full px-3 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm disabled:bg-gray-100 disabled:text-gray-500"
            >
                <option value="" disabled>请先获取模型列表</option>
                <option v-for="model in modelOptions" :key="model.id" :value="model.id">
                    {{ model.supportsImages ? '🖼️ ' : '' }}{{ model.label }}
                </option>
            </select>
            <p v-if="modelError" class="text-xs text-red-500">⚠️ {{ modelError }}</p>
            <p v-else class="text-xs text-gray-600">选择文本/图像模型后，所有请求将使用后端保存的密钥和默认项。</p>
        </div>

        <form
            v-if="showEditor"
            class="bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg p-4 space-y-3"
            @submit.prevent="handleSubmit"
        >
            <div class="flex items-center justify-between gap-2">
                <h4 class="font-bold text-gray-700">{{ editorMode === 'create' ? '新增 API 配置' : `编辑 ${form.label || form.id}` }}</h4>
                <button type="button" class="text-sm text-gray-500 hover:text-gray-800" @click="closeEditor">✖️ 关闭</button>
            </div>
            <div class="grid md:grid-cols-2 gap-3">
                <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                    配置 ID
                    <input v-model="form.id" :disabled="editorMode === 'edit'" required class="px-3 py-2 border-2 border-black rounded-lg bg-white disabled:bg-gray-200" />
                </label>
                <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                    展示名称
                    <input v-model="form.label" required class="px-3 py-2 border-2 border-black rounded-lg" />
                </label>
            </div>
            <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                Endpoint
                <input v-model="form.endpoint" required class="px-3 py-2 border-2 border-black rounded-lg" placeholder="https://..." />
            </label>
            <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                默认模型
                <input v-model="form.model" required class="px-3 py-2 border-2 border-black rounded-lg" placeholder="google/gemini-..." />
            </label>
            <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                描述（可选）
                <input v-model="form.description" class="px-3 py-2 border-2 border-black rounded-lg" />
            </label>
            <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                API Key
                <input
                    v-model="form.apiKey"
                    :required="editorMode === 'create'"
                    class="px-3 py-2 border-2 border-black rounded-lg"
                    placeholder="sk-xxxx"
                />
                <span class="text-xs text-gray-500" v-if="editorMode === 'edit'">留空则沿用现有密钥</span>
            </label>
            <p v-if="formError" class="text-sm text-red-600 font-semibold">{{ formError }}</p>
            <div class="flex items-center gap-2 justify-end">
                <button type="button" class="px-4 py-2 border-2 border-black rounded-lg bg-white hover:bg-gray-200" @click="closeEditor" :disabled="managementLoading">
                    取消
                </button>
                <button
                    type="submit"
                    class="px-4 py-2 border-2 border-black rounded-lg bg-orange-400 hover:bg-orange-500 text-white font-semibold"
                    :disabled="managementLoading"
                >
                    {{ managementLoading ? '保存中...' : '保存配置' }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { ApiConfigSummary, ModelOption } from '../types'

const props = defineProps<{
    configs: ApiConfigSummary[]
    selectedConfigId: string
    selectedModelId: string
    modelOptions: ModelOption[]
    modelLoading: boolean
    modelError: string | null
    managementLoading: boolean
}>()

const emit = defineEmits<{
    'update:selectedConfigId': [value: string]
    'update:selectedModelId': [value: string]
    'fetch-models': []
    'create-api-config': [
        {
            id: string
            label: string
            endpoint: string
            model: string
            description?: string
            apiKey: string
        }
    ]
    'update-api-config': [
        {
            id: string
            label: string
            endpoint: string
            model: string
            description?: string
            apiKey?: string
        }
    ]
    'delete-api-config': [id: string]
}>()

const showEditor = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const form = reactive({
    id: '',
    label: '',
    endpoint: '',
    model: '',
    description: '',
    apiKey: ''
})
const formError = ref('')

const resetForm = () => {
    form.id = ''
    form.label = ''
    form.endpoint = ''
    form.model = ''
    form.description = ''
    form.apiKey = ''
    formError.value = ''
}

const openCreateForm = () => {
    editorMode.value = 'create'
    resetForm()
    showEditor.value = true
}

const openEditForm = (config: ApiConfigSummary) => {
    editorMode.value = 'edit'
    form.id = config.id
    form.label = config.label
    form.endpoint = config.endpoint
    form.model = config.model
    form.description = config.description || ''
    form.apiKey = ''
    showEditor.value = true
}

const confirmDelete = (config: ApiConfigSummary) => {
    if (props.managementLoading) return
    if (window.confirm(`确定删除 ${config.label} 吗？`)) {
        emit('delete-api-config', config.id)
    }
}

const closeEditor = () => {
    showEditor.value = false
    resetForm()
}

const handleSubmit = () => {
    formError.value = ''
    if (!form.id.trim()) {
        formError.value = '配置 ID 不能为空'
        return
    }
    if (!form.label.trim()) {
        formError.value = '展示名称不能为空'
        return
    }
    if (!form.endpoint.trim()) {
        formError.value = 'Endpoint 不能为空'
        return
    }
    if (!form.model.trim()) {
        formError.value = '默认模型不能为空'
        return
    }
    if (editorMode.value === 'create' && !form.apiKey.trim()) {
        formError.value = 'API Key 不能为空'
        return
    }
    const payload = {
        id: form.id.trim(),
        label: form.label.trim(),
        endpoint: form.endpoint.trim(),
        model: form.model.trim(),
        description: form.description.trim(),
        apiKey: form.apiKey.trim()
    }
    if (editorMode.value === 'create') {
        emit('create-api-config', payload)
    } else {
        emit('update-api-config', payload)
    }
    if (!props.managementLoading) {
        closeEditor()
    }
}
</script>
