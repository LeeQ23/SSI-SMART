/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#001F3F",
                secondary: "#003366",
                accent: "#0074D9",
                success: "#10b981", // Emerald 500
                warning: "#FFDC00",
                danger: "#ef4444", // Red 500
                light: "#F0F4F8",
                dark: "#101010"
            },
            fontFamily: {
                sans: ['Outfit', 'Roboto', 'sans-serif'],
            },
            keyframes: {
                breathe: {
                    '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
                    '50%': { opacity: '0.8', transform: 'scale(1.1)' },
                }
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'breathe': 'breathe 4s ease-in-out infinite',
            }
        },
    },
    plugins: [],
}
