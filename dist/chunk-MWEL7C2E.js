// unplugin.ts
import { createUnplugin } from "unplugin";
import fs from "fs";
import path from "path";
var VIRTUAL_ID = "virtual:css-icons/data";
var RESOLVED_ID = "\0virtual:css-icons/data";
function toPosix(p) {
  return p.replace(/\\/g, "/");
}
function walkSvgFiles(dir, baseDir = dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSvgFiles(full, baseDir, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".svg"))
      out.push(toPosix(path.relative(baseDir, full)));
  }
  return out;
}
function buildIconRecord(relPath, config) {
  const clean = toPosix(relPath);
  const noExt = clean.replace(/\.svg$/i, "");
  const parts = noExt.split("/").filter(Boolean);
  const fileName = parts.pop();
  const folder = parts[parts.length - 1] || "";
  const stem = fileName;
  const isDefault = !!config.defaultFolder && folder === config.defaultFolder;
  const icon = isDefault ? stem : folder ? `${stem}-${folder}` : stem;
  const isBackground = (config.backgroundFolders || []).includes(folder);
  const implClass = folder ? `i-${stem}-${folder}` : `i-${stem}`;
  const baseClass = stem;
  return { relPath: clean, folder, stem, icon, baseClass, implClass, isBackground };
}
function encodeSvg(svg) {
  return svg.replace(/<!--.*?-->/gs, "").replace("<svg", ~svg.indexOf("xmlns") ? "<svg" : '<svg xmlns="http://www.w3.org/2000/svg"').replace(/"/g, "'").replace(/%/g, "%25").replace(/#/g, "%23").replace(/{/g, "%7B").replace(/}/g, "%7D").replace(/</g, "%3C").replace(/>/g, "%3E").replace(/(\r\n|\n|\r)/g, "");
}
function svgToDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeSvg(svg)}`;
}
function generateVirtualModule(icons) {
  const entries = icons.map((i) => {
    const className = `${i.baseClass} ${i.implClass}${i.isBackground ? " colored" : ""}`;
    return `  '${i.icon}': '${className}'`;
  }).join(",\n");
  return `export const cssIconMap = {
${entries}
}

export function getIconClass(name) {
  return cssIconMap[name]
}
`;
}
function generateTypeDeclaration(icons) {
  const typeNames = icons.map((i) => `  | '${i.icon}'`).join("\n") || `  | 'error'`;
  return `declare module 'virtual:css-icons/data' {
  export type CssIconName =
${typeNames}
  export const cssIconMap: Record<CssIconName, string>
  export function getIconClass(name: CssIconName): string
}
`;
}
function generateComponentWrapper(icons) {
  const typeNames = icons.map((i) => `  | '${i.icon}'`).join("\n") || `  | 'error'`;
  const entries = icons.map((i) => {
    const className = `${i.baseClass} ${i.implClass}${i.isBackground ? " colored" : ""}`;
    return `  '${i.icon}': '${className}'`;
  }).join(",\n");
  return `<script setup lang="ts">
export type CssIconName =
${typeNames}

const cssIconMap: Record<CssIconName, string> = {
${entries}
}

const props = defineProps<{
  icon: CssIconName
  useWidth?: boolean
}>()
</script>

<template>
  <i :class="['icon', cssIconMap[icon], useWidth ? 'scale-width' : '']" />
</template>
`;
}
function getAspectRatio(svg) {
  const match = svg.match(/viewBox="(\d+\s\d+\s\d+\s\d+)"/);
  if (!match) return 1;
  const parts = match[1].split(" ");
  const w = parseFloat(parts[2]);
  const h = parseFloat(parts[3]);
  return h ? w / h : 1;
}
function generateCss(icons, config, cwd) {
  const iconFolder = path.resolve(cwd, config.iconFolder);
  let css = "";
  css += `.icon {
`;
  css += `  display: inline-flex;
`;
  css += `  justify-content: center;
`;
  css += `  align-items: center;
`;
  css += `  vertical-align: middle;
`;
  css += `  height: 1em;
`;
  css += `}
