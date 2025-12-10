<template>
    <div class="p-4 space-y-4">
        <!-- Image Size Selection -->
        <div>
            <label class="modern-label">
                📏 图像尺寸
            </label>
            <select
                :value="imageSize"
                @change="$emit('update:imageSize', ($event.target as HTMLInputElement).value)"
                class="modern-input"
            >
                <option value="1K">1K - 标准清晰度</option>
                <option value="2K">2K - 高清晰度</option>
                <option value="4K">4K - 超高清晰度</option>
            </select>
        </div>

  
        <!-- Google Search Toggle -->
        <div>
            <label class="flex items-center gap-3 cursor-pointer group">
                <input
                    type="checkbox"
                    :checked="enableGoogleSearch"
                    @change="$emit('update:enableGoogleSearch', ($event.target as HTMLInputElement).checked)"
                    class="w-4 h-4 text-dark-accent border-dark-border rounded focus:ring-dark-accent focus:ring-2 bg-dark-bg"
                />
                <span class="text-sm font-bold text-dark-text flex items-center gap-2 group-hover:text-dark-accent transition-colors">
                    🔍 启用谷歌搜索
                </span>
            </label>
            <p class="text-xs text-dark-muted mt-1 ml-7">
                允许模型使用谷歌搜索获取最新信息来生成图像
            </p>
        </div>

        <p class="text-xs text-dark-muted mt-2">
            💡 Gemini 3 Pro Image 专用配置，同时作用于「文生图」与「图文生图」功能
        </p>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    imageSize: string
    enableGoogleSearch: boolean
}>()

defineEmits<{
    'update:imageSize': [value: string]
    'update:enableGoogleSearch': [value: boolean]
}>()
</script>