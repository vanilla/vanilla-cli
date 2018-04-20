/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const fs = require("fs");
const chalk = require("chalk").default;
const glob = require("glob");
const webpack = require("webpack");
const merge = require("webpack-merge");

const {
    createBaseConfig,
    preprocessWebpackExports,
    getAliasesForRequirements,
} = require("../../library/webpack-utility");
const {
    print,
    printError,
    fail,
    getJsonFileForDirectory,
    camelize
} = require("../../library/utility");

// EXPORTS
module.exports = {
    run,
    getManifestPathsForDirectory,
    isValidEntryPoint,
};

/**
 * Run the javascript build process.
 *
 * @param {BuildOptions} options
 */
async function run(options) {
    try {
        let primaryDirectory = options.rootDirectories.slice(0, 1)[0];

        const exportsConfig = await createExportsConfig(primaryDirectory, options);

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
 * @param {string} directory - The directory search through.
 *
 * @return {string[]}
 */
function getManifestPathsForDirectory(directory) {
    try {
        return glob.sync(path.join(directory, "manifests/**/*-manifest.json"));
    } catch (err) {
        printError(`There was an error searching for manifest files.

        ${err}`);
    }
}

/**
 * Create export configuration for webpack.
 *
 * This configuration is builds all files defined in `addonJson.build.exports`.
 * It never runs in watch mode. If a file has both entries and exports the
 * exports must be run first.
 *
 * @param {string} primaryDirectory - The main addon directory.
 * @param {BuildOptions} options - The options passed from the PHP process.
 *
 * @return {Promise<Object>} - A webpack config
 */
async function createExportsConfig(primaryDirectory, options) {
    const baseConfig = createBaseConfig(primaryDirectory, options);
    let { exports } = options.buildOptions;

    if (!isValidEntryPoint(exports)) {
        return;
    }

    exports = preprocessWebpackExports(exports);

    // Remove this addon's libraries so it doesn't build it's own exports against it's own exports
    const self = options.rootDirectories[0];
    let directories = options.requiredDirectories;
    if (options.requiredDirectories.includes(self)) {
        const index = options.requiredDirectories.indexOf(self);
        directories.splice(index, 1);
    }

    const configs = Object.keys(exports).map((exportKey) => {
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
                library: libraryName
            },
            resolve: {
                alias: getAliasesForRequirements(options)
            },
            plugins: [
                ...getDllPLuginsForAddonDirectories(directories, exportKey, options),
                new webpack.DllPlugin({
                    context: options.vanillaDirectory,
                    path: path.join(primaryDirectory, "manifests/[name]-manifest.json"),
                    name: libraryName
                })
            ]
        });

        config.resolve.modules.unshift(
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
 *
 * @param {any} entry
 *
 * @returns {boolean}
 */
function isValidEntryPoint(entry) {
    if (entry instanceof Array && entry.length > 0) {
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
 * @param {string} primaryDirectory - The main addon directory.
 * @param {BuildOptions} options - The options passed from the PHP process.
 *
 * @return {Promise<?Object>} - A webpack config or undefined if their were no entries.
 */
async function createEntriesConfig(primaryDirectory, options) {
    const baseConfig = createBaseConfig(primaryDirectory, options);
    const { entries } = options.buildOptions;
    const directories = [
        ...options.requiredDirectories,
        ...options.rootDirectories,
    ];

    if (!isValidEntryPoint(entries)) {
        return;
    }

    const configs = Object.keys(entries).map((entryKey) => {
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

        config.resolve.modules.unshift(
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
 *
 * @param {string} directory
 */
function addonUsesCoreBuildProcess(directory) {
    const addonJson = getJsonFileForDirectory(directory, "addon");
    if (addonJson && addonJson.build && addonJson.build.process === "core") {
        return directory;
    }
}

/**
 * Get the base path for the requiring dynamic chunks.
 *
 * @param {BuildOptions} options
 */
function getChunkPublicPath(options) {
    const { addonKey } = options;
    let basePath = (addonKey === "core") ? "" : `themes/${addonKey}/`;

    const path = getPathFromVanillaRoot(options) + `js/`
    return path;
}

/**
 * Get the base path for the requiring dynamic chunks.
 *
 * @param {BuildOptions} options
 */
function getPathFromVanillaRoot(options) {
    const { addonKey, rootDirectories, vanillaDirectory } = options;
    const root = rootDirectories[0].replace(vanillaDirectory, '/').replace("//", "/");
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
 * @param {string} entryKey - The entry key to filter by.
 */
function filterManifestPathsByEntryKey(entryKey) {
    return function filterManifests(manifestPath) {
        const manifestName = path.basename(manifestPath);
        const lookupKey = entryKey.replace("bootstrap", "").replace("-", "");

        return manifestName.includes(lookupKey);
    }
}

/**
 * Generate DLL Plugins for any required addons and it self.
 *
 * @param {string[]} directories - The directories to generate DLL plugins for.
 * @param {string} entryKey - The entryKey to filter the results with.
 * @param {BuildOptions} options
 */
function getDllPLuginsForAddonDirectories(directories, entryKey, options) {
    return directories
        .filter(addonUsesCoreBuildProcess)
        .map(getManifestPathsForDirectory)
        .reduce((result, manifests) => {
            return [
                ...result,
                ...manifests,
            ];
        }, [])
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
 * @param {Object} config - A valid webpack config.
 * @param {BuildOptions} options - Whether or not to run in watch mode.
 *
 * @returns {Promise<void>}
 */
function runSingleWebpackConfig(config, options) {
    return new Promise((resolve, reject) => {
        const compiler = webpack(config);

        const executionFunction = options.watch ? compiler.watch.bind(compiler, {}) : compiler.run.bind(compiler);

        executionFunction((err, stats) => {
            if (err) {
                reject("The build encountered an error:" + err);
            }

            print(
                stats.toString({
                    chunks: false, // Makes the build much quieter
                    modules: options.verbose || false,
                    colors: true, // Shows colors in the console
                })
            );

            resolve();
        });
    })
}
