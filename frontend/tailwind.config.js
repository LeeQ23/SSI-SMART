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
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
}
