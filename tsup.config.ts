import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        nuxt: 'nuxt.ts',
        vite: 'vite.ts',
        unplugin: 'unplugin.ts',
        component: 'vue/CssIcon.ts',
    },
    format: ['esm'],
    dts: true,
    external: ['vue', '@nuxt/kit', 'unplugin', 'virtual:css-icons/data'],
    clean: true,
})
