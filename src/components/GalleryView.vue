<template>
    <div class="bg-white border-4 border-black rounded-lg p-4 shadow-lg min-h-[400px] flex flex-col">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
                <h3 class="text-xl font-black flex items-center gap-2">🖼 图库</h3>
                <p class="text-sm text-gray-600">所有生成的图片与文本回复都会自动存档</p>
            </div>
            <button
                @click="$emit('refresh')"
                class="px-4 py-2 bg-yellow-300 border-2 border-black rounded-lg font-semibold hover:bg-yellow-400 transition"
            >
                🔄 刷新
            </button>
        </div>

        <div v-if="!entries.length" class="flex-1 flex flex-col items-center justify-center text-center gap-2 text-gray-600">
            <div class="text-5xl">🍌</div>
            <p class="font-bold">还没有作品，快去工作区创作吧！</p>
        </div>

        <div v-else class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <article
                v-for="item in entries"
                :key="item.id"
                class="border-2 border-black rounded-xl overflow-hidden bg-gray-50 flex flex-col"
            >
                <img :src="item.imagePath" :alt="item.prompt" class="w-full h-56 object-cover border-b-2 border-black" />
                <div class="p-3 flex flex-col gap-2 flex-1">
                    <div class="text-xs text-gray-500 flex items-center justify-between gap-2">
                        <span>{{ formatDate(item.createdAt) }}</span>
                        <span class="font-semibold text-gray-700">{{ item.configLabel }}</span>
                    </div>
                    <p class="text-sm font-bold text-gray-800 line-clamp-3">{{ item.prompt }}</p>
                    <p v-if="item.responseText" class="text-xs text-gray-600 bg-white border border-dashed border-gray-300 rounded-lg p-2 line-clamp-4">
                        {{ item.responseText }}
                    </p>
                    <div class="flex items-center gap-2 mt-auto">
                        <a
                            :href="item.imagePath"
                            download
                            class="flex-1 px-3 py-2 bg-yellow-300 text-black text-sm font-semibold border-2 border-black rounded-lg text-center hover:bg-yellow-400 transition"
                        >
                            ⬇️ 下载
                        </a>
                        <button
                            class="px-3 py-2 text-sm border-2 border-black rounded-lg bg-white hover:bg-red-100 text-red-600 font-semibold"
                            type="button"
                            @click="$emit('delete-entry', item.id)"
                        >
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            </article>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { GalleryEntry } from '../types'

defineProps<{
    entries: GalleryEntry[]
}>()

defineEmits<{
    refresh: []
    'delete-entry': [id: string]
}>()

const formatDate = (value: string) => {
    try {
        const date = new Date(value)
        return date.toLocaleString()
    } catch {
        return value
    }
}
</script>
