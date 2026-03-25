import { defineNuxtModule, addComponent, createResolver, addTypeTemplate } from '@nuxt/kit'
import { CssIconsPlugin, generateTypeDeclaration, generateComponentWrapper, buildIconsFromConfig, generateCssFromConfig } from './unplugin'
import fs from 'fs'
import path from 'path'
import type { CssIconsOptions } from './unplugin'

export default defineNuxtModule<CssIconsOptions>({
    meta: {
        name: '@itsogden/css-icons',
        configKey: 'cssIcons',
    },
    async setup(options, nuxt) {
        const cwd = nuxt.options.rootDir

        // Register the Vite plugin for virtual data module + HMR
        nuxt.hook('vite:extendConfig', (config) => {
            config.plugins = config.plugins || []
            config.plugins.push(CssIconsPlugin.vite(options))
        })

        // Write CSS to .nuxt/ and include it
        const cssOutPath = path.join(cwd, '.nuxt', 'css-icons.css')
        nuxt.hook('build:before', async () => {
            const css = await generateCssFromConfig(cwd, options.configPath)
            fs.mkdirSync(path.dirname(cssOutPath), { recursive: true })
            fs.writeFileSync(cssOutPath, css, 'utf8')
        })
        nuxt.options.css.push(cssOutPath)

        // Build icons for type generation
        const icons = await buildIconsFromConfig(cwd, options.configPath)

        // Generate virtual module type declaration
        addTypeTemplate({
            filename: 'types/css-icons.d.ts',
            getContents: () => generateTypeDeclaration(icons),
        })

        // Write generated component wrapper with exact icon types baked in
        const componentPath = path.join(cwd, '.nuxt', 'css-icons-component.ts')
        fs.mkdirSync(path.dirname(componentPath), { recursive: true })
        fs.writeFileSync(componentPath, generateComponentWrapper(icons), 'utf8')

        // Register CssIcon pointing at the generated wrapper
        addComponent({
            name: 'CssIcon',
            filePath: componentPath,
        })
    },
})