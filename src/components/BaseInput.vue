<template>
    <div class="w-full">
        <label v-if="label" :for="id" class="modern-label">
            <span v-if="icon" class="mr-1">{{ icon }}</span>
            {{ label }}
        </label>
        <div class="relative">
            <input
                v-if="type !== 'textarea'"
                :id="id"
                :type="type"
                :value="modelValue"
                :placeholder="placeholder"
                :disabled="disabled"
                :required="required"
                class="modern-input"
                :class="{ 'opacity-50 cursor-not-allowed': disabled }"
                @input="updateValue"
            />
            <textarea
                v-else
                :id="id"
                :value="modelValue"
                :placeholder="placeholder"
                :disabled="disabled"
                :required="required"
                :rows="rows"
                class="modern-input resize-none"
                :class="{ 'opacity-50 cursor-not-allowed': disabled }"
                @input="updateValue"
            ></textarea>
        </div>
        <p v-if="error" class="text-sm text-dark-danger mt-1.5 font-medium flex items-center gap-1">
            <span class="text-base">⚠️</span> {{ error }}
        </p>
        <p v-else-if="hint" class="text-xs text-dark-muted mt-1.5 ml-1">{{ hint }}</p>
    </div>
</template>

<script setup lang="ts">
import { useId } from 'vue'

const props = withDefaults(defineProps<{
    modelValue: string | number
    label?: string
    icon?: string
    placeholder?: string
    type?: 'text' | 'password' | 'email' | 'number' | 'textarea'
    disabled?: boolean
    required?: boolean
    error?: string
    hint?: string
    rows?: number
}>(), {
    type: 'text',
    disabled: false,
    required: false,
    rows: 4
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void
}>()

const id = useId()

const updateValue = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    emit('update:modelValue', target.value)
}
</script>