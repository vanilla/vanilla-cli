/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 * @module utility
 */

const path = require("path");
const fs = require("fs");
const chalk = require('chalk').default;
const { spawn } = require("child_process");

module.exports = {
    spawnChildProcess,
    pluralize,
    print,
    printVerbose,
    printError,
    sleep,
    getJsonFileForDirectory
};

const defaultSpawnOptions = {
    stdio: "inherit",
};

/**
 * Get a json file from
 *
 * @param {string} directory - The directory to look in.
 * @param {string} jsonName - the name of the json file wihtout .json
 *
 * @return {Object} The file contents as an object.
 */
function getJsonFileForDirectory(directory, jsonName) {
    const jsonPath = path.resolve(directory, `${jsonName}.json`);
    if (!fs.existsSync(jsonPath)) {
        printError(`Unable to require JSON file ${chalk.yellow(jsonPath)}. Does not exist`);
    }

    return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
}

/**
 * Spawn a child build process. Wraps child_process.spawn.
 *
 * @param {string} command - The command to start.
 * @param {string[]} args - Arguments for the command.
 * @param {Object} options - Options to pass to `child_process.spawn`.
 *
 * @throws {Error} If the process throws and error
 * @returns Promise<boolean> Return if the process exits cleanly.
 */
async function spawnChildProcess(command, args, options = defaultSpawnOptions) {
    return new Promise((resolve, reject) => {
        const task = spawn(command, args, options);

        task.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`command "${command} exited with a non-zero status code."`))
            }
            return resolve(true);
        });

        task.on("error", err => {
            return reject(err);
        });
    });
}

/**
 * Conditionally add an 's' to the end of a word.
 *
 * @param {string} word - The word to pluralize.
 * @param {number} count - The number of items.
 *
 * @returns {string} The pluralized word.
 */
function pluralize(word, count) {
    const plural = count === 1 ? word : word + "s";
    return plural;
}

/**
 * Log something to STDOUT. Use this instead of console.log();
 *
 * @param {string} contents - What to print out.
 */
function print(contents) {
    console.log(contents);
}

/**
 * Log something to STDOUT only if the verbose option is set. Use this instead of console.log();
 *
 * @param {string} contents - What to print out.
 */
function printVerbose(contents) {
    const isVerbose = global.verbose || false;

    if (isVerbose) {
        console.log(contents);
    }
}

/**
 * Log an error to STDERR. Colored red if ANSI codes are supported.
 *
 * @param {string|Error} error - The error or string to print out.
 */
function printError(error) {
    console.error(chalk.bold.red(error.toString()));
}

/**
 * Log an error to STDERR. Colored red if ANSI codes are supported.
 *
 * @param {string|Error} error - The error or string to print out.
 */
function fail(error) {
    console.error(chalk.bold.red(error.toString()));
    process.exit(1);
}

/**
 * Pause for the given amount of milliseconds.
 *
 * @param {number} milliseconds - The time to pause for.
 *
 * @returns {Promise<void>}
 */
function sleep(milliseconds) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, milliseconds)
    })
}
