<template>
    <button
        @click="$emit('click')"
        :disabled="disabled"
        :class="[
            'w-full px-8 py-4 rounded-lg font-bold text-white text-lg transition-all duration-200 flex items-center justify-center gap-3 border-4 border-black shadow-lg',
            disabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-400 to-yellow-500 hover:from-orange-500 hover:to-yellow-600 hover:-translate-y-1 hover:shadow-xl'
        ]"
    >
        <span v-if="!loading" class="flex items-center gap-3 text-xl">🍌 开始生成魔法！</span>
        <span v-else class="flex items-center gap-3 text-xl">🍌 正在创造中...</span>

        <div v-if="loading" class="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
    </button>
</template>

<script setup lang="ts">
defineProps<{
    loading: boolean
    disabled: boolean
}>()

defineEmits<{
    click: []
}>()
</script>
