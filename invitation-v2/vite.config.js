import { defineConfig } from 'vite'

export default defineConfig({
    // Base path for custom domain - serving from root
    base: '/',

    build: {
        outDir: 'dist',
        // Generate sourcemaps for debugging
        sourcemap: false,
        // Minify for production
        minify: 'esbuild'
    },

    server: {
        host: true,
        port: 5173
    }
})
