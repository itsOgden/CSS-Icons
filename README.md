# @itsogden/css-icons

Converts a folder of SVGs into a CSS file, a typed Vue component, and a TypeScript type. Icons render via CSS `mask`, so they inherit `color` and work naturally with Tailwind (`text-red-500`, `text-2xl`).

---

## Installation

```bash
pnpm add github:itsOgden/CSS-Icons
```

---

## Nuxt

Add the module to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@itsogden/css-icons/nuxt'],
})
```

Create `css-icons.config.mjs` in your project root:

```js
export default {
  iconFolder: './assets/icons',
  defaultFolder: 'duotone',       // optional — see Icon naming below
  // backgroundFolders: ['colored'],
}
```

That's it. The module:
- Generates CSS and injects it globally
- Auto-registers `<CssIcon>` with your exact icon names as the typed `icon` prop
- Regenerates automatically when SVGs change during dev

---

## Vite

```ts
// vite.config.ts
import CssIcons from '@itsogden/css-icons/vite'

export default {
  plugins: [CssIcons()],
}
```

On startup the plugin writes three files to `src/css-icons/` (configurable via `outDir`):

- `index.css` — import once in your app entry
- `CssIcon.vue` — register globally or import per-component
- `index.d.ts` — exports `CssIconName` if you need the type directly

```ts
// main.ts
import './css-icons/index.css'
import CssIcon from './css-icons/CssIcon.vue'
app.component('CssIcon', CssIcon)
```

---

## CLI

```bash
# generate once
pnpm css-icons

# watch mode
pnpm css-icons --watch

# interactive setup wizard
pnpm css-icons init
```

The CLI writes the same three files as the Vite plugin (`index.css`, `CssIcon.vue`, `index.d.ts`) to `src/css-icons/` by default, or wherever `outDir` is set in your config.

---

## Usage

```html
<CssIcon icon="gear" class="text-2xl text-blue-500" />
```

The `icon` prop is fully typed — your editor autocompletes and errors on unknown names.

### `useWidth` prop

Icons are `1em` tall by default. For non-square icons, add `useWidth` to also set the width from the SVG's viewBox aspect ratio:

```html
<CssIcon icon="arrow-right" useWidth />
```

---

## Config reference

```js
// css-icons.config.mjs
export default {
  iconFolder: './assets/icons',   // required — where your SVGs live
  defaultFolder: 'duotone',       // folder whose suffix is dropped from icon names
  backgroundFolders: ['colored'], // folders that render via background-image (full color)
  outDir: './src/css-icons',      // CLI / Vite output directory
}
```

---

## Icon naming

Icon names come from the file path relative to `iconFolder`.

| File | Default folder: none | Default folder: `duotone` |
|---|---|---|
| `duotone/gear.svg` | `gear-duotone` | `gear` |
| `duotone/arrow-right.svg` | `arrow-right-duotone` | `arrow-right` |
| `colored/logo.svg` | `logo-colored` | `logo-colored` |
| `gear.svg` | `gear` | `gear` |

### Full-color icons

SVGs in `backgroundFolders` render via `background-image` instead of `mask`, preserving their original colors at the cost of not being tintable via `color`.

---

## Package contents

```
generate.mjs  — core logic (shared by all integrations)
nuxt.mjs      — Nuxt module
nuxt.d.ts     — types for nuxt.mjs
vite.mjs      — Vite plugin
vite.d.ts     — types for vite.mjs
index.mjs     — CLI
```
