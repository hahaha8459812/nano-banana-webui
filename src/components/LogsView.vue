<template>
    <BaseCard class="min-h-[400px] flex flex-col">
        <template #header>
            <div class="flex items-center justify-between w-full gap-3">
                <div>
                    <h3 class="text-xl font-black flex items-center gap-2">📜 日志</h3>
                    <p class="text-sm text-skin-muted">最新在上，最多显示 {{ limit }} 条</p>
                </div>
                <div class="flex gap-2">
                    <label class="flex items-center gap-2 text-xs text-dark-muted">
                        上限
                        <select
                            class="bg-dark-bg border border-dark-border rounded-lg px-2 py-1 text-xs text-dark-text"
                            :value="limit"
                            @change="$emit('update:limit', Number(($event.target as HTMLSelectElement).value))"
                        >
                            <option v-for="n in limitOptions" :key="n" :value="n">{{ n }}</option>
                        </select>
                    </label>
                    <BaseButton @click="$emit('refresh')" icon="🔄" variant="secondary" :disabled="loading">
                        刷新
                    </BaseButton>
                    <BaseButton @click="$emit('clear')" icon="🧹" variant="secondary" :disabled="loading">
                        清空显示
                    </BaseButton>
                </div>
            </div>
        </template>

        <div class="flex items-center gap-3 mb-3">
            <BaseInput v-model="keyword" label="🔎 过滤" placeholder="输入关键词（scope / message / requestId）" />
        </div>

        <div v-if="loading" class="flex-1 flex items-center justify-center text-dark-muted">
            正在加载日志...
        </div>

        <div v-else-if="error" class="flex-1 flex items-center justify-center text-dark-danger">
            {{ error }}
        </div>

        <div v-else class="flex-1 overflow-auto rounded-xl border border-dark-border bg-dark-bg/40">
            <div v-if="filtered.length === 0" class="p-6 text-center text-dark-muted">
                暂无日志
            </div>
            <div v-else class="divide-y divide-dark-border/40">
                <div v-for="item in filtered" :key="item.id" class="p-3 font-mono text-xs leading-relaxed">
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span class="text-dark-muted">{{ formatTime(item.time) }}</span>
                        <span :class="item.level === 'error' ? 'text-dark-danger font-bold' : 'text-dark-accent font-semibold'">
                            {{ item.level.toUpperCase() }}
                        </span>
                        <span class="text-dark-text font-semibold">[{{ item.scope }}]</span>
                        <span v-if="item.requestId" class="text-dark-muted">#{{ item.requestId }}</span>
                    </div>
                    <div class="mt-1 text-dark-text break-words">{{ item.message }}</div>
                    <pre v-if="item.extra !== undefined && item.extra !== null" class="mt-2 text-dark-muted whitespace-pre-wrap break-words">{{ safeStringify(item.extra) }}</pre>
                </div>
            </div>
        </div>
    </BaseCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ServerLogEntry } from '../types'
import BaseButton from './BaseButton.vue'
import BaseCard from './BaseCard.vue'
import BaseInput from './BaseInput.vue'

const props = defineProps<{
    entries: ServerLogEntry[]
    loading: boolean
    error: string | null
    limit: number
    limitOptions?: number[]
}>()

defineEmits<{
    refresh: []
    clear: []
    'update:limit': [limit: number]
}>()

const keyword = ref('')
const limitOptions = computed(() => props.limitOptions?.length ? props.limitOptions : [100, 300, 1000, 2000])

const filtered = computed(() => {
    const q = keyword.value.trim().toLowerCase()
    const source = props.entries.slice(0, Math.max(1, props.limit || 300))
    if (!q) return source
    return source.filter(item => {
        const extraText = item.extra ? safeStringify(item.extra).toLowerCase() : ''
        return (
            (item.scope || '').toLowerCase().includes(q) ||
            (item.message || '').toLowerCase().includes(q) ||
            (item.requestId || '').toLowerCase().includes(q) ||
            extraText.includes(q)
        )
    })
})

const safeStringify = (value: unknown) => {
    try {
        return JSON.stringify(value, null, 2)
    } catch {
        return String(value)
    }
}

const formatTime = (value: string) => {
    try {
        return new Date(value).toLocaleString()
    } catch {
        return value
    }
}
</script>
