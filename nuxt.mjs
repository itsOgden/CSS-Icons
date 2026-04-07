import { defineNuxtModule, addComponent, addTypeTemplate } from '@nuxt/kit'
import { loadConfig, buildIcons, generateCss, generateTypes, generateComponent } from './generate.mjs'
import fs from 'fs'
import path from 'path'

export default defineNuxtModule({
    meta: {
        name: '@itsogden/css-icons',
        configKey: 'cssIcons',
    },

    async setup(options, nuxt) {
        const cwd = nuxt.options.rootDir
        const buildDir = nuxt.options.buildDir
        const cssFile = path.join(buildDir, 'css-icons.css')
        const componentFile = path.join(buildDir, 'CssIcon.vue')
        const typesFile = path.join(buildDir, 'types', 'css-icons.d.ts')

        async function writeAll() {
            try {
                const config = await loadConfig(cwd, options.configPath)
                const icons = buildIcons(config, cwd)
                const iconDir = path.resolve(cwd, config.iconFolder)
                fs.mkdirSync(buildDir, { recursive: true })
                fs.mkdirSync(path.dirname(typesFile), { recursive: true })
                fs.writeFileSync(cssFile, generateCss(icons, iconDir))
                fs.writeFileSync(componentFile, generateComponent(icons))
                fs.writeFileSync(typesFile, generateTypes(icons))
            } catch (e) {
                console.warn(e.message)
            }
        }

        await writeAll()

        nuxt.options.css.push(cssFile)
        nuxt.hook('build:before', writeAll)

        addTypeTemplate({
            filename: 'types/css-icons.d.ts',
            getContents: async () => {
                try {
                    const config = await loadConfig(cwd, options.configPath)
                    return generateTypes(buildIcons(config, cwd))
                } catch {
                    return 'export type CssIconName = string\n'
                }
            },
        })

        addComponent({ name: 'CssIcon', filePath: componentFile })

        nuxt.hook('vite:serverCreated', async (server) => {
            try {
                const config = await loadConfig(cwd, options.configPath)
                const iconDir = path.resolve(cwd, config.iconFolder)
                server.watcher.add(iconDir)
                server.watcher.on('all', (_, file) => {
                    if (file.toLowerCase().endsWith('.svg')) writeAll()
                })
            } catch {}
        })
    },
})
