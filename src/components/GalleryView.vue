<template>
    <div class="bg-white border-4 border-black rounded-lg p-4 shadow-lg min-h-[400px] flex flex-col">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
                <h3 class="text-xl font-black flex items-center gap-2">🖼️ 图库</h3>
                <p class="text-sm text-gray-600">第 {{ page }} / {{ pageCount }} 页，共 {{ total }} 条</p>
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

        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article
                v-for="item in entries"
                :key="item.id"
                class="border-2 border-black rounded-xl overflow-hidden bg-gray-50 flex flex-col"
            >
                <img :src="item.imagePath" :alt="item.prompt" class="w-full h-56 object-cover border-b-2 border-black" />
                <div class="p-3 flex flex-col gap-2 flex-1">
                    <div class="text-xs text-gray-500 flex items-center justify-between gap-2">
                        <span>🕒 {{ formatDate(item.createdAt) }}</span>
                        <span class="font-semibold text-gray-700">{{ item.configLabel }}</span>
                    </div>
                    <p class="text-sm font-bold text-gray-800 line-clamp-3">{{ item.prompt }}</p>
                    <p v-if="item.responseText" class="text-xs text-gray-600 bg-white border border-dashed border-gray-300 rounded-lg p-2 line-clamp-4">
                        {{ item.responseText }}
                    </p>
                    <div class="flex items-center justify-between text-xs text-gray-600 font-semibold mt-auto">
                        <span>{{ compactDate(item.createdAt) }}</span>
                        <div class="flex gap-2">
                            <button
                                class="px-3 py-1 border-2 border-black rounded-lg bg-white hover:bg-yellow-100 text-sm font-semibold"
                                type="button"
                                @click="$emit('show-detail', item)"
                            >
                                🔍 查看详情
                            </button>
                            <button
                                class="px-3 py-1 border-2 border-black rounded-lg bg-white hover:bg-red-100 text-sm font-semibold text-red-600"
                                type="button"
                                @click="$emit('delete-entry', item.id)"
                            >
                                🗑️ 删除
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        </div>

        <div v-if="pageCount > 1" class="mt-4 flex items-center justify-between text-sm font-semibold">
            <button
                class="px-3 py-1 border-2 border-black rounded-lg bg-white hover:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                type="button"
                :disabled="page <= 1"
                @click="$emit('change-page', page - 1)"
            >
                ⬅️ 上一页
            </button>
            <span>第 {{ page }} / {{ pageCount }} 页</span>
            <button
                class="px-3 py-1 border-2 border-black rounded-lg bg-white hover:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                type="button"
                :disabled="page >= pageCount"
                @click="$emit('change-page', page + 1)"
            >
                下一页 ➡️
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { GalleryEntry } from '../types'

defineProps<{
    entries: GalleryEntry[]
    total: number
    page: number
    pageCount: number
}>()

defineEmits<{
    refresh: []
    'change-page': [page: number]
    'delete-entry': [id: string]
    'show-detail': [entry: GalleryEntry]
}>()

const formatDate = (value: string) => {
    try {
        const date = new Date(value)
        return date.toLocaleString()
    } catch {
        return value
    }
}

const compactDate = (value: string) => {
    try {
        const date = new Date(value)
        return (
            date.toLocaleDateString() +
            ' ' +
            date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })
        )
    } catch {
        return value
    }
}
</script>
