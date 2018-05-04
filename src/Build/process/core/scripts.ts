/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import path from "path";
import fs from "fs";
import chalk from "chalk";
import glob from "glob";
import webpack, { Configuration, Stats } from "webpack";
import merge from "webpack-merge";

import { createBaseConfig, preprocessWebpackExports, getAliasesForRequirements } from "../../library/webpack-utility";
import { print, printError, fail, getJsonFileForDirectory, camelize } from "../../library/utility";

/**
 * Run the javascript build process.
 *
 * @param options
 */
export default async function run(options: ICliOptions) {
    try {
        const primaryDirectory = options.rootDirectories.slice(0, 1)[0];

        const exportsConfig = await createExportConfigs(primaryDirectory, options);

        if (exportsConfig) {
            for (const config of exportsConfig) {
                await runSingleWebpackConfig(config, options);
            }
        }

        // The entries config MUST be created after the first process has completed
        // or it will not be able to build against it.
        const entriesConfig = await createEntriesConfig(primaryDirectory, options);

        if (entriesConfig) {
            for (const config of entriesConfig) {
                await runSingleWebpackConfig(config, options);
            }
        }
    } catch (err) {
        printError(err);
    }
}

/**
 * Get the contents of all manifest files in a directory.
 *
 * @param directory - The directory search through.
 * @throws If an error is encountered while looking for files.
 */
function getManifestPathsForDirectory(directory: string): string[] {
    try {
        return glob.sync(path.join(directory, "manifests/**/*-manifest.json"));
    } catch (err) {
        printError(`There was an error searching for manifest files.

        ${err}`);
    }

    return [];
}

/**
 * Create export configuration for webpack.
 *
 * This configuration is builds all files defined in `addonJson.build.exports`.
 * It never runs in watch mode. If a file has both entries and exports the
 * exports must be run first.
 *
 * @param primaryDirectory - The main addon directory.
 * @param options - The options passed from the PHP process.
 */
function createExportConfigs(primaryDirectory: string, options: ICliOptions): Configuration[] {
    const baseConfig = createBaseConfig(primaryDirectory, options);
    let { exports } = options.buildOptions;

    if (!isValidEntryPoint(exports)) {
        return [];
    }

    exports = preprocessWebpackExports(exports!, primaryDirectory);

    // Remove this addon's libraries so it doesn't build it's own exports against it's own exports
    const self = options.rootDirectories[0];
    const directories = options.requiredDirectories;
    if (options.requiredDirectories.includes(self)) {
        const index = options.requiredDirectories.indexOf(self);
        directories.splice(index, 1);
    }

    const configs = Object.keys(exports).map(exportKey => {
        const entry = {
            [exportKey]: exports[exportKey],
        };

        const libraryName = "lib_" + camelize(options.addonKey) + "_" + camelize(exportKey);
        const config = merge(baseConfig, {
            entry,
            output: {
                path: path.join(primaryDirectory, "js"),
                filename: `[name]/lib-${options.addonKey}-[name].min.js`,
                chunkFilename: `chunk/[name]-${exportKey}.min.js`,
                publicPath: getChunkPublicPath(options),
                library: libraryName,
            },
            resolve: {
                alias: getAliasesForRequirements(options),
            },
            plugins: [
                ...getDllPLuginsForAddonDirectories(directories, exportKey, options),
                new webpack.DllPlugin({
                    context: options.vanillaDirectory,
                    path: path.join(primaryDirectory, "manifests/[name]-manifest.json"),
                    name: libraryName,
                }),
            ],
        });

        config.resolve!.modules!.unshift(
            path.resolve(options.vanillaDirectory, "node_modules"),
            path.resolve(options.vanillaDirectory, "applications/dashboard/node_modules"),
            path.resolve(options.vanillaDirectory, "applications/vanilla/node_modules"),
        );

        return config;
    });

    return configs;
}

/**
 * Validate an entry point.
 */
function isValidEntryPoint(entry: IBuildEntries | IBuildExports) {
    if (Array.isArray(entry) && entry.length > 0) {
        return true;
    }
    if (entry instanceof Object && Object.keys(entry).length > 0) {
        return true;
    }
    return false;
}

/**
 * Create entries configuration for webpack.
 *
 * This configuration is builds all files defined in `addonJson.build.entries`.
 * If a file has both entries and exports the exports must be run first.
 *
 * @param primaryDirectory - The main addon directory.
 * @param options - The options passed from the PHP process.
 */
