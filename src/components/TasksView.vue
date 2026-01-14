<template>
    <BaseCard class="min-h-[400px] flex flex-col">
        <template #header>
            <div class="flex items-center justify-between w-full gap-3">
                <div>
                    <h3 class="text-xl font-black flex items-center gap-2">🧾 任务中心</h3>
                    <p class="text-sm text-skin-muted">最近 {{ tasks.length }} 条任务</p>
                </div>
                <div class="flex gap-2">
                    <BaseButton @click="$emit('refresh')" icon="🔄" variant="secondary" :disabled="loading">
                        刷新
                    </BaseButton>
                </div>
            </div>
        </template>

        <div class="flex items-center gap-3 mb-3">
            <BaseInput v-model="keyword" label="🔎 过滤" placeholder="输入关键词（id / 状态 / 错误 / 模型）" />
        </div>

        <div v-if="loading" class="flex-1 flex items-center justify-center text-dark-muted">
            正在加载任务...
        </div>

        <div v-else-if="error" class="flex-1 flex items-center justify-center text-dark-danger">
            {{ error }}
        </div>

        <div v-else class="flex-1 overflow-auto rounded-xl border border-dark-border bg-dark-bg/40">
            <div v-if="filtered.length === 0" class="p-6 text-center text-dark-muted">
                暂无任务
            </div>
            <div v-else class="divide-y divide-dark-border/40">
                <div v-for="item in filtered" :key="item.id" class="p-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span class="font-mono text-xs text-dark-muted">#{{ item.id.slice(0, 8) }}</span>
                            <span :class="statusClass(item.status)" class="text-xs font-bold px-2 py-0.5 rounded-full border">
                                {{ statusLabel(item.status) }}
                            </span>
                            <span v-if="item.stage" class="text-xs text-dark-muted">阶段：{{ item.stage }}</span>
                            <span v-if="item.payload?.model" class="text-xs text-dark-muted">模型：{{ item.payload.model }}</span>
                        </div>
                        <div class="text-xs text-dark-muted">
                            {{ formatTime(item.createdAt) }}
                        </div>
                    </div>

                    <div class="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div class="text-dark-muted">
                            上游耗时：<span class="text-dark-text">{{ item.upstreamMs ? `${item.upstreamMs}ms` : '-' }}</span>
                        </div>
                        <div class="text-dark-muted">
                            候选数：<span class="text-dark-text">{{ item.candidates ?? '-' }}</span>
                        </div>
                        <div class="text-dark-muted">
                            总耗时：<span class="text-dark-text">{{ totalDuration(item) }}</span>
                        </div>
                    </div>

                    <div v-if="item.error" class="mt-2 text-xs text-dark-danger break-words">
                        {{ item.error }}
                    </div>

                    <div v-if="item.result?.galleryEntry" class="mt-3 flex flex-wrap items-center gap-3">
                        <img
                            :src="withServerBase(item.result.galleryEntry.thumbnailPath || item.result.galleryEntry.imagePath)"
                            class="w-20 h-20 rounded-lg object-cover border border-dark-border"
                            loading="lazy"
                        />
                        <div class="flex flex-col gap-1">
                            <div class="text-xs text-dark-muted">
                                图库：<span class="text-dark-text">{{ item.result.galleryEntry.fileName }}</span>
                            </div>
                            <div class="flex gap-2">
                                <a
                                    class="text-xs text-dark-accent hover:underline"
                                    :href="withServerBase(item.result.galleryEntry.imagePath)"
                                    target="_blank"
                                    rel="noopener"
                                >打开原图</a>
                                <a
                                    class="text-xs text-dark-accent hover:underline"
                                    :href="withServerBase(item.result.galleryEntry.thumbnailPath || item.result.galleryEntry.imagePath)"
                                    target="_blank"
                                    rel="noopener"
                                >打开缩略图</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </BaseCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GenerateTask } from '../types'
import BaseButton from './BaseButton.vue'
import BaseCard from './BaseCard.vue'
import BaseInput from './BaseInput.vue'
import { getApiBaseUrl } from '../config/client'

const props = defineProps<{
    tasks: GenerateTask[]
    loading: boolean
    error: string | null
}>()

defineEmits<{
    refresh: []
}>()

const keyword = ref('')

const filtered = computed(() => {
    const q = keyword.value.trim().toLowerCase()
    if (!q) return props.tasks
    return props.tasks.filter(task => {
        const base =
            `${task.id} ${task.status} ${task.stage || ''} ${task.error || ''} ${task.payload?.model || ''}`.toLowerCase()
        return base.includes(q)
    })
})

const statusLabel = (status: string) => {
    switch (status) {
        case 'queued':
            return '排队'
        case 'running':
            return '运行中'
        case 'saving':
            return '保存中'
        case 'done':
            return '完成'
        case 'failed':
            return '失败'
        case 'canceled':
            return '取消'
        default:
            return status
    }
}

const statusClass = (status: string) => {
    if (status === 'done') return 'border-green-500/40 text-green-300 bg-green-500/10'
    if (status === 'failed') return 'border-red-500/40 text-red-300 bg-red-500/10'
    if (status === 'canceled') return 'border-yellow-500/40 text-yellow-300 bg-yellow-500/10'
    if (status === 'running' || status === 'saving') return 'border-blue-500/40 text-blue-300 bg-blue-500/10'
    return 'border-dark-border text-dark-muted bg-dark-bg/50'
}

const formatTime = (value: string) => {
    try {
        return new Date(value).toLocaleString()
    } catch {
        return value
    }
}

const totalDuration = (task: GenerateTask) => {
    try {
        const start = Date.parse(task.startedAt || task.createdAt || '') || 0
        const end = Date.parse(task.finishedAt || '') || 0
        if (!start || !end) return '-'
        return `${end - start}ms`
    } catch {
        return '-'
    }
}

const withServerBase = (path: string) => {
    if (!path) return path
    if (path.startsWith('http') || path.startsWith('data:')) return path
    return `${getApiBaseUrl().replace(/\/$/, '')}${path}`
}
</script>
