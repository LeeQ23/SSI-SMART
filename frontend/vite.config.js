import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['logo.png'],
            manifest: {
                name: 'SSI Smart Manufacturing',
                short_name: 'SSI Smart',
                description: 'Real-time manufacturing dashboard and monitoring system.',
                theme_color: '#000000',
                background_color: '#000000',
                display: 'standalone',
                icons: [
                    {
                        src: 'logo.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'logo.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'logo.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    server: {
        port: 3000,
        host: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5003',
                changeOrigin: true,
                secure: false,
            },
            '/socket.io': {
                target: 'http://127.0.0.1:5003',
                ws: true,
                changeOrigin: true,
                secure: false
            }
        }
    }
})
