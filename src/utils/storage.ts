// 本地存储工具
export class LocalStorage {
    private static readonly AUTH_TOKEN = 'nano-banana-auth-token'
    private static readonly SELECTED_CONFIG = 'nano-banana-config-id'
    private static readonly MODEL_SELECTIONS = 'nano-banana-model-selection'
    private static readonly API_BASE_URL = 'nano-banana-api-base-url'

    static saveAuthToken(token: string): void {
        try {
            localStorage.setItem(this.AUTH_TOKEN, token)
        } catch (error) {
            console.warn('无法保存登录态:', error)
        }
    }

    static getAuthToken(): string {
        try {
            return localStorage.getItem(this.AUTH_TOKEN) || ''
        } catch (error) {
            console.warn('无法读取登录态:', error)
            return ''
        }
    }

    static clearAuthToken(): void {
        try {
            localStorage.removeItem(this.AUTH_TOKEN)
        } catch (error) {
            console.warn('无法清空登录态:', error)
        }
    }

    static saveSelectedConfigId(id: string): void {
        try {
            localStorage.setItem(this.SELECTED_CONFIG, id)
        } catch (error) {
            console.warn('无法保存配置选择:', error)
        }
    }

    static getSelectedConfigId(): string {
        try {
            return localStorage.getItem(this.SELECTED_CONFIG) || ''
        } catch (error) {
            console.warn('无法读取配置选择:', error)
            return ''
        }
    }

    static saveModelSelection(configId: string, modelId: string): void {
        try {
            const mapping = this.getModelSelectionMap()
            mapping[configId] = modelId
            localStorage.setItem(this.MODEL_SELECTIONS, JSON.stringify(mapping))
        } catch (error) {
            console.warn('无法保存模型选择:', error)
        }
    }

    static getModelSelection(configId: string): string {
        try {
            const mapping = this.getModelSelectionMap()
            return mapping[configId] || ''
        } catch (error) {
            console.warn('无法读取模型选择:', error)
            return ''
        }
    }

    static clearAll(): void {
        this.clearAuthToken()
        localStorage.removeItem(this.SELECTED_CONFIG)
        localStorage.removeItem(this.MODEL_SELECTIONS)
        // 保留 API 地址，方便下次登录继续使用
    }

    static saveApiBaseUrl(url: string): void {
        try {
            localStorage.setItem(this.API_BASE_URL, url)
        } catch (error) {
            console.warn('无法存储后端地址:', error)
        }
    }

    static getApiBaseUrl(): string {
        try {
            return localStorage.getItem(this.API_BASE_URL) || ''
        } catch (error) {
            console.warn('无法读取后端地址:', error)
            return ''
        }
    }

    static clearApiBaseUrl(): void {
        try {
            localStorage.removeItem(this.API_BASE_URL)
        } catch (error) {
            console.warn('无法清除后端地址:', error)
        }
    }

    private static getModelSelectionMap(): Record<string, string> {
        const raw = localStorage.getItem(this.MODEL_SELECTIONS)
        if (!raw) return {}
        try {
            const parsed = JSON.parse(raw)
            if (parsed && typeof parsed === 'object') {
                return parsed as Record<string, string>
            }
        } catch (error) {
            console.warn('模型选择缓存解析失败:', error)
        }
        return {}
    }
}
