import fs from 'fs'
import path from 'path'

// ─── SVG helpers ─────────────────────────────────────────────────────────────

function encodeSvg(svg) {
    return svg
        .replace(/<!--.*?-->/gs, '')
        .replace('<svg', svg.includes('xmlns') ? '<svg' : '<svg xmlns="http://www.w3.org/2000/svg"')
        .replace(/"/g, "'")
        .replace(/%/g, '%25').replace(/#/g, '%23')
        .replace(/{/g, '%7B').replace(/}/g, '%7D')
        .replace(/</g, '%3C').replace(/>/g, '%3E')
        .replace(/\r?\n/g, '')
}

function aspectRatio(svg) {
    const m = svg.match(/viewBox="(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"/)
    if (!m) return 1
    const w = parseFloat(m[3]), h = parseFloat(m[4])
    return h ? w / h : 1
}

// ─── Icon discovery ───────────────────────────────────────────────────────────

function toPosix(p) { return p.replace(/\\/g, '/') }

function walkSvgs(dir, base = dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walkSvgs(full, base, out)
        else if (entry.name.toLowerCase().endsWith('.svg'))
            out.push(toPosix(path.relative(base, full)))
    }
    return out
}

function buildRecord(relPath, config) {
    const noExt = toPosix(relPath).replace(/\.svg$/i, '')
    const parts = noExt.split('/').filter(Boolean)
    const stem = parts.pop()
    const folder = parts[parts.length - 1] ?? ''
    const isDefault = !!config.defaultFolder && folder === config.defaultFolder
    const icon = isDefault ? stem : folder ? `${stem}-${folder}` : stem
    const isBackground = (config.backgroundFolders ?? []).includes(folder)
    const implClass = folder ? `i-${stem}-${folder}` : `i-${stem}`
    return { relPath: toPosix(relPath), folder, stem, icon, implClass, isBackground }
}

export function buildIcons(config, cwd) {
    const dir = path.resolve(cwd, config.iconFolder)
    if (!fs.existsSync(dir)) throw new Error(`[css-icons] iconFolder not found: ${dir}`)
    return walkSvgs(dir)
        .map(f => buildRecord(f, config))
        .sort((a, b) => a.icon.localeCompare(b.icon))
}

// ─── Generators ──────────────────────────────────────────────────────────────

export function generateCss(icons, iconDir) {
    const svgs = new Map(icons.map(i => [i.relPath, fs.readFileSync(path.join(iconDir, i.relPath), 'utf8')]))

    const lines = [
        `.icon {`,
        `  display: inline-flex;`,
        `  justify-content: center;`,
        `  align-items: center;`,
        `  vertical-align: middle;`,
        `  height: 1em;`,
        `}`,
        `.icon::after {`,
        `  content: '';`,
        `  display: block;`,
        `  height: 100%;`,
        `  flex-grow: 1;`,
        `  background-color: currentColor;`,
        `}`,
        `.icon.colored::after { background-color: transparent; }`,
        `.icon.scale-width { height: 100%; }`,
        `.icon.scale-width::after { width: 100%; height: 100%; }`,
        ``,
        `:root {`,
    ]

    for (const icon of icons)
        lines.push(`  --${icon.implClass}: url("data:image/svg+xml;utf8,${encodeSvg(svgs.get(icon.relPath))}");`)

    lines.push(`}`, ``)

    for (const icon of icons) {
        const w = aspectRatio(svgs.get(icon.relPath))
        lines.push(`.${icon.implClass}::after {`, `  width: ${w}em;`)
        if (icon.isBackground)
            lines.push(`  background: var(--${icon.implClass}) no-repeat;`)
        else
            lines.push(`  mask: var(--${icon.implClass}) no-repeat;`, `  -webkit-mask: var(--${icon.implClass}) no-repeat;`)
        lines.push(`}`, ``)
    }

    return lines.join('\n')
}

export function generateTypes(icons) {
    const names = icons.length ? icons.map(i => `  | '${i.icon}'`).join('\n') : `  | string`
    return `export type CssIconName =\n${names}\n`
}

export function generateComponent(icons) {
    const names = icons.length ? icons.map(i => `  | '${i.icon}'`).join('\n') : `  | string`
    const map = icons.map(i => {
        const cls = `${i.stem} ${i.implClass}${i.isBackground ? ' colored' : ''}`
        return `  '${i.icon}': '${cls}'`
    }).join(',\n')

    return `<script setup lang="ts">
type CssIconName =
${names}

const iconMap: Record<CssIconName, string> = {
${map}
}

defineProps<{ icon: CssIconName; useWidth?: boolean }>()
</script>

<template>
  <i :class="['icon', iconMap[icon], useWidth ? 'scale-width' : '']" />
</template>
`
}

// ─── Config loading ───────────────────────────────────────────────────────────

export async function loadConfig(cwd, configPath) {
    const candidates = configPath
        ? [path.resolve(cwd, configPath)]
        : [path.join(cwd, 'css-icons.config.mjs'), path.join(cwd, 'css-icons.config.js')]

    for (const file of candidates) {
        if (fs.existsSync(file)) {
            let url = 'file://' + file.replace(/\\/g, '/')
            if (!url.startsWith('file:///')) url = url.replace('file://', 'file:///')
            const mod = await import(url)
            return mod.default ?? mod
        }
    }

    throw new Error('[css-icons] No config found. Create css-icons.config.mjs in your project root.')
}
