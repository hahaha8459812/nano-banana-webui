<template>
    <BaseCard title="🔐 API 配置">
        <template #header>
            <div class="flex flex-wrap gap-2">
                <BaseButton @click="isCollapsed = !isCollapsed">
                    {{ isCollapsed ? '展开' : '收起' }}
                </BaseButton>
                <BaseButton
                    @click="$emit('fetch-models')"
                    :disabled="!selectedConfigId"
                    :loading="modelLoading"
                    variant="primary"
                >
                    {{ modelLoading ? '正在获取' : '📦 获取模型列表' }}
                </BaseButton>
                <BaseButton @click="openCreateForm" variant="primary">
                    ➕ 新增 API
                </BaseButton>
            </div>
        </template>

        <p class="text-sm text-dark-muted mb-4">选择后端已保存的 API 配置，前端无需再输入密钥</p>

        <transition name="fade">
            <div v-if="!isCollapsed" class="space-y-4">
                <div v-if="!configs.length" class="p-4 bg-dark-bg border border-dashed border-dark-border rounded-lg text-sm text-dark-muted">
                    暂未配置可用的 API，使用上方按钮创建一条配置。
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3" v-else>
                    <label
                        v-for="config in configs"
                        :key="config.id"
                        class="modern-box p-3 cursor-pointer border-2"
                        :class="selectedConfigId === config.id ? 'border-dark-accent bg-dark-surfaceHighlight' : 'border-transparent bg-dark-bg hover:bg-dark-surfaceHighlight'"
                    >
                        <div class="flex items-start gap-3">
                            <input
                                type="radio"
                                class="mt-1 accent-dark-accent shrink-0"
                                :value="config.id"
                                :checked="selectedConfigId === config.id"
                                @change="$emit('update:selectedConfigId', config.id)"
                            />
                            <div class="flex-1 min-w-0">
                                <div class="font-bold text-base flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <span class="text-dark-text truncate">{{ config.label }}</span>
                                        <span v-if="defaultConfigId === config.id" class="text-xs px-2 py-0.5 border border-dark-border rounded-full bg-dark-surface text-dark-muted shrink-0">默认</span>
                                    </div>
                                    <div class="flex gap-1 shrink-0">
                                        <button
                                            class="text-xs px-2 py-1 rounded bg-dark-surface hover:bg-dark-border text-dark-muted hover:text-dark-text transition-colors"
                                            type="button"
                                            @click.stop="openEditForm(config)"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            class="text-xs px-2 py-1 rounded bg-dark-surface hover:bg-dark-danger/20 text-dark-danger transition-colors"
                                            type="button"
                                            @click.stop="confirmDelete(config)"
                                        >
                                            🗑️
                                        </button>
                                        <button
                                            class="text-xs px-2 py-1 rounded bg-dark-surface hover:bg-dark-accent/20 text-dark-accent disabled:opacity-50 transition-colors"
                                            type="button"
                                            :disabled="defaultConfigId === config.id || managementLoading"
                                            @click.stop="$emit('set-default-api-config', config.id)"
                                        >
                                            ⭐
                                        </button>
                                    </div>
                                </div>
                                <p class="text-xs text-dark-muted break-all line-clamp-1">{{ config.endpoint }}</p>
                                <p class="text-xs text-dark-muted line-clamp-1">模型：{{ config.model }}</p>
                                <p v-if="config.description" class="text-xs text-dark-muted mt-1 line-clamp-2">{{ config.description }}</p>
                            </div>
                        </div>
                    </label>
                </div>

                <div class="space-y-2">
                    <label class="modern-label">工作模型</label>
                    <select
                        :value="selectedModelId"
                        :disabled="!modelOptions.length"
                        @change="$emit('update:selectedModelId', ($event.target as HTMLSelectElement).value)"
                        class="modern-input"
                    >
                        <option value="" disabled>请先获取模型列表</option>
                        <option v-for="model in modelOptions" :key="model.id" :value="model.id">
                            {{ model.supportsImages ? '🖼️ ' : '' }}{{ model.label }}
                        </option>
                    </select>
                    <p v-if="modelError" class="text-xs text-dark-danger">⚠️ {{ modelError }}</p>
                    <p v-else class="text-xs text-dark-muted ml-1">选择文本/图像模型后，所有请求将使用后端保存的密钥和默认项。</p>
                </div>

                <form
                    v-if="showEditor"
                    class="bg-dark-bg border border-dashed border-dark-border rounded-lg p-4 space-y-3"
                    @submit.prevent="handleSubmit"
                >
                    <div class="flex items-center justify-between gap-2">
                        <h4 class="font-bold text-dark-text">{{ editorMode === 'create' ? '新增 API 配置' : `编辑 ${form.label || form.id}` }}</h4>
                        <button type="button" class="text-sm text-dark-muted hover:text-dark-text" @click="closeEditor">✖️ 关闭</button>
                    </div>
                    <div class="grid md:grid-cols-2 gap-3">
                        <BaseInput
                            label="配置 ID"
                            v-model="form.id"
                            :disabled="editorMode === 'edit'"
                            required
                        />
                        <BaseInput
                            label="展示名称"
                            v-model="form.label"
                            required
                        />
                    </div>
                    <BaseInput
                        label="Endpoint"
                        v-model="form.endpoint"
                        required
                        placeholder="https://..."
                    />
                    <BaseInput
                        label="默认模型"
                        v-model="form.model"
                        required
                        placeholder="google/gemini-..."
                    />
                    <BaseInput
                        label="描述（可选）"
                        v-model="form.description"
                    />
                    <BaseInput
                        label="API Key"
                        v-model="form.apiKey"
                        :required="editorMode === 'create'"
                        placeholder="sk-xxxx"
                        :hint="editorMode === 'edit' ? '留空则沿用现有密钥' : ''"
                    />

                    <p v-if="formError" class="text-sm text-red-600 font-semibold">{{ formError }}</p>
                    <div class="flex items-center gap-2 justify-end">
                        <BaseButton type="button" @click="closeEditor" :disabled="managementLoading">
                            取消
                        </BaseButton>
                        <BaseButton
                            type="submit"
                            variant="primary"
                            :loading="managementLoading"
                        >
                            {{ managementLoading ? '保存中...' : '保存配置' }}
                        </BaseButton>
                    </div>
                </form>
            </div>
        </transition>
    </BaseCard>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import BaseButton from './BaseButton.vue'
import BaseCard from './BaseCard.vue'
import BaseInput from './BaseInput.vue'
import type { ApiConfigSummary, ModelOption } from '../types'

const props = defineProps<{
    configs: ApiConfigSummary[]
    defaultConfigId: string
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
    'set-default-api-config': [id: string]
}>()

const defaultConfigId = computed(() => props.defaultConfigId)
const isCollapsed = ref(true)
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
