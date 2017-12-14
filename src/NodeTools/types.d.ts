interface StringToStringObject {
    [key: string]: string | string[];
}

interface BuildOptions {
    buildOptions: {
        process: 'legacy' | '1.0' | 'core';
        cssTool: 'scss' | 'less';
        entries?: StringToStringObject | string[];
        exports?: StringToStringObject | string[];
    };
    addonKey?: string;
    vanillaDirectory: string;
    rootDirectories?: string[];
    requiredDirectories?: string[];
    watch: boolean;
    verbose: boolean;
}

declare module "fs" {
    export function mount(path: string, fs: any);
    export function unmount(path: string);
}
declare module "mountfs" {
    export function patchInPlace();
}
