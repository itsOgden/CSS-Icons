#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import readline from 'readline'

const cwd = process.cwd()
const args = process.argv.slice(2)
const command = args[0]

// ─── Init ────────────────────────────────────────────────────────────────────

function prompt(rl, question) {
    return new Promise((resolve) => rl.question(question, resolve))
}

function checkMark() { return '\x1b[32m✔\x1b[0m' }
function warn() { return '\x1b[33m!\x1b[0m' }
function info() { return '\x1b[36mℹ\x1b[0m' }

async function init() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    console.log('\n\x1b[1m@itsogden/css-icons setup\x1b[0m\n')

    // ── Config file ─────────────────────────────────────────────────────────────
    const configPath = path.join(cwd, 'css-icons.config.mjs')
    if (fs.existsSync(configPath)) {
        console.log(`${checkMark()} css-icons.config.mjs already exists, skipping.`)
    } else {
        const ans = await prompt(rl, `${info()} Create css-icons.config.mjs? (Y/n): `)
        if (ans.trim().toLowerCase() !== 'n') {
            const iconFolder = await prompt(rl, `${info()} Icon folder path (default: ./assets/icons): `)
            const defaultFolder = await prompt(rl, `${info()} Default folder name, omitted from icon names (leave blank for none): `)

            const configContent = `export default {
  iconFolder: '${iconFolder.trim() || './assets/icons'}',
  ${defaultFolder.trim() ? `defaultFolder: '${defaultFolder.trim()}',` : `// defaultFolder: 'duotone',`}
}
`
            fs.writeFileSync(configPath, configContent, 'utf8')
            console.log(`${checkMark()} Created css-icons.config.mjs`)
        } else {
            console.log(`${warn()} Skipped css-icons.config.mjs — you'll need to create it manually.`)
        }
    }

    // ── package.json scripts ─────────────────────────────────────────────────────
    const pkgPath = path.join(cwd, 'package.json')
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        pkg.scripts = pkg.scripts || {}
        let changed = false

        if (pkg.scripts['css-icons']) {
            console.log(`${checkMark()} package.json "css-icons" script already exists, skipping.`)
        } else {
            const ans = await prompt(rl, `${info()} Add "css-icons" script to package.json? (Y/n): `)
            if (ans.trim().toLowerCase() !== 'n') {
                pkg.scripts['css-icons'] = 'node ./node_modules/@itsogden/css-icons/index.mjs'
                changed = true
                console.log(`${checkMark()} Added "css-icons" script`)
            }
        }

        if (changed) {
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
        }
    } else {
        console.log(`${warn()} No package.json found, skipping script setup.`)
    }

    // ── Setup reminder ───────────────────────────────────────────────────────────
    console.log(`
${warn()} One manual step required — add the plugin to your config:

  \x1b[1mNuxt\x1b[0m (nuxt.config.ts):
  \x1b[36mmodules: ['@itsogden/css-icons/nuxt']\x1b[0m

  \x1b[1mVite\x1b[0m (vite.config.ts):
  \x1b[36mimport CssIcons from '@itsogden/css-icons/vite'\x1b[0m
  \x1b[36mplugins: [CssIcons()]\x1b[0m

`)

    rl.close()

    // ── Initial build ────────────────────────────────────────────────────────────
    if (fs.existsSync(path.join(cwd, 'css-icons.config.mjs'))) {
        const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout })
        const ans = await new Promise((resolve) => rl2.question(`${info()} Run initial icon build now? (Y/n): `, (a) => { rl2.close(); resolve(a) }))
        if (String(ans).trim().toLowerCase() !== 'n') {
            console.log('\n[css-icons] running initial build...')
            await build()
        }
    }

    console.log(`\n\x1b[1mDone!\x1b[0m Run \x1b[36mpnpm css-icons\x1b[0m to regenerate at any time.\n`)
}

// ─── Build / Watch ────────────────────────────────────────────────────────────

