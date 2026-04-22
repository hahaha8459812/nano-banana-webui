<template>
    <div class="p-4 space-y-4">
        <div>
            <label class="modern-label">📐 输出尺寸</label>
            <select
                :value="size"
                class="modern-input"
                @change="$emit('update:size', ($event.target as HTMLSelectElement).value)"
            >
                <option value="auto">auto - 自动选择</option>
                <option value="1024x1024">1:1 - 1024x1024</option>
                <option value="1536x1024">3:2 - 1536x1024</option>
                <option value="1024x1536">2:3 - 1024x1536</option>
                <option value="2048x2048">1:1 - 2048x2048</option>
                <option value="2048x1152">16:9 - 2048x1152</option>
                <option value="3840x2160">16:9 - 3840x2160</option>
                <option value="2160x3840">9:16 - 2160x3840</option>
                <option value="custom">自定义像素</option>
            </select>
            <p class="text-xs text-dark-muted mt-2 ml-1">
                gpt-image 模型使用 OpenAI Images API 的 size 参数，预设值均符合官方尺寸约束。
            </p>
        </div>

        <div v-if="size === 'custom'" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label class="modern-label">宽度 px</label>
                <input
                    :value="customWidth"
                    type="number"
                    min="16"
                    max="3840"
                    step="16"
                    class="modern-input"
                    placeholder="例如 1536"
                    @input="$emit('update:customWidth', ($event.target as HTMLInputElement).value)"
                />
            </div>
            <div>
                <label class="modern-label">高度 px</label>
                <input
                    :value="customHeight"
                    type="number"
                    min="16"
                    max="3840"
                    step="16"
                    class="modern-input"
                    placeholder="例如 1024"
                    @input="$emit('update:customHeight', ($event.target as HTMLInputElement).value)"
                />
            </div>
            <p class="sm:col-span-2 text-xs" :class="customSizeError ? 'text-dark-danger' : 'text-dark-muted'">
                {{ customSizeError || '自定义尺寸需为 16 的倍数，最大边不超过 3840，比例不超过 3:1。' }}
            </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label class="modern-label">✨ 质量</label>
                <select
                    :value="quality"
                    class="modern-input"
                    @change="$emit('update:quality', ($event.target as HTMLSelectElement).value)"
                >
                    <option value="auto">auto - 自动</option>
                    <option value="low">low - 快速草稿</option>
                    <option value="medium">medium - 均衡</option>
                    <option value="high">high - 高质量</option>
                </select>
            </div>

            <div>
                <label class="modern-label">🧾 输出格式</label>
                <select
                    :value="outputFormat"
                    class="modern-input"
                    @change="$emit('update:outputFormat', ($event.target as HTMLSelectElement).value)"
                >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                    <option value="webp">WebP</option>
                </select>
            </div>
        </div>

        <label class="flex items-center gap-3 cursor-not-allowed opacity-60">
            <input type="checkbox" disabled class="w-4 h-4 border-dark-border rounded bg-dark-bg" />
            <span class="text-sm font-bold text-dark-muted">透明背景（当前 gpt-image 暂不可用）</span>
        </label>

        <p class="text-xs text-dark-muted mt-2">
            💡 透明背景仅作为占位选项展示，后端不会向 OpenAI 发送 transparent background。
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
    size: string
    customWidth: string
    customHeight: string
    quality: string
    outputFormat: string
}>()

defineEmits<{
    'update:size': [value: string]
    'update:customWidth': [value: string]
    'update:customHeight': [value: string]
    'update:quality': [value: string]
    'update:outputFormat': [value: string]
}>()

const MIN_OPENAI_IMAGE_PIXELS = 655_360
const MAX_OPENAI_IMAGE_PIXELS = 8_294_400
const MAX_OPENAI_IMAGE_EDGE = 3840
const MAX_OPENAI_IMAGE_RATIO = 3

const customSizeError = computed(() => {
    if (props.size !== 'custom') return ''

    const width = Number(props.customWidth)
    const height = Number(props.customHeight)
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
        return '请输入有效的宽度和高度。'
    }
    if (width % 16 !== 0 || height % 16 !== 0) {
        return '宽度和高度都必须是 16 的倍数。'
    }
    if (Math.max(width, height) > MAX_OPENAI_IMAGE_EDGE) {
        return '最大边不能超过 3840px。'
    }
    if (Math.max(width, height) / Math.min(width, height) > MAX_OPENAI_IMAGE_RATIO) {
        return '长边与短边比例不能超过 3:1。'
    }

    const pixels = width * height
    if (pixels < MIN_OPENAI_IMAGE_PIXELS || pixels > MAX_OPENAI_IMAGE_PIXELS) {
        return '总像素数必须在 655360 到 8294400 之间。'
    }

    return ''
})
</script>
