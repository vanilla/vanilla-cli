/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 * @module utility
 */

const path = require("path");
const fs = require("fs");
const chalk = require('chalk');
const { spawn } = require("child_process");

module.exports = {
    spawnChildProcess,
    pluralize,
    print,
    printError,
    sleep,
};

/**
 * Fetch and parse the package json file in the given directory
 *
 * @param {string} addonDirectory The directory to read from
 *
 * @async
 * @returns Object|boolean
 */
function getPackageJson(addonDirectory) {
    const packagePath = path.resolve(addonDirectory, "./package.json");

    return new Promise(resolve => {
        fs.readFile(packagePath, "utf8", (err, data) => {
            if (err) {
                return resolve(false);
            }

            const packageInfo = JSON.parse(data);
            resolve(packageInfo);
        });
    });
}

const defaultSpawnOptions = {
    stdio: "inherit",
};

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

        task.on("close", () => {
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
 * Log an error to STDERR. Colored red if ANSI codes are supported.
 *
 * @param {string|Error} error - The error or string to print out.
 */
function printError(error) {
    console.error(chalk.bold.red(error));
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

function createStreamFromString(fakeFileName, contents) {
    var stream = require('stream').Readable({ objectMode: true })
    stream._read = () => {
      this.push(new gutil.File({
        cwd: "",
        base: "",
        path: filename,
        contents: new Buffer(string)
      }))
      this.push(null)
    }
    return stream
}
