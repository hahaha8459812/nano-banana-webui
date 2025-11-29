<template>
    <div class="bg-white border-4 border-black border-t-0 rounded-b-lg p-6 shadow-lg">
        <div class="mb-4">
            <p class="font-bold mb-2 flex items-center gap-2">🍌 描述你的创意想法：</p>
            <div class="text-center text-2xl font-bold mb-4">或者</div>
        </div>

        <textarea
            :value="modelValue"
            @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
            placeholder="例如：将图片转换为超现实主义风格，加入漂浮的香蕉和鲜艳的色彩..."
            rows="4"
            class="w-full px-4 py-3 border-2 border-black rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />

        <p class="text-sm text-gray-600 mt-2 font-medium flex items-center gap-1">💡 描述越具体，效果越好！</p>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: string
}>()

defineEmits<{
    'update:modelValue': [value: string]
}>()
</script>
