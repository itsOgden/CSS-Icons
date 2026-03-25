import { defineNuxtModule, addComponent, createResolver, addTypeTemplate } from '@nuxt/kit'
import { CssIconsPlugin, generateTypeDeclaration, generateTypesFile, buildIconsFromConfig, generateCssFromConfig } from './unplugin'
import fs from 'fs'
import path from 'path'
import type { CssIconsOptions } from './unplugin'

export default defineNuxtModule<CssIconsOptions>({
    meta: {
        name: '@itsogden/css-icons',
        configKey: 'cssIcons',
    },
    async setup(options, nuxt) {
        const resolver = createResolver(import.meta.url)
        const cwd = nuxt.options.rootDir

        // Register the Vite plugin for virtual data module + HMR
        nuxt.hook('vite:extendConfig', (config) => {
            config.plugins = config.plugins || []
            config.plugins.push(CssIconsPlugin.vite(options))
        })

        // Write CSS to a temp file in .nuxt/ and include it properly
        const cssOutPath = path.join(cwd, '.nuxt', 'css-icons.css')
        nuxt.hook('build:before', async () => {
            const { generateCssFromConfig } = await import('./unplugin')
            const css = await generateCssFromConfig(cwd, options.configPath)
            fs.mkdirSync(path.dirname(cssOutPath), { recursive: true })
            fs.writeFileSync(cssOutPath, css, 'utf8')
        })
        nuxt.options.css.push(cssOutPath)

        // Generate type declaration via addTypeTemplate so IDEs pick it up properly
        const icons = await buildIconsFromConfig(cwd, options.configPath)

        addTypeTemplate({
            filename: 'types/css-icons.d.ts',
            getContents: () => generateTypeDeclaration(icons),
        })

        addTypeTemplate({
            filename: 'types/css-icons-types.ts',
            getContents: () => generateTypesFile(icons),
        })

        // Include generated type declaration
        nuxt.hook('prepare:types', ({ tsConfig }) => {
            tsConfig.include = tsConfig.include || []
            tsConfig.include.push('../css-icons.d.ts')
        })
        addComponent({
            name: 'CssIcon',
            filePath: resolver.resolve('./vue/CssIcon'),
        })
    },
})