<template>
    <div class="modern-box p-5">
        <div v-if="title || $slots.header" class="flex items-center justify-between mb-4 pb-2 border-b border-dark-border/50">
            <h3 v-if="title" class="text-lg font-bold text-dark-text flex items-center gap-2">
                <span v-if="icon">{{ icon }}</span>
                {{ title }}
            </h3>
            <slot name="header" />
        </div>
        <slot />
        <div v-if="$slots.footer" class="mt-4 pt-4 border-t border-dark-border/50">
            <slot name="footer" />
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    title?: string
    icon?: string
}>()
</script>