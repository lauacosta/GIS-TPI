
import { defineConfig } from 'vite'
import svgo from 'vite-plugin-svgo'

export default defineConfig({
    build: {
        sourcemap: true,
    },
    server: {
        proxy: {
            '/geoserver': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
            }
        }
    },
    plugins: [
        svgo({
            // Optional: custom SVGO config
            svgoConfig: {
                multipass: true,
                plugins: [
                    'removeDimensions',
                    'removeComments',
                    'removeMetadata',
                    {
                        name: 'removeAttrs',
                        params: { attrs: '(data-name)' }
                    }
                ]
            }
        })
    ]
})

