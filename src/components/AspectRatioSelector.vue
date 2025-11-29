<template>
    <div class="bg-white border-4 border-black border-t-0 rounded-b-lg p-4 shadow-lg">
        <label class="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
            📐 图像宽高比
        </label>
        <select
            :value="modelValue"
            @change="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            class="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-medium"
        >
            <option v-for="option in aspectRatioOptions" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>
        <p class="text-xs text-gray-500 mt-2">
            💡 该设置同时作用于「文生图」与「图文生图」功能
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface AspectRatioOption {
    value: string
    label: string
    resolution: string
}

const props = defineProps<{
    modelValue: string
    modelType?: string
    imageSize?: string
}>()

defineEmits<{
    'update:modelValue': [value: string]
}>()

// Gemini 3 Pro Image 不同分辨率下的基础数据
const gemini3ProImageData = {
    '1K': {
        '1:1': { width: 1024, height: 1024 },
        '2:3': { width: 848, height: 1264 },
        '3:2': { width: 1264, height: 848 },
        '3:4': { width: 896, height: 1200 },
        '4:3': { width: 1200, height: 896 },
        '4:5': { width: 928, height: 1152 },
        '5:4': { width: 1152, height: 928 },
        '9:16': { width: 768, height: 1376 },
        '16:9': { width: 1376, height: 768 },
        '21:9': { width: 1584, height: 672 }
    },
    '2K': {
        '1:1': { width: 2048, height: 2048 },
        '2:3': { width: 1696, height: 2528 },
        '3:2': { width: 2528, height: 1696 },
        '3:4': { width: 1792, height: 2400 },
        '4:3': { width: 2400, height: 1792 },
        '4:5': { width: 1856, height: 2304 },
        '5:4': { width: 2304, height: 1856 },
        '9:16': { width: 1536, height: 2752 },
        '16:9': { width: 2752, height: 1536 },
        '21:9': { width: 3168, height: 1344 }
    },
    '4K': {
        '1:1': { width: 4096, height: 4096 },
        '2:3': { width: 3392, height: 5056 },
        '3:2': { width: 5056, height: 3392 },
        '3:4': { width: 3584, height: 4800 },
        '4:3': { width: 4800, height: 3584 },
        '4:5': { width: 3712, height: 4608 },
        '5:4': { width: 4608, height: 3712 },
        '9:16': { width: 3072, height: 5504 },
        '16:9': { width: 5504, height: 3072 },
        '21:9': { width: 6336, height: 2688 }
    }
}

// 通用宽高比选项（默认/其他模型）
const defaultAspectRatioOptions: AspectRatioOption[] = [
    { value: '1:1', label: '1:1 - 1024x1024', resolution: '1024x1024' },
    { value: '2:3', label: '2:3 - 832x1248', resolution: '832x1248' },
    { value: '3:2', label: '3:2 - 1248x832', resolution: '1248x832' },
    { value: '3:4', label: '3:4 - 864x1184', resolution: '864x1184' },
    { value: '4:3', label: '4:3 - 1184x864', resolution: '1184x864' },
    { value: '4:5', label: '4:5 - 896x1152', resolution: '896x1152' },
    { value: '5:4', label: '5:4 - 1152x896', resolution: '1152x896' },
    { value: '9:16', label: '9:16 - 768x1344', resolution: '768x1344' },
    { value: '16:9', label: '16:9 - 1344x768', resolution: '1344x768' },
    { value: '21:9', label: '21:9 - 1536x672', resolution: '1536x672' }
]

// 根据模型类型和图像尺寸生成动态宽高比选项
const aspectRatioOptions = computed(() => {
    if (props.modelType === 'gemini-3-pro-image' && props.imageSize && gemini3ProImageData[props.imageSize as keyof typeof gemini3ProImageData]) {
        const sizeData = gemini3ProImageData[props.imageSize as keyof typeof gemini3ProImageData]
        return Object.entries(sizeData).map(([ratio, dimensions]) => ({
            value: ratio,
            label: `${ratio} - ${dimensions.width}x${dimensions.height}`,
            resolution: `${dimensions.width}x${dimensions.height}`
        }))
    }
    return defaultAspectRatioOptions
})
</script>
