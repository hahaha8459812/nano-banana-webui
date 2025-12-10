<template>
    <button
        :class="[
            'modern-btn disabled:opacity-50 disabled:cursor-not-allowed',
            variant === 'primary' ? 'modern-btn-primary' : 'modern-btn-secondary',
            block ? 'w-full' : ''
        ]"
        :disabled="disabled || loading"
        @click="$emit('click', $event)"
    >
        <span v-if="loading" class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
        <span v-else-if="icon" class="text-lg">{{ icon }}</span>
        <slot />
    </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
    variant?: 'primary' | 'secondary'
    disabled?: boolean
    loading?: boolean
    icon?: string
    block?: boolean
}>(), {
    variant: 'secondary',
    disabled: false,
    loading: false,
    block: false
})

defineEmits<{
    (e: 'click', event: MouseEvent): void
}>()
</script>