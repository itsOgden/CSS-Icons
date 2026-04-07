#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { loadConfig, buildIcons, generateCss, generateTypes, generateComponent } from './generate.mjs'

const cwd = process.cwd()
const command = process.argv[2]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prompt(rl, question) {
    return new Promise(resolve => rl.question(question, resolve))
}

const CHECK = '\x1b[32m✔\x1b[0m'
const WARN  = '\x1b[33m!\x1b[0m'
const INFO  = '\x1b[36mℹ\x1b[0m'

// ─── Init ────────────────────────────────────────────────────────────────────

async function init() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    console.log('\n\x1b[1m@itsogden/css-icons setup\x1b[0m\n')

    const configPath = path.join(cwd, 'css-icons.config.mjs')
    if (fs.existsSync(configPath)) {
        console.log(`${CHECK} css-icons.config.mjs already exists, skipping.`)
    } else {
        const ans = await prompt(rl, `${INFO} Create css-icons.config.mjs? (Y/n): `)
        if (ans.trim().toLowerCase() !== 'n') {
            const iconFolder   = await prompt(rl, `${INFO} Icon folder path (default: ./assets/icons): `)
            const defaultFolder = await prompt(rl, `${INFO} Default folder name, omitted from icon names (leave blank for none): `)
            fs.writeFileSync(configPath, `export default {\n  iconFolder: '${iconFolder.trim() || './assets/icons'}',\n  ${defaultFolder.trim() ? `defaultFolder: '${defaultFolder.trim()}',` : `// defaultFolder: 'duotone',`}\n}\n`)
            console.log(`${CHECK} Created css-icons.config.mjs`)
        } else {
            console.log(`${WARN} Skipped — create css-icons.config.mjs manually.`)
        }
    }

    const pkgPath = path.join(cwd, 'package.json')
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
        pkg.scripts = pkg.scripts || {}
        if (pkg.scripts['css-icons']) {
            console.log(`${CHECK} "css-icons" script already exists, skipping.`)
        } else {
            const ans = await prompt(rl, `${INFO} Add "css-icons" script to package.json? (Y/n): `)
            if (ans.trim().toLowerCase() !== 'n') {
                pkg.scripts['css-icons'] = 'css-icons'
                fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
                console.log(`${CHECK} Added "css-icons" script`)
            }
        }
    }

    console.log(`
${WARN} One manual step — add the plugin to your config:

  \x1b[1mNuxt\x1b[0m (nuxt.config.ts):
  \x1b[36mmodules: ['@itsogden/css-icons/nuxt']\x1b[0m

  \x1b[1mVite\x1b[0m (vite.config.ts):
  \x1b[36mimport CssIcons from '@itsogden/css-icons/vite'\x1b[0m
  \x1b[36mplugins: [CssIcons()]\x1b[0m
`)

    rl.close()

    if (fs.existsSync(configPath)) {
        const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout })
        const ans = await new Promise(resolve => rl2.question(`${INFO} Run initial build now? (Y/n): `, a => { rl2.close(); resolve(a) }))
        if (String(ans).trim().toLowerCase() !== 'n') await build()
    }

    console.log(`\n\x1b[1mDone!\x1b[0m\n`)
}

// ─── Build ────────────────────────────────────────────────────────────────────

async function build() {
    const config = await loadConfig(cwd)
    const icons = buildIcons(config, cwd)
    const iconDir = path.resolve(cwd, config.iconFolder)
    const outDir = path.resolve(cwd, config.outDir ?? './src/css-icons')
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(path.join(outDir, 'index.css'), generateCss(icons, iconDir))
    fs.writeFileSync(path.join(outDir, 'CssIcon.vue'), generateComponent(icons))
    fs.writeFileSync(path.join(outDir, 'index.d.ts'), generateTypes(icons))
    console.log(`[css-icons] ${icons.length} icons → ${outDir}`)
}

// ─── Watch ────────────────────────────────────────────────────────────────────

async function watch() {
    await build()
    const config = await loadConfig(cwd)
    const iconDir = path.resolve(cwd, config.iconFolder)
    let timer = null
    fs.watch(iconDir, { recursive: true }, (_, filename) => {
        if (!filename?.toLowerCase().endsWith('.svg')) return
        clearTimeout(timer)
        timer = setTimeout(() => build().catch(console.error), 300)
    })
    console.log('[css-icons] watching...')
}

// ─── Entry ────────────────────────────────────────────────────────────────────

if (command === 'init')      init().catch(e => { console.error(e.message); process.exit(1) })
else if (command === '--watch') watch().catch(e => { console.error(e.message); process.exit(1) })
else                         build().catch(e => { console.error(e.message); process.exit(1) })
