<template>
    <div class="mb-8">
        <h2 class="text-xl font-medium mb-4 text-dark-text">2. 输入提示词</h2>
        <textarea
            :value="modelValue"
            @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
            placeholder="例如：一只穿着超级英雄斗篷的猫，电影级灯光"
            rows="4"
            class="w-full px-4 py-3 bg-dark-input border border-dark-border rounded-lg text-dark-text placeholder-dark-muted resize-vertical focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
        />
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
