<template>
    <div class="bg-white border-4 border-black rounded-lg p-4 shadow-lg space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
                <h3 class="font-bold text-gray-900 text-lg">🔐 API 配置</h3>
                <p class="text-sm text-gray-600">选择后端已保存的 API 配置，前端无需再输入密钥</p>
            </div>
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
                <span v-if="modelLoading">🔄 正在获取</span>
                <span v-else>📡 获取模型列表</span>
            </button>
        </div>

        <div v-if="!configs.length" class="p-4 bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-lg text-sm text-yellow-700">
            尚未配置可用的 API，请联系管理员在服务器端 app.config.json 中补充。
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
                    <div>
                        <div class="font-bold text-base">{{ config.label }}</div>
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
                    {{ model.supportsImages ? '🖼 ' : '' }}{{ model.label }}
                </option>
            </select>
            <p v-if="modelError" class="text-xs text-red-500">⚠️ {{ modelError }}</p>
            <p v-else class="text-xs text-gray-600">选择文本/图像模型后，所有请求将使用后端保存的密钥静默发送。</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { ApiConfigSummary, ModelOption } from '../types'

defineProps<{
    configs: ApiConfigSummary[]
    selectedConfigId: string
    selectedModelId: string
    modelOptions: ModelOption[]
    modelLoading: boolean
    modelError: string | null
}>()

defineEmits<{
    'update:selectedConfigId': [value: string]
    'update:selectedModelId': [value: string]
    'fetch-models': []
}>()
</script>
