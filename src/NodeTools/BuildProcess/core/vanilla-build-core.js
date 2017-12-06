/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const argv = require("yargs").argv;
const chalk = require("chalk").default;
const webpack = require("webpack");

const runBuild = require("./build.scripts");
const {
    printError,
    printVerbose,
    spawnChildProcess,
} = require("../../library/utility");

/**
 * @var Object The options passed from the PHP process.
 */
const options = JSON.parse(argv.options);

// Set the verbose option globally.
// @ts-ignore
global.verbose = options.verbose;

const originalDir = process.cwd();

// Make sure dependancies are all installed
printVerbose("Verifying node_module installation.");
installNodeModules()
    .then(() => printVerbose(chalk.green("Node modules verified.")))
    .catch(handleNodeModuleError)
    .then(() => runBuild(options))
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
