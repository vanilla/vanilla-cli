interface StringToStringObject {
    [key: string]: string | string[];
}

interface ICliOptions {
    buildOptions: IBuildProperties;
    addonKey: string;
    vanillaDirectory: string;
    rootDirectories: string[];
    requiredDirectories: string[];
    watch: boolean;
    verbose: boolean;
    hot: boolean;
    hotReloadIP: string;
    section: string;
    enabledAddonKeys: string[];
    skipPrettify: boolean;
}

interface IBuildEntries {
    [section: string]: string;
}

interface IBuildExports {
    [section: string]: string[];
}

interface IBuildProperties {
    process: "core" | "v1" | "1.0" | "legacy";
    cssTool: "less" | "scss";
    entries: IBuildEntries;
    exports: IBuildExports;
}

interface IAddonJson {
    key: string;
    build: IBuildProperties;
    require: {
        [addonName: string]: string;
    };
}

declare module "fs" {
    export function mount(path: string, fs: any);
    export function unmount(path: string);
}
declare module "mountfs" {
    export function patchInPlace();
}

declare module "gulp-livereload" {
    export function listen();
    export function changed(file);
}

declare module "happypack";
declare module "@vanillaforums/babel-preset";
declare module "prettier-webpack-plugin";
declare module "hard-source-webpack-plugin";
declare module "gulp*";
declare module "webpack-stream";
