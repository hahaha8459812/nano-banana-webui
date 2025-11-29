<template>
    <div class="bg-white border-4 border-black border-t-0 rounded-b-lg p-4 shadow-lg h-full flex flex-col gap-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex bg-gray-100 rounded-lg p-1 border-2 border-black">
                <button
                    @click="activeTab = 'style'"
                    :class="[
                        'flex-1 py-2 px-3 rounded-md font-bold transition-all flex items-center justify-center gap-2',
                        activeTab === 'style' ? 'bg-yellow-300 text-black' : 'text-gray-600 hover:text-black'
                    ]"
                >
                    🍱 预设风格
                </button>
                <button
                    @click="activeTab = 'custom'"
                    :class="[
                        'flex-1 py-2 px-3 rounded-md font-bold transition-all flex items-center justify-center gap-2',
                        activeTab === 'custom' ? 'bg-yellow-300 text-black' : 'text-gray-600 hover:text-black'
                    ]"
                >
                    ✍️ 自定义提示词
                </button>
            </div>
            <button
                @click="openCreateForm"
                class="px-3 py-2 bg-green-400 text-black border-2 border-black rounded-lg font-semibold text-sm hover:bg-green-500 transition"
            >
                ➕ 新建模板
            </button>
        </div>

        <div v-if="activeTab === 'style'" class="space-y-2 flex-1 overflow-y-auto">
            <div
                v-for="template in templates"
                :key="template.id"
                @click="selectStyle(template.id)"
                :class="[
                    'p-4 rounded-lg border-2 border-black cursor-pointer transition-all',
                    selectedStyle === template.id ? 'bg-yellow-300 border-orange-500' : 'bg-yellow-50 hover:bg-yellow-100'
                ]"
            >
                <div class="flex items-start gap-3">
                    <img
                        v-if="template.image"
                        :src="template.image"
                        :alt="template.title"
                        class="w-20 h-20 rounded border-2 border-black object-cover flex-shrink-0"
                    />

                    <div class="flex-1 min-w-0 space-y-2">
                        <div class="flex items-center justify-between gap-2">
                            <div class="text-base font-bold">{{ template.title }}</div>
                            <div class="flex items-center gap-2">
                                <button
                                    class="text-xs px-2 py-1 border border-black rounded bg-white hover:bg-gray-100"
                                    @click.stop="openEditForm(template)"
                                >
                                    ✏️ 编辑
                                </button>
                                <button
                                    class="text-xs px-2 py-1 border border-black rounded bg-white hover:bg-gray-100 text-red-600"
                                    @click.stop="emit('delete-template', template.id)"
                                >
                                    🗑 删除
                                </button>
                            </div>
                        </div>
                        <p class="text-sm text-gray-600">{{ template.description }}</p>
                        <details class="group">
                            <summary class="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                <span>查看完整提示词</span>
                                <svg class="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div class="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 border break-words">
                                {{ template.prompt }}
                            </div>
                        </details>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="flex flex-col gap-3 flex-1">
            <label class="font-bold flex items-center gap-2">🍌 描述你的创意想法：</label>
            <textarea
                :value="customPrompt"
                @input="updateCustomPrompt(($event.target as HTMLTextAreaElement).value)"
                placeholder="例如：把角色转为写实风格，加入金属质感与高对比灯光..."
                class="w-full px-4 py-3 border-2 border-black rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent flex-1 min-h-[160px]"
            />
            <p class="text-sm text-gray-600 font-medium flex items-center gap-1">💡 描述越详细，结果越可控。</p>
        </div>

        <form v-if="showEditor" class="bg-gray-100 border-2 border-dashed border-gray-400 rounded-lg p-4 space-y-3" @submit.prevent="handleSubmit">
            <div class="flex items-center justify-between gap-2">
                <h4 class="font-bold text-gray-700">{{ editorMode === 'create' ? '新增模板' : '编辑模板' }}</h4>
                <button type="button" class="text-sm text-gray-500 hover:text-gray-800" @click="closeEditor">✖ 关闭</button>
            </div>
            <div class="grid md:grid-cols-2 gap-3">
                <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                    模板标题
                    <input v-model="form.title" required class="px-3 py-2 border-2 border-black rounded-lg" />
                </label>
                <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                    示例图地址
                    <input v-model="form.image" class="px-3 py-2 border-2 border-black rounded-lg" placeholder="/preview.png" />
                </label>
            </div>
            <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                描述
                <input v-model="form.description" class="px-3 py-2 border-2 border-black rounded-lg" />
            </label>
            <label class="text-sm font-semibold text-gray-700 flex flex-col gap-1">
                提示词
                <textarea v-model="form.prompt" required class="px-3 py-2 border-2 border-black rounded-lg min-h-[120px]" />
            </label>
            <div class="flex items-center gap-2 justify-end">
                <button type="button" class="px-4 py-2 border-2 border-black rounded-lg bg-white hover:bg-gray-200" @click="closeEditor">取消</button>
                <button type="submit" class="px-4 py-2 border-2 border-black rounded-lg bg-orange-400 hover:bg-orange-500 text-white font-semibold">保存</button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
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
    if (!form.title || !form.prompt) return
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
