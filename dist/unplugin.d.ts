import * as unplugin from 'unplugin';

interface CssIconsOptions {
    configPath?: string;
}
interface IconConfig {
    iconFolder: string;
    defaultFolder?: string;
    backgroundFolders?: string[];
    outDir?: string;
}
interface IconRecord {
    relPath: string;
    folder: string;
    stem: string;
    icon: string;
    baseClass: string;
    implClass: string;
    isBackground: boolean;
}
declare function generateTypeDeclaration(icons: IconRecord[]): string;
declare function generateComponentWrapper(icons: IconRecord[]): string;
declare function buildIcons(config: IconConfig, cwd: string): IconRecord[];
declare function buildIconsFromConfig(cwd: string, configPath?: string): Promise<IconRecord[]>;
declare function generateCssFromConfig(cwd: string, configPath?: string): Promise<string>;
declare const CssIconsPlugin: unplugin.UnpluginInstance<CssIconsOptions, boolean>;

export { type CssIconsOptions, CssIconsPlugin, buildIcons, buildIconsFromConfig, generateComponentWrapper, generateCssFromConfig, generateTypeDeclaration };