function createEntriesConfig(primaryDirectory: string, options: ICliOptions): Configuration[] {
    const baseConfig = createBaseConfig(primaryDirectory, options);
    const { entries } = options.buildOptions;
    const directories = [...options.requiredDirectories, ...options.rootDirectories];

    if (!isValidEntryPoint(entries)) {
        return [];
    }

    const configs = Object.keys(entries).map(entryKey => {
        const entry = {
            [entryKey]: entries[entryKey],
        };

        const outputFolder = entryKey.replace("bootstrap-", "");

        // @ts-ignore
        const config = merge(baseConfig, {
            entry,
            output: {
                path: path.join(primaryDirectory, "js"),
                filename: `${outputFolder}/${options.addonKey}-[name].min.js`,
                publicPath: getChunkPublicPath(options),
                chunkFilename: `chunk/[name]-${entryKey}.min.js`,
                library: camelize(options.addonKey) + "_" + camelize(entryKey), // Needed to allow multiple webpack builds in one page.
            },
            resolve: {
                alias: getAliasesForRequirements(options),
            },
            plugins: getDllPLuginsForAddonDirectories(directories, entryKey, options),
        });

        config.resolve!.modules!.unshift(
            path.resolve(options.vanillaDirectory, "node_modules"),
            path.resolve(options.vanillaDirectory, "applications/dashboard/node_modules"),
            path.resolve(options.vanillaDirectory, "applications/vanilla/node_modules"),
        );

        return config;
    });

    return configs;
}

/**
 * Determine if the addon uses the core build process.
 */
function addonUsesCoreBuildProcess(directory: string) {
    const addonJson = getJsonFileForDirectory(directory, "addon");
    if (addonJson && addonJson.build && addonJson.build.process === "core") {
        return directory;
    }
}

/**
 * Get the base path for the requiring dynamic chunks.
 *
 * @param options
 */
<<<<<<< HEAD:src/NodeTools/BuildProcess/core/build-scripts.js
function getChunkPublicPath(options) {
=======
function getChunkPublicPath(options: ICliOptions) {
    const { addonKey } = options;
    const basePath = addonKey === "core" ? "" : `themes/${addonKey}/`;

>>>>>>> Convert to typescript:src/Build/process/core/scripts.ts
    return getPathFromVanillaRoot(options) + `js/`;
}

/**
 * Get the base path for the requiring dynamic chunks.
 */
<<<<<<< HEAD:src/NodeTools/BuildProcess/core/build-scripts.js
function getPathFromVanillaRoot(options) {
    const { rootDirectories, vanillaDirectory } = options;
    const root = rootDirectories[0].replace(vanillaDirectory, '/').replace("//", "/");
=======
function getPathFromVanillaRoot(options: ICliOptions) {
    const { addonKey, rootDirectories, vanillaDirectory } = options;
    const root = rootDirectories[0].replace(vanillaDirectory, "/").replace("//", "/");
>>>>>>> Convert to typescript:src/Build/process/core/scripts.ts
    if (root.endsWith("/")) {
        return root;
    } else {
        return root + "/";
    }
}

/**
 * Filter manifests so that only manifests that much the current section are used.
 *
 * eg.
 * app => app-manifest.json
 * admin => admin-manifest.json
 *
 * The exception here is the bootstrap file which should more loosely match the manifest name.
 *
 * bootstrap-app => app-manifest.json
 * bootstrap-admin => admin-manifest.json
 *
 * @param entryKey - The entry key to filter by.
 */
function filterManifestPathsByEntryKey(entryKey: string) {
    return function filterManifests(manifestPath: string) {
        const manifestName = path.basename(manifestPath);
        const lookupKey = entryKey.replace("bootstrap", "").replace("-", "");

        return manifestName.includes(lookupKey);
    };
}

/**
 * Generate DLL Plugins for any required addons and it self.
 *
 * @param directories - The directories to generate DLL plugins for.
 * @param entryKey - The entryKey to filter the results with.
 * @param options
 */
function getDllPLuginsForAddonDirectories(directories: string[], entryKey: string, options: ICliOptions) {
    return directories
        .filter(addonUsesCoreBuildProcess)
        .map(getManifestPathsForDirectory)
        .reduce((accumulator: string[], manifests: string[]) => accumulator.concat(manifests), [])
        .filter(filterManifestPathsByEntryKey(entryKey))
        .map(manifest => {
            return new webpack.DllReferencePlugin({
                context: options.vanillaDirectory,
                manifest: require(manifest),
            });
        });
}

/**
 * Run a single webpack config.
 *
 * @param config - A valid webpack config.
 * @param options - Whether or not to run in watch mode.
 *
 * @returns {Promise<void>}
 */
function runSingleWebpackConfig(config: Configuration, options: ICliOptions) {
    return new Promise((resolve, reject) => {
        const compiler = webpack(config);

        const executionFunction = options.watch ? compiler.watch.bind(compiler, {}) : compiler.run.bind(compiler);

        executionFunction((err: Error, stats: Stats) => {
            if (err) {
                reject("The build encountered an error:" + err);
            }

            print(
                stats.toString({
                    chunks: false, // Makes the build much quieter
                    modules: options.verbose || false,
                    colors: true, // Shows colors in the console
                }),
            );

            resolve();
        });
    });
}
