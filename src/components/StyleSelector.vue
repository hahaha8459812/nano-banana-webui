<template>
    <div class="bg-white border-4 border-black border-t-0 rounded-b-lg p-6 shadow-lg">
        <div class="space-y-4">
            <div
                v-for="template in templates"
                :key="template.id"
                @click="selectStyle(template.id)"
                :class="[
                    'p-4 rounded-lg border-2 border-black cursor-pointer transition-all',
                    modelValue === template.id ? 'bg-yellow-300 border-orange-500' : 'bg-yellow-50 hover:bg-yellow-100'
                ]"
            >
                <div class="flex items-center gap-3 mb-2">
                    <div class="text-lg font-bold">{{ template.title }}</div>
                    <img v-if="template.image" :src="template.image" :alt="template.title" class="w-12 h-12 rounded border-2 border-black object-cover" />
                </div>
                <p class="text-sm text-gray-600 mb-2">{{ template.description }}</p>
                <div class="bg-gray-100 p-2 rounded text-xs text-gray-700 border">
                    <strong>提示词预览：</strong>
                    <p class="mt-1">{{ template.prompt.substring(0, 100) }}{{ template.prompt.length > 100 ? '...' : '' }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { StyleTemplate } from '../types'

const props = defineProps<{
    modelValue: string
    templates: StyleTemplate[]
}>()

const emit = defineEmits<{
    'update:modelValue': [value: string]
}>()

const selectStyle = (styleId: string) => {
    emit('update:modelValue', props.modelValue === styleId ? '' : styleId)
}
</script>
