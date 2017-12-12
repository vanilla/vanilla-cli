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

const { createBaseConfig, createWebpackAliasesForDirectory } = require("../../library/webpack-utility");
const {
    print,
    printError,
    printVerbose,
    spawnChildProcess,
    getJsonFileForDirectory,
    sleep
} = require("../../library/utility");

// EXPORTS
module.exports = {
    run,
    getManifestPathsForDirectory,
    createExportsConfig,
    isValidEntryPoint,
    createEntriesConfig,
    runSingleWebpackConfig
};

/**
 * Run the javascript build process.
 *
 * @param {BuildOptions} options
 */
async function run(options) {
    const { vanillaDirectory } = options;
    let primaryDirectory = options.rootDirectories.slice(0, 1)[0];

    const exportsConfig = await createExportsConfig(primaryDirectory, options);

    if (exportsConfig) {
        await runSingleWebpackConfig(exportsConfig);
    }

    // The entries config MUST be created after the first process has completed
    // or it will not be able to build against it.
    const entriesConfig = await createEntriesConfig(primaryDirectory, options);

    if (entriesConfig) {
        await runSingleWebpackConfig(entriesConfig);
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
        return glob.sync(path.join(directory, "**/*-manifest.json"));
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
    const baseConfig = createBaseConfig(primaryDirectory, false, false);
    const { exports } = options.buildOptions;

    if (!isValidEntryPoint(exports)) {
        return;
    }

    // The hashes here need to have quotes, or they won't be able to be uglified
    const config = merge(baseConfig, {
        entry: exports,
        output: {
            path: path.join(primaryDirectory, "js"),
            filename: `lib-${options.addonKey}-[name].js`,
            library: "lib_[hash]"
        },
        resolve: {
            alias: getAliasesForRequirements(options)
        },
        plugins: [
            ...getDllPluginsForRequirements(options),
            new webpack.DllPlugin({
                context: options.vanillaDirectory,
                path: path.join(primaryDirectory, "manifests/[name]-manifest.json"),
                name: "lib_[hash]"
            })
        ]
    });

    // console.log(require('util').inspect(config, false, null));
    return config;
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
    const baseConfig = createBaseConfig(primaryDirectory, options.watch);
    const { entries } = options.buildOptions;

    if (!isValidEntryPoint(entries)) {
        return;
    }

    // @ts-ignore
    return merge(baseConfig, {
        entry: entries,
        output: {
            path: path.join(primaryDirectory, "js"),
            filename: `${options.addonKey}-[name].js`
        },
        resolve: {
            alias: getAliasesForRequirements(options)
        },
        plugins: getDllPluginsForRequirements(options)
    });
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
 * Generate aliases for any required addons.
 *
 * @param {BuildOptions} options
 */
function getAliasesForRequirements(options) {
    const result = options.requiredDirectories
        .filter(addonUsesCoreBuildProcess)
        .reduce((aliases, directory) => {
            const partialAliases = createWebpackAliasesForDirectory(directory);

            return {
                ...aliases,
                ...partialAliases
            };
        }, {});

    printVerbose("Using aliases:\n" + JSON.stringify(result));
    return result;
}

/**
 * Generate DLL Plugins for any required addons.
 *
 * @param {BuildOptions} options
 */
function getDllPluginsForRequirements(options) {
    return options.requiredDirectories
        .filter(addonUsesCoreBuildProcess)
        .map(getManifestPathsForDirectory)
        .reduce((result, manifests) => {
            return [
                ...result,
                ...manifests,
            ]
        }, [])
        .map(manifest => {
            return new webpack.DllReferencePlugin({
                context: options.vanillaDirectory,
                manifest: require(manifest)
            });
        });
}

/**
 * Run a single webpack config.
 *
 * @param {Object} config - A valid webpack config.
 *
 * @returns {Promise<void>}
 */
function runSingleWebpackConfig(config) {
    return new Promise((resolve, reject) => {
        const compiler = webpack(config);
        compiler.run((err, stats) => {
            if (err) {
                reject("The build encountered an error:" + err);
            }

            print(
                stats.toString({
                    chunks: false, // Makes the build much quieter
                    colors: true // Shows colors in the console
                })
            );
            resolve();
        });
    });
}
