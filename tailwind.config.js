/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    bg: '#121212',
                    card: '#1e1e1e',
                    input: '#252525',
                    border: '#444',
                    text: '#e0e0e0',
                    muted: '#888'
                }
            },
            fontFamily: {
                sans: ['Roboto', 'sans-serif']
            },
            animation: {
                'bounce-slow': 'bounce 2s infinite',
            }
        },
    },
    plugins: [],
}