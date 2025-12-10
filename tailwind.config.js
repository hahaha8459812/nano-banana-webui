/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                dark: {
                    bg: '#0f0f11', // 深黑背景
                    surface: '#18181b', // 卡片/容器背景
                    surfaceHighlight: '#27272a', // 高亮/悬停背景
                    border: '#3f3f46', // 边框
                    text: '#e4e4e7', // 主要文本
                    muted: '#a1a1aa', // 次要文本
                    accent: '#3b82f6', // 强调色 (蓝色)
                    accentHover: '#2563eb',
                    danger: '#ef4444',
                    success: '#22c55e',
                }
            },
            fontFamily: {
                sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif']
            },
            boxShadow: {
                'glow': '0 0 15px rgba(59, 130, 246, 0.15)',
                'glow-strong': '0 0 25px rgba(59, 130, 246, 0.3)',
            }
        },
    },
    plugins: [],
}