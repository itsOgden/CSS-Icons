import {
  CssIconsPlugin,
  buildIconsFromConfig,
  generateComponentWrapper,
  generateCssFromConfig,
  generateTypeDeclaration
} from "./chunk-MWEL7C2E.js";

// nuxt.ts
import { defineNuxtModule, addComponent, addTypeTemplate } from "@nuxt/kit";
import fs from "fs";
import path from "path";
var nuxt_default = defineNuxtModule({
  meta: {
    name: "@itsogden/css-icons",
    configKey: "cssIcons"
  },
  async setup(options, nuxt) {
    const cwd = nuxt.options.rootDir;
    nuxt.hook("vite:extendConfig", (config) => {
      config.plugins = config.plugins || [];
      config.plugins.push(CssIconsPlugin.vite(options));
    });
    const cssOutPath = path.join(cwd, ".nuxt", "css-icons.css");
    nuxt.hook("build:before", async () => {
      const css = await generateCssFromConfig(cwd, options.configPath);
      fs.mkdirSync(path.dirname(cssOutPath), { recursive: true });
      fs.writeFileSync(cssOutPath, css, "utf8");
    });
    nuxt.options.css.push(cssOutPath);
    const icons = await buildIconsFromConfig(cwd, options.configPath);
    addTypeTemplate({
      filename: "types/css-icons.d.ts",
      getContents: () => generateTypeDeclaration(icons)
    });
    const componentPath = path.join(cwd, ".nuxt", "css-icons-component.vue");
    fs.mkdirSync(path.dirname(componentPath), { recursive: true });
    fs.writeFileSync(componentPath, generateComponentWrapper(icons), "utf8");
    addComponent({
      name: "CssIcon",
      filePath: componentPath
    });
  }
});
export {
  nuxt_default as default
};
