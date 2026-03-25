import { createUnplugin } from 'unplugin'
import fs from 'fs'
import path from 'path'

const VIRTUAL_ID = 'virtual:css-icons/data'
const RESOLVED_ID = '\0virtual:css-icons/data'

export interface CssIconsOptions {
    // Path to css-icons.config.mjs, defaults to process.cwd()
    configPath?: string
}

interface IconConfig {
    iconFolder: string
    defaultFolder?: string
    backgroundFolders?: string[]
    outDir?: string
}

interface IconRecord {
    relPath: string
    folder: string
    stem: string
    icon: string
    baseClass: string
    implClass: string
    isBackground: boolean
}

function toPosix(p: string) { return p.replace(/\\/g, '/') }

function walkSvgFiles(dir: string, baseDir: string = dir, out: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walkSvgFiles(full, baseDir, out)
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg'))
            out.push(toPosix(path.relative(baseDir, full)))
    }
    return out
}

function buildIconRecord(relPath: string, config: IconConfig): IconRecord {
    const clean = toPosix(relPath)
    const noExt = clean.replace(/\.svg$/i, '')
    const parts = noExt.split('/').filter(Boolean)
    const fileName = parts.pop()!
    const folder = parts[parts.length - 1] || ''
    const stem = fileName
    const isDefault = !!config.defaultFolder && folder === config.defaultFolder
    const icon = isDefault ? stem : (folder ? `${stem}-${folder}` : stem)
    const isBackground = (config.backgroundFolders || []).includes(folder)
    const implClass = folder ? `i-${stem}-${folder}` : `i-${stem}`
    const baseClass = stem
    return { relPath: clean, folder, stem, icon, baseClass, implClass, isBackground }
}

function svgToDataUri(svg: string) {
    return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\r?\n|\r/g, ' ').trim())
}

export function generateTypeDeclaration(icons: IconRecord[]): string {
    const typeNames = icons.map(i => `  | '${i.icon}'`).join('\n') || `  | 'error'`
    return `declare module 'virtual:css-icons/data' {\n  export type CssIconName =\n${typeNames}\n  export const cssIconMap: Record<CssIconName, string>\n  export function getIconClass(name: CssIconName): string\n}\n`
}

function generateVirtualModule(icons: IconRecord[]): string {
    const entries = icons.map(i => {
        const className = `${i.baseClass} ${i.implClass}${i.isBackground ? ' colored' : ''}`
        return `  '${i.icon}': '${className}'`
    }).join(',\n')

    return `export const cssIconMap = {\n${entries}\n}\n\nexport function getIconClass(name) {\n  return cssIconMap[name]\n}\n`
}

function generateCss(icons: IconRecord[], config: IconConfig, cwd: string): string {
    const iconFolder = path.resolve(cwd, config.iconFolder)
    let css = ''
    css += `.icon { display: inline-block; vertical-align: middle; line-height: 1; }\n`
    css += `.icon::after { content: ""; display: inline-block; height: 1em; width: 1em; background-color: currentColor; mask-size: contain; mask-repeat: no-repeat; mask-position: center; -webkit-mask-size: contain; -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; }\n`
    css += `.icon.scale-width::after { width: var(--icon-width, 1em); }\n`
    css += `.icon.colored::after { background-color: transparent; background-size: contain; background-repeat: no-repeat; background-position: center; }\n\n`
    css += `:root {\n`
    for (const icon of icons) {
        const svgPath = path.join(iconFolder, icon.relPath)
        const svg = fs.readFileSync(svgPath, 'utf8')
        css += `  --${icon.implClass}: url("${svgToDataUri(svg)}");\n`
    }
    css += `}\n\n`
    for (const icon of icons) {
        css += `.${icon.implClass}::after {\n`
        css += `  --icon-width: 1em;\n`
        if (icon.isBackground) {
            css += `  background-image: var(--${icon.implClass});\n`
        } else {
            css += `  mask-image: var(--${icon.implClass});\n`
            css += `  -webkit-mask-image: var(--${icon.implClass});\n`
        }
        css += `}\n\n`
    }
    return css
}

async function loadConfig(cwd: string, configPath?: string): Promise<IconConfig> {
    const candidates = configPath
        ? [configPath]
        : [path.join(cwd, 'css-icons.config.mjs'), path.join(cwd, 'css-icons.config.js')]

    for (const file of candidates) {
        if (fs.existsSync(file)) {
            let resolved = path.resolve(file).replace(/\\/g, '/')
            if (!resolved.startsWith('/')) resolved = '/' + resolved
            const mod = await import('file://' + resolved)
            return mod.default || mod
        }
    }
    throw new Error('Could not find css-icons.config.mjs — run `pnpm css-icons init` first')
}

function buildIcons(config: IconConfig, cwd: string): IconRecord[] {
    const iconDir = path.resolve(cwd, config.iconFolder)
    if (!fs.existsSync(iconDir)) throw new Error(`iconFolder does not exist: ${iconDir}`)
    const files = walkSvgFiles(iconDir)
    return files.map(f => buildIconRecord(f, config)).sort((a, b) => a.icon.localeCompare(b.icon))
}

export async function buildIconsFromConfig(cwd: string, configPath?: string): Promise<IconRecord[]> {
    const config = await loadConfig(cwd, configPath)
    return buildIcons(config, cwd)
}

export async function generateCssFromConfig(cwd: string, configPath?: string): Promise<string> {
    const config = await loadConfig(cwd, configPath)
    const icons = buildIcons(config, cwd)
    return generateCss(icons, config, cwd)
}

export const CssIconsPlugin = createUnplugin<CssIconsOptions | undefined>((options = {}) => {
    const cwd = process.cwd()
    let config: IconConfig
    let icons: IconRecord[]
    let virtualModule: string
    let cssContent: string

    async function reload() {
        config = await loadConfig(cwd, options.configPath)
        icons = buildIcons(config, cwd)
        virtualModule = generateVirtualModule(icons)
        cssContent = generateCss(icons, config, cwd)
    }

    return {
        name: 'css-icons',

        async buildStart() {
            await reload()
        },

        resolveId(id) {
            if (id === VIRTUAL_ID) return RESOLVED_ID
        },

        load(id) {
            if (id === RESOLVED_ID) return { code: virtualModule, map: null }
        },

        vite: {
            configureServer(server) {
                // Watch SVG folder and invalidate virtual module on change
                const watchDir = config?.iconFolder ? path.resolve(cwd, config.iconFolder) : null
                if (!watchDir) return

                server.watcher.add(watchDir)
                server.watcher.on('all', async (event, file) => {
                    if (!file.toLowerCase().endsWith('.svg')) return
                    await reload()
                    const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
                    if (mod) server.moduleGraph.invalidateModule(mod)
                    server.ws.send({ type: 'full-reload' })
                })
            }
        }
    }
})