`;
  css += `.icon::after {
`;
  css += `  content: '';
`;
  css += `  display: block;
`;
  css += `  height: 100%;
`;
  css += `  flex-grow: 1;
`;
  css += `  background-color: currentColor;
`;
  css += `}
`;
  css += `.icon.colored::after {
`;
  css += `  background-color: transparent;
`;
  css += `}
`;
  css += `.icon.scale-width {
`;
  css += `  height: 100%;
`;
  css += `}
`;
  css += `.icon.scale-width::after {
`;
  css += `  width: 100%;
`;
  css += `  height: 100%;
`;
  css += `}

`;
  css += `:root {
`;
  for (const icon of icons) {
    const svgPath = path.join(iconFolder, icon.relPath);
    const svg = fs.readFileSync(svgPath, "utf8");
    css += `  --${icon.implClass}: url("${svgToDataUri(svg)}");
`;
  }
  css += `}

`;
  for (const icon of icons) {
    const svgPath = path.join(iconFolder, icon.relPath);
    const svg = fs.readFileSync(svgPath, "utf8");
    const width = `${getAspectRatio(svg)}em`;
    css += `.${icon.implClass}::after {
`;
    css += `  width: ${width};
`;
    if (icon.isBackground) {
      css += `  background: var(--${icon.implClass}) no-repeat;
`;
    } else {
      css += `  mask: var(--${icon.implClass}) no-repeat;
`;
      css += `  -webkit-mask: var(--${icon.implClass}) no-repeat;
`;
    }
    css += `}

`;
  }
  return css;
}
async function loadConfig(cwd, configPath) {
  const candidates = configPath ? [configPath] : [path.join(cwd, "css-icons.config.mjs"), path.join(cwd, "css-icons.config.js")];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      let resolved = path.resolve(file).replace(/\\/g, "/");
      if (!resolved.startsWith("/")) resolved = "/" + resolved;
      const mod = await import("file://" + resolved);
      return mod.default || mod;
    }
  }
  throw new Error("Could not find css-icons.config.mjs \u2014 run `pnpm css-icons init` first");
}
function buildIcons(config, cwd) {
  const iconDir = path.resolve(cwd, config.iconFolder);
  if (!fs.existsSync(iconDir)) throw new Error(`iconFolder does not exist: ${iconDir}`);
  const files = walkSvgFiles(iconDir);
  return files.map((f) => buildIconRecord(f, config)).sort((a, b) => a.icon.localeCompare(b.icon));
}
async function buildIconsFromConfig(cwd, configPath) {
  const config = await loadConfig(cwd, configPath);
  return buildIcons(config, cwd);
}
async function generateCssFromConfig(cwd, configPath) {
  const config = await loadConfig(cwd, configPath);
  const icons = buildIcons(config, cwd);
  return generateCss(icons, config, cwd);
}
var CssIconsPlugin = createUnplugin((options = {}) => {
  const cwd = process.cwd();
  let config;
  let icons;
  let virtualModule;
  async function reload() {
    config = await loadConfig(cwd, options.configPath);
    icons = buildIcons(config, cwd);
    virtualModule = generateVirtualModule(icons);
  }
  return {
    name: "css-icons",
    async buildStart() {
      await reload();
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID) return { code: virtualModule, map: null };
    },
    vite: {
      configureServer(server) {
        const watchDir = config?.iconFolder ? path.resolve(cwd, config.iconFolder) : null;
        if (!watchDir) return;
        server.watcher.add(watchDir);
        server.watcher.on("all", async (event, file) => {
          if (!file.toLowerCase().endsWith(".svg")) return;
          await reload();
          const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
          if (mod) server.moduleGraph.invalidateModule(mod);
          server.ws.send({ type: "full-reload" });
        });
      }
    }
  };
});

export {
  generateTypeDeclaration,
  generateComponentWrapper,
  buildIcons,
  buildIconsFromConfig,
  generateCssFromConfig,
  CssIconsPlugin
};
