import { defineConfig } from 'vite'

export default defineConfig({
    // Base path for GitHub Pages
    // Change 'wedding' to your repository name
    base: '/wedding/invitation-v2/',

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
