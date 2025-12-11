<template>
    <BaseCard class="min-h-[400px] flex flex-col">
        <template #header>
            <div class="flex items-center justify-between w-full">
                <div>
                    <h3 class="text-xl font-black flex items-center gap-2">🖼️ 图库</h3>
                    <p class="text-sm text-skin-muted">第 {{ page }} / {{ pageCount }} 页，共 {{ total }} 条</p>
                </div>
                <BaseButton @click="$emit('refresh')" icon="🔄" variant="primary">
                    刷新
                </BaseButton>
            </div>
        </template>

        <div v-if="!entries.length" class="flex-1 flex flex-col items-center justify-center text-center gap-2 text-dark-muted py-10">
            <div class="text-5xl opacity-50">🍌</div>
            <p class="font-bold">还没有作品，快去工作区创作吧！</p>
        </div>

        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <article
                v-for="item in entries"
                :key="item.id"
                class="modern-box overflow-hidden flex flex-col modern-box-hover group"
            >
                <div class="relative overflow-hidden cursor-pointer" @click="$emit('show-detail', item)">
                    <img
                        :src="item.thumbnailPath || item.imagePath"
                        :alt="item.prompt"
                        class="w-full h-48 sm:h-56 object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        @error="(e: Event) => handleImageError(e, item)"
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-dark-surface to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
                </div>
                <div class="p-3 sm:p-4 flex flex-col gap-2 flex-1">
                    <div class="text-xs text-dark-muted flex items-center justify-between gap-2">
                        <span>🕒 {{ formatDate(item.createdAt) }}</span>
                        <span class="font-semibold text-dark-text bg-dark-bg px-2 py-0.5 rounded-full text-[10px] truncate max-w-[100px]">{{ item.configLabel }}</span>
                    </div>
                    <p
                        class="text-sm font-bold text-dark-text line-clamp-2 group-hover:text-dark-accent transition-colors cursor-pointer"
                        @click="$emit('show-detail', item)"
                    >{{ item.prompt }}</p>
                    <p v-if="item.responseText" class="text-xs text-dark-muted bg-dark-bg border border-dark-border/50 rounded-lg p-2 line-clamp-3 hidden sm:block">
                        {{ item.responseText }}
                    </p>
                    <div class="flex items-center justify-between text-xs text-dark-muted font-semibold mt-auto pt-3 border-t border-dark-border/30">
                        <span>{{ compactDate(item.createdAt) }}</span>
                        <div class="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                            <button
                                class="px-2 py-1 hover:text-dark-text hover:bg-dark-bg rounded transition-colors"
                                type="button"
                                @click.stop="$emit('show-detail', item)"
                            >
                                🔍 详情
                            </button>
                            <button
                                class="px-2 py-1 text-dark-danger hover:bg-dark-danger/10 rounded transition-colors"
                                type="button"
                                @click.stop="$emit('delete-entry', item.id)"
                            >
                                🗑️ 删除
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        </div>

        <template #footer>
            <div v-if="pageCount > 1" class="flex items-center justify-between text-sm font-semibold">
                <BaseButton
                    :disabled="page <= 1"
                    @click="$emit('change-page', page - 1)"
                    variant="secondary"
                >
                    ⬅️ 上一页
                </BaseButton>
                <span>第 {{ page }} / {{ pageCount }} 页</span>
                <BaseButton
                    :disabled="page >= pageCount"
                    @click="$emit('change-page', page + 1)"
                    variant="secondary"
                >
                    下一页 ➡️
                </BaseButton>
            </div>
        </template>
    </BaseCard>
</template>

<script setup lang="ts">
import BaseButton from './BaseButton.vue'
import BaseCard from './BaseCard.vue'
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

const handleImageError = (event: Event, item: GalleryEntry) => {
    const target = event.target as HTMLImageElement
    if (item.thumbnailPath && target.src !== item.imagePath) {
        target.src = item.imagePath
    }
}

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
