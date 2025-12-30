import { defineConfig } from 'vite'

export default defineConfig({
    // Base path for GitHub Pages - deploying to root
    base: '/wedding/',

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
