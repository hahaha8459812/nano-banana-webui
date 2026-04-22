<template>
    <div class="p-4 space-y-4">
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

        <div>
            <label class="modern-label">
                ✨ 图像质量
            </label>
            <select
                :value="quality"
                @change="$emit('update:quality', ($event.target as HTMLInputElement).value)"
                class="modern-input"
            >
                <option value="auto">auto - 自动</option>
                <option value="low">low - 快速草稿</option>
                <option value="medium">medium - 均衡</option>
                <option value="high">high - 高质量</option>
            </select>
        </div>

        <div>
            <label class="modern-label">
                🧾 输出格式
            </label>
            <select
                :value="outputFormat"
                @change="$emit('update:outputFormat', ($event.target as HTMLInputElement).value)"
                class="modern-input"
            >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
            </select>
        </div>

        <div>
            <label class="flex items-center gap-3 cursor-not-allowed opacity-60">
                <input type="checkbox" disabled class="w-4 h-4 text-dark-accent border-dark-border rounded focus:ring-dark-accent focus:ring-2 bg-dark-bg" />
                <span class="text-sm font-bold text-dark-text flex items-center gap-2">
                    透明背景（暂不可用）
                </span>
            </label>
            <p class="text-xs text-dark-muted mt-1 ml-7">
                当前 gpt-image 模型暂不支持透明背景，先保留统一交互入口。
            </p>
        </div>

        <p class="text-xs text-dark-muted mt-2">
            💡 图像模型扩展配置，同时作用于“文生图”与“图文生图”功能
        </p>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    imageSize: string
    quality: string
    outputFormat: string
}>()

defineEmits<{
    'update:imageSize': [value: string]
    'update:quality': [value: string]
    'update:outputFormat': [value: string]
}>()
</script>
