/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const argv = require("yargs").argv;
const chalk = require("chalk").default;
const webpack = require("webpack");

const buildScripts = require("./build.scripts");
const buildStyles = require("./build.styles");
const { print, printError, spawnChildProcess } = require("../../library/utility");

const options = getOptions();
installNodeModules(options)
    .then(() => run(options));

/**
 * Gather the options and print out any warnings.
 *
 * @returns {BuildOptions}
 */
function getOptions() {
    const options = JSON.parse(argv.options);

    // Set the verbose option globally (for printVerbose).
    // @ts-ignore
    global.verbose = options.verbose;

    const devModeWarning = chalk.bold.yellow(`WARNING The process is starting in watch/dev mode. Be sure to run a production build before commiting your changes by running this command with the '--watch' option.\n`);

    options.watch && print(devModeWarning);

    return options;
}

/**
 * Install dependancies for all requirements.
 *
 * @param {BuildOptions} options
 */
async function installNodeModules(options) {
    print("Verifying node_module installation.");
    const originalDir = process.cwd();

    try {
        for (const dir of options.rootDirectories) {
            process.chdir(dir);
            await spawnChildProcess("yarn", ["install"], {});
        }
    } catch(err) {
        printError(`\nNode module installation failed.\n    ${err}\n`);
    }

    print(chalk.green("✓") + " Node modules verified.")
    process.chdir(originalDir);
}

/**
 * Run the build process.
 *
 * @param {BuildOptions} options
 */
async function run(options) {
    return Promise.all([buildScripts.run(options), buildStyles(options)]);
}
