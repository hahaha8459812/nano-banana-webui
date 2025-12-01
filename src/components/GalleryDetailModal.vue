<template>
    <transition name="fade">
        <div v-if="visible && entry" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div class="bg-white border-4 border-black rounded-2xl max-w-5xl w-full max-h-full overflow-y-auto shadow-2xl">
                <div class="flex items-center justify-between border-b-2 border-black px-6 py-4">
                    <h3 class="text-xl font-black flex items-center gap-2">📝 作品详情</h3>
                    <button class="px-3 py-1 border-2 border-black rounded-lg bg-white hover:bg-gray-100" @click="$emit('close')">✖️ 关闭</button>
                </div>
                <div class="p-6 space-y-6">
                    <div class="w-full">
                        <img :src="entry.imagePath" :alt="entry.prompt" class="w-full h-auto rounded-lg border-2 border-black" />
                    </div>
                    <div class="grid md:grid-cols-2 gap-4 text-sm">
                        <div class="space-y-2">
                            <p class="font-semibold text-gray-700">🕒 生图时间：<span class="font-bold">{{ formatDate(entry.createdAt) }}</span></p>
                            <p class="font-semibold text-gray-700">🔑 使用 API：<span class="font-bold">{{ entry.configLabel }}</span></p>
                            <p class="font-semibold text-gray-700">🧠 使用模型：<span class="font-bold">{{ entry.modelId || '未记录' }}</span></p>
                        </div>
                        <div class="space-y-2">
                            <p class="font-semibold text-gray-700">📐 画幅比：<span class="font-bold">{{ entry.aspectRatio || '未记录' }}</span></p>
                            <p class="font-semibold text-gray-700">🖼️ 分辨率：<span class="font-bold">{{ entry.imageSize || '未记录' }}</span></p>
                            <button
                                class="w-full px-4 py-2 border-2 border-black rounded-lg bg-yellow-300 hover:bg-yellow-400 font-semibold"
                                @click="download(entry.imagePath)"
                            >
                                ⬇️ 下载原图
                            </button>
                        </div>
                    </div>
                    <div>
                        <h4 class="font-bold mb-2">🎯 提示词</h4>
                        <p class="bg-gray-100 border border-dashed border-gray-300 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line">{{ entry.prompt }}</p>
                    </div>
                    <div v-if="entry.responseText">
                        <h4 class="font-bold mb-2">🤖 模型返回</h4>
                        <p class="bg-gray-100 border border-dashed border-gray-300 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line">{{ entry.responseText }}</p>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import type { GalleryEntry } from '../types'

const props = defineProps<{
    visible: boolean
    entry: GalleryEntry | null
}>()

defineEmits<{
    close: []
}>()

const formatDate = (value: string) => {
    try {
        const date = new Date(value)
        return date.toLocaleString()
    } catch {
        return value
    }
}

const download = async (path: string) => {
    if (!path) return
    const link = document.createElement('a')
    link.href = path
    link.download = `gallery-${Date.now()}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
</script>
