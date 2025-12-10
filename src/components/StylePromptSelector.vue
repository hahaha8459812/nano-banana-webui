<template>
    <div class="h-full flex flex-col gap-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex bg-dark-bg rounded-lg p-1 border border-dark-border">
                <button
                    @click="activeTab = 'style'"
                    :class="[
                        'flex-1 py-1.5 px-3 rounded-md font-bold transition-all flex items-center justify-center gap-2 text-sm',
                        activeTab === 'style' ? 'bg-dark-surfaceHighlight text-dark-accent shadow-sm' : 'text-dark-muted hover:text-dark-text'
                    ]"
                >
                    🍱 预设风格
                </button>
                <button
                    @click="activeTab = 'custom'"
                    :class="[
                        'flex-1 py-1.5 px-3 rounded-md font-bold transition-all flex items-center justify-center gap-2 text-sm',
                        activeTab === 'custom' ? 'bg-dark-surfaceHighlight text-dark-accent shadow-sm' : 'text-dark-muted hover:text-dark-text'
                    ]"
                >
                    ✍️ 自定义
                </button>
            </div>
            <BaseButton
                @click="openCreateForm"
                variant="secondary"
                class="text-sm py-1.5 px-3"
            >
                ➕ 新建
            </BaseButton>
        </div>

        <div v-if="activeTab === 'style'" class="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
            <div
                v-for="template in templates"
                :key="template.id"
                @click="selectStyle(template.id)"
                :class="[
                    'p-3 rounded-xl border cursor-pointer transition-all duration-200 group',
                    selectedStyle === template.id
                        ? 'bg-dark-surfaceHighlight border-dark-accent shadow-glow'
                        : 'bg-dark-bg border-dark-border hover:border-dark-muted/50'
                ]"
            >
                <div class="flex items-start gap-3">
                    <img
                        v-if="template.image"
                        :src="template.image"
                        :alt="template.title"
                        class="w-16 h-16 rounded-lg border border-dark-border object-cover flex-shrink-0"
                    />

                    <div class="flex-1 min-w-0 space-y-1">
                        <div class="flex items-center justify-between gap-2">
                            <div class="text-sm font-bold text-dark-text">{{ template.title }}</div>
                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    class="text-xs px-2 py-1 rounded bg-dark-surface hover:bg-dark-border text-dark-muted hover:text-dark-text"
                                    @click.stop="openEditForm(template)"
                                >
                                    ✏️
                                </button>
                                <button
                                    class="text-xs px-2 py-1 rounded bg-dark-surface hover:bg-dark-danger/20 text-dark-danger"
                                    @click.stop="emit('delete-template', template.id)"
                                >
                                    🗑
                                </button>
                            </div>
                        </div>
                        <p class="text-xs text-dark-muted line-clamp-1">{{ template.description }}</p>
                        <details class="group/details">
                            <summary class="cursor-pointer text-[10px] text-dark-muted/70 hover:text-dark-muted flex items-center gap-1 mt-1">
                                <span>提示词</span>
                                <svg class="w-3 h-3 transition-transform group-open/details:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div class="mt-1 p-2 bg-dark-bg/50 rounded text-[10px] text-dark-muted border border-dark-border/50 break-words">
                                {{ template.prompt }}
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="flex flex-col gap-3 flex-1 h-full">
            <BaseInput
                type="textarea"
                :modelValue="customPrompt"
                @update:modelValue="updateCustomPrompt"
                label="🍌 描述你的创意想法："
                placeholder="例如：把角色转为写实风格，加入金属质感与高对比灯光..."
                :rows="8"
                class="flex-1 h-full"
            />
            <p class="text-xs text-dark-muted font-medium flex items-center gap-1">💡 描述越详细，结果越可控。</p>
        </div>

        <form v-if="showEditor" class="bg-dark-bg border border-dashed border-dark-border rounded-lg p-4 space-y-3" @submit.prevent="handleSubmit">
            <div class="flex items-center justify-between gap-2">
                <h4 class="font-bold text-dark-text">{{ editorMode === 'create' ? '新增模板' : '编辑模板' }}</h4>
                <button type="button" class="text-sm text-dark-muted hover:text-dark-text" @click="closeEditor">✖ 关闭</button>
            </div>
            <div class="grid md:grid-cols-2 gap-3">
                <BaseInput
                    label="模板标题"
                    v-model="form.title"
                    required
                />
                <BaseInput
                    label="示例图地址"
                    v-model="form.image"
                    placeholder="/preview.png"
                />
            </div>
            <BaseInput
                label="描述"
                v-model="form.description"
            />
            <BaseInput
                type="textarea"
                label="提示词"
                v-model="form.prompt"
                required
                :rows="3"
            />
            <p v-if="formError" class="text-sm text-dark-danger font-semibold">{{ formError }}</p>
            <div class="flex items-center gap-2 justify-end">
                <BaseButton type="button" @click="closeEditor" variant="secondary">取消</BaseButton>
                <BaseButton type="submit" variant="primary">保存</BaseButton>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'
import BaseInput from './BaseInput.vue'
import type { StyleTemplate } from '../types'

const props = defineProps<{
    selectedStyle: string
    customPrompt: string
    templates: StyleTemplate[]
}>()

const emit = defineEmits<{
    'update:selectedStyle': [value: string]
    'update:customPrompt': [value: string]
    'create-template': [value: Omit<StyleTemplate, 'id'>]
    'update-template': [value: StyleTemplate]
    'delete-template': [id: string]
}>()

const activeTab = ref<'style' | 'custom'>('style')
const showEditor = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const form = reactive({
    title: '',
    description: '',
    prompt: '',
    image: ''
})
const formError = ref('')

watch(
    () => props.selectedStyle,
    newValue => {
        if (newValue && activeTab.value !== 'style') {
            activeTab.value = 'style'
        }
    }
)

watch(
    () => props.customPrompt,
    newValue => {
        if (newValue && activeTab.value !== 'custom') {
            activeTab.value = 'custom'
        }
    }
)

const selectStyle = (styleId: string) => {
    emit('update:customPrompt', '')
    emit('update:selectedStyle', props.selectedStyle === styleId ? '' : styleId)
}

const updateCustomPrompt = (value: string) => {
    if (value) {
        emit('update:selectedStyle', '')
    }
    emit('update:customPrompt', value)
}

const resetForm = () => {
    form.title = ''
    form.description = ''
    form.prompt = ''
    form.image = ''
    formError.value = ''
}

const openCreateForm = () => {
    editorMode.value = 'create'
    editingId.value = null
    resetForm()
    showEditor.value = true
}

const openEditForm = (template: StyleTemplate) => {
    editorMode.value = 'edit'
    editingId.value = template.id
    form.title = template.title
    form.description = template.description
    form.prompt = template.prompt
    form.image = template.image
    showEditor.value = true
}

const closeEditor = () => {
    showEditor.value = false
    editingId.value = null
    resetForm()
}

const handleSubmit = () => {
    formError.value = ''
    if (!form.title.trim()) {
        formError.value = '模板名称不能为空'
        return
    }
    if (!form.prompt.trim()) {
        formError.value = '提示词不能为空'
        return
    }
    const payload = {
        id: editingId.value || '',
        title: form.title,
        description: form.description,
        prompt: form.prompt,
        image: form.image
    }
    if (editorMode.value === 'create') {
        const { id, ...rest } = payload
        emit('create-template', rest)
    } else if (editingId.value) {
        emit('update-template', payload as StyleTemplate)
    }
    closeEditor()
}
</script>
