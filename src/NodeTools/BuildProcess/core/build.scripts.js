const path = require("path");
const fs = require("fs");
const chalk = require("chalk").default;
const glob = require("glob");
const webpack = require("webpack");
const merge = require("webpack-merge");

const { createBaseConfig, createWebpackAliasesForDirectory } = require("../../library/webpack");
const {
    print,
    printError,
    printVerbose,
    spawnChildProcess,
    getJsonFileForDirectory,
    sleep
} = require("../../library/utility");

/**
 * @param {BuildOptions} options - The options passed from the PHP process.
 */
module.exports = async function runBuild(options) {
    const { vanillaDirectory } = options;
    let primaryDirectory = resolvePrimaryDirectory(options);
    const parentDirectories = options.rootDirectories.slice(1, options.rootDirectories.length);

    print(`Starting build process ${chalk.green("v2")} for addon at ${chalk.yellow(primaryDirectory)}.`);
    parentDirectories.forEach(parent => {
        print(`Parent addon found at ${chalk.yellow(parent)}.`);
    });
    print("");

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
};

/**
 * Attempt to resolve the primary addon directory inside of the Vanilla directory.
 *
 * This is because we need a path inside of Vanilla, but some shells like fish automatically
 * resolve symlinks. Many addons are symlinked into a vanilla for installation.
 *
 * @param {BuildOptions} options - The passed options
 *
 * @returns {string} The primary directory
 */
function resolvePrimaryDirectory(options) {
    const { buildOptions, rootDirectories, vanillaDirectory } = options;
    let givenDirectory = options.rootDirectories.slice(0, 1)[0];

    if (givenDirectory.includes(vanillaDirectory)) {
        return givenDirectory;
    }

    const addonKey = path.basename(givenDirectory);
    const addonPath = path.join(vanillaDirectory, "addons", addonKey);
    const themePath = path.join(vanillaDirectory, "themes", addonKey);
    const applicationPath = path.join(vanillaDirectory, "applications", addonKey);

    if (fs.existsSync(applicationPath)) {
        return applicationPath;
    } else if (fs.existsSync(addonPath)) {
        return addonPath;
    } else if (fs.existsSync(themePath)) {
        return themePath;
    } else {
        printError("Unable to automatically locate your addon inside your Vanilla Installation.");
        printError("Make sure your addon is symlinked into you the passed provided vanilla installation.");
        print(chalk.yellowBright(vanillaDirectory));
        printError(
            `You change this by passing a different '--vanillasrc' parameter or by setting the ${chalk.white(
                "VANILLACLI_VANILLA_SRC_DIR"
            )} in your environment.`
        );
        process.exit(1);
    }
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

/**
 * Create export configuration for webpack.
 *
 * @param {string} primaryDirectory - The main addon directory.
 * @param {BuildOptions} options - The options passed from the PHP process.
 *
 * This configuration is builds all files defined in `addonJson.build.exports`.
 * It never runs in watch mode. If a file has both entries and exports the
 * exports must be run first.
 */
async function createExportsConfig(primaryDirectory, options) {
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
                context: options.vanillaDirectory,
                path: path.join(primaryDirectory, "manifests/[name].export-manifest.json"),
                name: "[hash]"
            })
        ]
    });
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

    const plugins = [];
    let aliases = {};

    for (let directory of options.requiredDirectories) {
        const manifestPaths = await getManifestPathsForDirectory(directory);

        manifestPaths.forEach(manifest => {
            const plugin = new webpack.DllReferencePlugin({
                context: options.vanillaDirectory,
                manifest: require(manifest)
            });

            plugins.push(plugin);
        });

        // Put together the aliases
        const partialAliases = createWebpackAliasesForDirectory(directory);

        aliases = {
            ...aliases,
            ...partialAliases
        };
    }

    printVerbose("Using aliases:\n" + JSON.stringify(aliases));

    // @ts-ignore
    return merge(baseConfig, {
        entry: entries,
        output: {
            path: path.join(primaryDirectory, "js"),
            filename: "[name]"
        },
        resolve: {
            alias: aliases
        },
        plugins
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