import { defineNuxtModule, addPlugin, addComponent, createResolver } from '@nuxt/kit'
import { CssIconsPlugin } from './unplugin'
import type { CssIconsOptions } from './unplugin'

export default defineNuxtModule<CssIconsOptions>({
    meta: {
        name: '@itsogden/css-icons',
        configKey: 'cssIcons',
    },
    setup(options, nuxt) {
        const resolver = createResolver(import.meta.url)

        // Register the Vite plugin
        nuxt.hook('vite:extendConfig', (config) => {
            config.plugins = config.plugins || []
            config.plugins.push(CssIconsPlugin.vite(options))
        })

        // Inject the CSS virtual module
        nuxt.options.css.push('virtual:css-icons/styles')

        // Register CssIcon as a global component
        addComponent({
            name: 'CssIcon',
            filePath: resolver.resolve('./vue/CssIcon'),
        })
    },
})