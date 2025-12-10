<template>
    <div class="flex flex-col gap-3 min-h-[400px]">
        <div class="flex-1 bg-dark-bg border border-dark-border rounded-xl p-6 flex items-center justify-center relative overflow-hidden">
            <div v-if="loading" class="text-center relative z-10">
                <div class="w-12 h-12 border-4 border-dark-accent border-t-transparent rounded-full animate-spin mx-auto mb-4 shadow-glow" />
                <p class="font-bold text-base flex items-center justify-center gap-2 text-dark-text">🍌 正在施法中...</p>
                <p class="text-dark-muted">请稍候片刻</p>
            </div>

            <div v-else-if="error" class="text-center relative z-10">
                <div class="text-dark-danger text-6xl mb-4">⚠️</div>
                <p class="text-dark-danger font-bold text-base mb-2">唉呀，遇到点问题</p>
                <p class="text-dark-muted text-sm break-words">{{ error }}</p>
            </div>

            <div v-else-if="result" class="w-full h-full flex items-center justify-center relative group z-10">
                <img :src="result" alt="生成的图像" class="max-w-full max-h-[600px] rounded-lg shadow-2xl object-contain" />
                <div class="absolute bottom-4 right-4 flex flex-col gap-2 items-stretch opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <BaseButton
                        v-if="canPush"
                        @click="$emit('push')"
                        icon="🔁"
                        variant="primary"
                    >
                        再次创作
                    </BaseButton>
                    <BaseButton
                        @click="$emit('download')"
                        icon="⬇️"
                        variant="primary"
                    >
                        下载图片
                    </BaseButton>
                </div>
            </div>

            <div v-else class="text-center relative z-10">
                <div class="w-16 h-16 bg-dark-surface rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                    <span class="text-3xl opacity-50">🍌</span>
                </div>
                <h3 class="font-bold text-base mb-2 flex items-center justify-center gap-2 text-dark-text">等待施法开始...</h3>
                <p class="text-dark-muted">上传图片并选择风格即可启动生成</p>
            </div>
            
            <!-- 背景装饰 -->
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-dark-surfaceHighlight/20 to-transparent pointer-events-none"></div>
        </div>

        <div v-if="responseText" class="bg-dark-surface border border-dark-border/50 rounded-xl p-4 text-sm text-dark-text shadow-lg">
            <div class="font-semibold mb-2 flex items-center gap-2 text-dark-accent">
                <span>💬</span> 模型回复
            </div>
            <p class="whitespace-pre-wrap leading-relaxed text-dark-muted">{{ responseText }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import BaseButton from './BaseButton.vue'

defineProps<{
    result: string | null
    loading: boolean
    error: string | null
    canPush: boolean
    responseText?: string | null
}>()

defineEmits<{
    download: []
    push: []
}>()
</script>
