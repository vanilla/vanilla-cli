/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const gulp = require("gulp");
const livereload = require("gulp-livereload");
const argv = require("yargs").argv;
const chalk = require('chalk');
const webpack = require('webpack');

const { print, printError, spawnChildProcess } = require("../../library/utility");

/**
 * @var Object The options passed from the PHP process.
 *
 * - buildOptions - The configuration options.
 * - rootDirectories - The directories to search through for src files.
 * - watch - Should this be in watch mode.
 * - verbose - Display verbose output.
 */
const options = JSON.parse(argv.options);

// Set the verbose option globally.
global.verbose = options.verbose;

const primaryDirectory = options.rootDirectories.slice(0, 1)[0];
const parentDirectories = options.rootDirectories.slice(1, options.rootDirectories.length);

print(`Starting build process ${chalk.green('v2')} for addon at ${chalk.yellow(primaryDirectory)}.`);
parentDirectories.forEach(parent => {
    print(`Parent addon found at ${chalk.yellow(parent)}.`);
});
print('');

const originalDir = process.cwd();

async function installNodeModules() {
    for (const dir of options.rootDirectories) {
        process.chdir(dir);
        await spawnChildProcess('yarn install', null, null);
    }
}

// Make sure dependancies are all installed
console.log("Verifying node_module installation.");
installNodeModules()
    .then(() => {
        print(chalk.green("Node modules verified.");
    })
    .catch(err => {
        printError(`
            Node module installation failed.
            ${err}
        `);
    })

webpack()
