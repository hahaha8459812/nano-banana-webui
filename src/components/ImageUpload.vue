<template>
    <div class="h-full flex flex-col gap-4">
        <!-- Upload Area -->
        <div
            ref="uploadArea"
            @click="fileInput?.click()"
            @dragenter.prevent="handleDragEnter"
            @dragover.prevent="handleDragOver"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
            :class="[
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 flex-1 flex flex-col justify-center group',
                isDragOver
                    ? 'border-dark-accent bg-dark-accent/10'
                    : 'border-dark-border bg-dark-bg hover:border-dark-accent/50 hover:bg-dark-surfaceHighlight'
            ]"
        >
            <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect" />

            <!-- Upload Icon -->
            <div class="mb-4">
                <div class="w-14 h-14 bg-dark-surface rounded-2xl mx-auto flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <svg class="w-7 h-7 text-dark-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                </div>
            </div>

            <h3 class="text-lg font-bold mb-2 flex items-center justify-center gap-2 text-dark-text">拖拽上传</h3>
            <p class="text-dark-muted mb-1">或点击浏览文件</p>
            <p class="text-xs text-dark-muted/70">支持多张图片 JPG, PNG, GIF 格式 (最大 5MB)</p>
        </div>

        <!-- Thumbnails -->
        <div v-if="thumbnails.length > 0" class="grid grid-cols-4 gap-3">
            <div v-for="(thumbnail, index) in thumbnails" :key="index" class="relative aspect-square bg-dark-bg rounded-lg overflow-hidden group border border-dark-border">
                <img :src="thumbnail" :alt="`Image ${index + 1}`" class="w-full h-full object-cover" />
                <button
                    @click="removeThumbnail(index)"
                    class="absolute top-1 right-1 w-6 h-6 bg-dark-danger text-white rounded-full flex items-center justify-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                >
                    ×
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
    modelValue: string[]
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string[]]
}>()

const fileInput = ref<HTMLInputElement>()
const uploadArea = ref<HTMLElement>()
const isDragOver = ref(false)

const thumbnails = computed(() => props.modelValue)

const handleFileSelect = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files) {
        handleFiles(Array.from(target.files))
        // 重置input的value，允许重新上传相同的文件
        target.value = ''
    }
}

const handleDragEnter = () => {
    isDragOver.value = true
}

const handleDragOver = () => {
    isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
    if (!uploadArea.value?.contains(event.relatedTarget as Node)) {
        isDragOver.value = false
    }
}

const handleDrop = (event: DragEvent) => {
    isDragOver.value = false
    if (event.dataTransfer?.files) {
        handleFiles(Array.from(event.dataTransfer.files))
    }
}

const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    imageFiles.forEach(file => {
        const reader = new FileReader()
        reader.onload = e => {
            if (e.target?.result) {
                const newImages = [...props.modelValue, e.target.result as string]
                emit('update:modelValue', newImages)
            }
        }
        reader.readAsDataURL(file)
    })
}

const removeThumbnail = (index: number) => {
    const newImages = props.modelValue.filter((_, i) => i !== index)
    emit('update:modelValue', newImages)
}
</script>
