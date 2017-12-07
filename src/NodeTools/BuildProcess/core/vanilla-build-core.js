/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const argv = require("yargs").argv;
const chalk = require("chalk").default;
const webpack = require("webpack");

const buildScripts = require("./build.scripts");
const buildStyles = require("./build.styles");
const { print, printError, printVerbose, spawnChildProcess } = require("../../library/utility");

/**
 * @var Object The options passed from the PHP process.
 */
const options = JSON.parse(argv.options);

// Set the verbose option globally.
// @ts-ignore
global.verbose = options.verbose;

const devModeWarning = chalk.bold.yellow(`WARNING The process is starting in watch/dev mode. Be sure to run a production build before commiting your changes by running this command with the '--watch' option.\n`);

options.watch && print(devModeWarning);

const originalDir = process.cwd();

// Make sure dependancies are all installed
print("Verifying node_module installation.");
installNodeModules()
    .then(() => print(chalk.green("✓") + " Node modules verified."))
    .catch(handleNodeModuleError)
    .then(() => Promise.all([buildScripts(options), buildStyles(options)]))
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
