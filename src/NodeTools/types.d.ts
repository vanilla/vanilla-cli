interface StringToStringObject {
    [key: string]: string | string[];
}

interface BuildOptions {
    buildOptions: {
        process: 'legacy' | '1.0' | 'core';
        cssTool: 'scss' | 'less';
        entries?: StringToStringObject;
        exports?: StringToStringObject;
    };
    addonKey?: string;
    vanillaDirectory: string;
    rootDirectories?: string[];
    requiredDirectories?: string[];
    watch: boolean;
    verbose: boolean;
    hot: boolean;
    section: string;
    analyze: boolean;
    enabledAddonKeys: string[];
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