async function loadConfig() {
    const candidates = ['css-icons.config.mjs', 'css-icons.config.js']
    for (const file of candidates) {
        const full = path.join(cwd, file)
        if (fs.existsSync(full)) {
            const mod = await import(pathToFileUrl(full))
            return mod.default || mod
        }
    }
    throw new Error('Could not find css-icons.config.mjs — run `pnpm css-icons init` first')
}

function pathToFileUrl(filePath) {
    let resolved = path.resolve(filePath).replace(/\\/g, '/')
    if (!resolved.startsWith('/')) resolved = '/' + resolved
    return 'file://' + resolved
}

function toPosix(p) { return p.replace(/\\/g, '/') }

function walkSvgFiles(dir, baseDir = dir, out = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walkSvgFiles(full, baseDir, out)
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.svg'))
            out.push(toPosix(path.relative(baseDir, full)))
    }
    return out
}

function svgToDataUri(svg) {
    return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\r?\n|\r/g, ' ').trim())
}

function buildIconRecord(relPath, config) {
    const clean = toPosix(relPath)
    const noExt = clean.replace(/\.svg$/i, '')
    const parts = noExt.split('/').filter(Boolean)
    const fileName = parts.pop()
    const folder = parts[parts.length - 1] || ''
    const stem = fileName
    const isDefault = !!config.defaultFolder && folder === config.defaultFolder
    const icon = isDefault ? stem : (folder ? `${stem}-${folder}` : stem)
    const isBackground = (config.backgroundFolders || []).includes(folder)
    const implClass = folder ? `i-${stem}-${folder}` : `i-${stem}`
    const baseClass = stem
    return { relPath: clean, folder, stem, icon, baseClass, implClass, isBackground }
}

function generateCss(icons, config) {
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

function generateTypes(icons) {
    const typeNames = icons.map((icon) => `  | '${icon.icon}'`).join('\n') || `  | 'error'`
    const entries = icons.map((icon) => {
        const className = `${icon.baseClass} ${icon.implClass}${icon.isBackground ? ' colored' : ''}`
        return `  '${icon.icon}': { icon: '${icon.icon}', folder: '${icon.folder}', className: '${className}' }`
    }).join(',\n')
    return `export type CssIconName =\n${typeNames}\n\nexport const cssIconMap = {\n${entries}\n} as const\n\nexport function getIconClass(name: CssIconName): string {\n  return cssIconMap[name].className\n}\n`
}

function writeFiles(config, css, types, count) {
    const outDir = path.resolve(cwd, config.outDir || './plugins/css-icons')
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'css-icons.css'), css, 'utf8')
    fs.writeFileSync(path.join(outDir, 'css-icons-data.ts'), types, 'utf8')
    console.log(`[css-icons] generated ${count} icons → ${outDir}`)
    return outDir
}

async function build() {
    const config = await loadConfig()
    const iconDir = path.resolve(cwd, config.iconFolder)
    if (!fs.existsSync(iconDir)) throw new Error(`iconFolder does not exist: ${iconDir}`)
    const files = walkSvgFiles(iconDir)
    const icons = files.map((f) => buildIconRecord(f, config)).sort((a, b) => a.icon.localeCompare(b.icon))
    const css = generateCss(icons, config)
    const types = generateTypes(icons)
    writeFiles(config, css, types, icons.length)
}

async function watch() {
    const config = await loadConfig()
    const iconDir = path.resolve(cwd, config.iconFolder)
    let timer = null
    const rerun = () => {
        clearTimeout(timer)
        timer = setTimeout(() => build().catch(console.error), 300)
    }
    await build()
    fs.watch(iconDir, { recursive: true }, (eventType, filename) => {
        if (!filename?.toLowerCase().endsWith('.svg')) return
        rerun()
    })
    console.log('[css-icons] watching for svg changes...')
}

// ─── Entry ────────────────────────────────────────────────────────────────────

if (command === 'init') {
    init().catch((err) => { console.error(err); process.exit(1) })
} else if (command === '--watch') {
    watch().catch((err) => { console.error(err); process.exit(1) })
} else {
    build().catch((err) => { console.error(err); process.exit(1) })
}