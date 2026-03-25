declare module 'virtual:css-icons/data' {
    export type CssIconName = string
    export const cssIconMap: Record<string, string>
    export function getIconClass(name: CssIconName): string
}

declare module 'virtual:css-icons/styles' {
    const css: string
    export default css
}