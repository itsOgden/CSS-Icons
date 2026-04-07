import { loadConfig, buildIcons, generateCss, generateTypes, generateComponent } from './generate.mjs'
import fs from 'fs'
import path from 'path'

export default function CssIconsPlugin(options = {}) {
    const cwd = process.cwd()

    async function writeAll() {
        try {
            const config = await loadConfig(cwd, options.configPath)
            const icons = buildIcons(config, cwd)
            const iconDir = path.resolve(cwd, config.iconFolder)
            const outDir = path.resolve(cwd, options.outDir ?? 'src/css-icons')
            fs.mkdirSync(outDir, { recursive: true })
            fs.writeFileSync(path.join(outDir, 'index.css'), generateCss(icons, iconDir))
            fs.writeFileSync(path.join(outDir, 'CssIcon.vue'), generateComponent(icons))
            fs.writeFileSync(path.join(outDir, 'index.d.ts'), generateTypes(icons))
        } catch (e) {
            console.warn(e.message)
        }
    }

    return {
        name: 'css-icons',

        async buildStart() {
            await writeAll()
        },

        async configureServer(server) {
            try {
                const config = await loadConfig(cwd, options.configPath)
                const iconDir = path.resolve(cwd, config.iconFolder)
                server.watcher.add(iconDir)
                server.watcher.on('all', (_, file) => {
                    if (file.toLowerCase().endsWith('.svg')) writeAll()
                })
            } catch {}
        },
    }
}
