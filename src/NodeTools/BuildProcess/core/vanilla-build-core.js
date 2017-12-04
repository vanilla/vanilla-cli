/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const fs = require("fs");
const argv = require("yargs").argv;
const chalk = require("chalk").default;
const webpack = require("webpack");
const glob = require("glob");
const merge = require("webpack-merge");
const { createBaseConfig, createWebpackAliasesForDirectory } = require("../../library/webpack");

const {
    print,
    printError,
    printVerbose,
    spawnChildProcess,
    getJsonFileForDirectory,
    sleep,
} = require("../../library/utility");

/**
 * @var Object The options passed from the PHP process.
 *
 * - buildOptions - The configuration options.
 * - rootDirectories - The directories to search through for src files.
 * - requiredDirectories - The directories of any required addons.
 * - watch - Should this be in watch mode.
 * - verbose - Display verbose output.
 */
const options = JSON.parse(argv.options);

// Set the verbose option globally.
// @ts-ignore
global.verbose = options.verbose;

const vanillaDirectory = options.vanillaDirectory;
let primaryDirectory = options.rootDirectories.slice(0, 1)[0];
const parentDirectories = options.rootDirectories.slice(1, options.rootDirectories.length);

// Validate Build Directory
if (!primaryDirectory.includes(vanillaDirectory)) {
    printError("Unable to automatically locate your addon inside your Vanilla Installation.");
    printError("Try running the tool in its symlinked location in your Vanilla installation.");
    process.exit(1);
}

print(`Starting build process ${chalk.green("v2")} for addon at ${chalk.yellow(primaryDirectory)}.`);
parentDirectories.forEach(parent => {
    print(`Parent addon found at ${chalk.yellow(parent)}.`);
});
print("");

const originalDir = process.cwd();

// Make sure dependancies are all installed
console.log("Verifying node_module installation.");
installNodeModules()
    .then(() => print(chalk.green("Node modules verified.")))
    .catch(handleNodeModuleError)
    .then(runAllValidWebpackConfigs)
    .catch(printError);

async function installNodeModules() {
    for (const dir of options.rootDirectories) {
        process.chdir(dir);
        await spawnChildProcess("yarn", ["install"], {});
    }

    process.chdir(originalDir);
}

function handleNodeModuleError(err) {
    printError(`
Node module installation failed.
    ${err}`);
}

/**
 * Get the contents of all manifest files in a directory.
 *
 * @param {string} directory - The directory search through.
 */
function getManifestPathsForDirectory(directory) {
    return new Promise(fulfill => {
        glob(path.join(directory, "**/*.export-manifest.json"), (err, filePaths) => {
            if (err) {
                printError(`There was an error searching for manifest files.

                ${err}`);
            }

            fulfill(filePaths);
        });
    });
}

function getNamespaceFromManifestFile(filePath) {
    const fileName = path.basename(filePath).replace(".export-manifest.json", "");
    return "@" + fileName;
}

/**
 * Validate an entry point.
 *
 * @param {any} entry
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
 * Create export configuration for webpack.
 *
 * This configuration is builds all files defined in `addonJson.build.exports`.
 * It never runs in watch mode. If a file has both entries and exports the
 * exports must be run first.
 */
async function createExportsConfig() {
    const baseConfig = createBaseConfig(primaryDirectory, false, false);
    const { exports } = options.buildOptions;

    if (!isValidEntryPoint(exports)) {
        return;
    }

    return merge(baseConfig, {
        entry: exports,
        output: {
            path: path.resolve(primaryDirectory, "js"),
            filename: "lib.[name].js",
            library: "[hash]"
        },
        plugins: [
            new webpack.DllPlugin({
                context: vanillaDirectory,
                path: path.join(primaryDirectory, "manifests/[name].export-manifest.json"),
                name: "[hash]"
            })
        ]
    });
}

/**
 * Create entries configuration for webpack.
 *
 * This configuration is builds all files defined in `addonJson.build.entries`.
 * If a file has both entries and exports the exports must be run first.
 *
 * @return {Promise<?Object>} - A webpack config or undefined if their were no entries.
 */
async function createEntriesConfig() {
    const baseConfig = createBaseConfig(primaryDirectory, options.watch, false);
    const { entries } = options.buildOptions;

    if (!isValidEntryPoint(entries)) {
        return;
    }

    const dllPlugins = [];
    let aliases = {};

    for (let directory of options.requiredDirectories) {
        const manifestPaths = await getManifestPathsForDirectory(directory);

        manifestPaths.forEach(manifest => {
            const plugin = new webpack.DllReferencePlugin({
                context: vanillaDirectory,
                manifest: require(manifest)
            });

            dllPlugins.push(plugin);
        });

        // Put together the aliases
        const partialAliases = createWebpackAliasesForDirectory(directory);

        aliases = {
            ...aliases,
            ...partialAliases
        };
    }

    printVerbose("Using aliases:\n" + JSON.stringify(aliases));

    return merge(baseConfig, {
        entry: entries,
        output: {
            path: path.join(primaryDirectory, "js"),
            filename: "[name]"
        },
        resolve: {
            alias: aliases
        },
        plugins: dllPlugins
    });
}

/**
 * Run a single webpack config.
 *
 * @param {Object} config - A valid webpack config.
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

/**
 * Create and run the the webpack configuration
 */
async function runAllValidWebpackConfigs() {
    const exportsConfig = await createExportsConfig();

    if (exportsConfig) {
        await runSingleWebpackConfig(exportsConfig);
    }

    // The entries config MUST be created after the first process has completed
    // or it will not be able to build against it.
    const entriesConfig = await createEntriesConfig();

    if (entriesConfig) {
        await runSingleWebpackConfig(entriesConfig);
    }
}
