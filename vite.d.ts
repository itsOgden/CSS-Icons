export interface CssIconsOptions {
    /** Path to config file. Defaults to css-icons.config.mjs in project root. */
    configPath?: string
    /** Where to write generated files. Defaults to src/css-icons/ */
    outDir?: string
}

declare function CssIconsPlugin(options?: CssIconsOptions): {
    name: string
    buildStart(): Promise<void>
    configureServer(server: any): Promise<void>
}

export default CssIconsPlugin
