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
    getJsonFileForDirectory
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
    .then(runWebPack)
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

async function runWebPack() {
    const baseConfig = createBaseConfig(primaryDirectory, options.watch, false);
    const { entries, exports } = options.buildOptions;

    /**
     * Configuration options to generate DLL bundles.
     * Use the "exports" defined in the addon.json as entries.
     */
    const exportConfig = merge(baseConfig, {
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

    const dllPlugins = [];
    let aliases = {};
    console.log(options.requiredDirectories);

    for (let directory of options.requiredDirectories) {
        const manifestPaths = await getManifestPathsForDirectory(directory);

        manifestPaths.forEach(manifest => {
            const plugin = new webpack.DllReferencePlugin({
                context: vanillaDirectory,
                manifest: require(manifest)
                // scope: getNamespaceFromManifestFile(manifest)
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

    /**
     * Configuration options to build against DLL bundles.
     * Use the "entries" defined in the addon.json as entries.
     */
    const entriesConfig = merge(baseConfig, {
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

    // // Replace the @something/modules/moduleName with @something/../../node_modules/moduleName
    // // @ts-ignore
    // entriesConfig.module.rules[0].use.unshift({
    //     loader: 'pattern-replace-loader',
    //     query: {
    //         search: /(@.*\/)(modules\/)(.*)/gm,
    //         replace: "$1../../node_modules/$3",
    //     }
    // });

    const configsToRun = [];

    if (isValidEntryPoint(entries)) {
        configsToRun.push(entriesConfig);
    }

    if (isValidEntryPoint(exports)) {
        configsToRun.push(exportConfig);
    }

    webpack(configsToRun, (err, stats) => {
        if (err) {
            printError("The build encountered an error:" + err);
        }

        print(
            stats.toString({
                chunks: false, // Makes the build much quieter
                colors: true // Shows colors in the console
            })
        );
    });
}
