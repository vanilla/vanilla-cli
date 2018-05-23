/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 * @module utility
 */

const path = require("path");
const fs = require("fs");
const chalk = require("chalk").default;
const detectPort = require("detect-port");
const {spawn} = require("child_process");
const glob = require("glob");

module.exports = {
    spawnChildProcess,
    pluralize,
    print,
    printVerbose,
    printError,
    fail,
    sleep,
    getJsonFileForDirectory,
    camelize,
    checkLiveReloadPort,
    getAllCoreBuildEntries,
    getAllCoreBuildAddons,
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
                reject(new Error(`command "${command} exited with a non-zero status code."`));
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
 * Convert a string to camelcase.
 *
 * @param {string} str - The string to convert.
 *
 * @returns {string}
 */
function camelize(str) {
    return str.replace(/[_.-](\w|$)/g, (substring, word) => {
        return word.toUpperCase();
    });
}

/**
 * Log something to STDOUT. Use this instead of console.log();
 *
 * @param {string} contents - What to print out.
 */
function print(contents) {
    if (process.env.NODE_ENV !== "test") {
        console.log(contents);
    }
}

/**
 * Log something to STDOUT only if the verbose option is set. Use this instead of console.log();
 *
 * @param {string} contents - What to print out.
 */
function printVerbose(contents) {
    // @ts-ignore
    const isVerbose = global.verbose || false;

    if (isVerbose) {
        print(contents);
    }
}

/**
 * Log an error to STDERR. Colored red if ANSI codes are supported.
 *
 * @param {string|Error} error - The error or string to print out.
 */
function printError(error) {
    console.error(chalk.bold.red(error.toString()));
    throw error;
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
        }, milliseconds);
    });
}

/**
 * Check to see if the livereload port is already taken. If it is, fail with a warning.
 */
async function checkLiveReloadPort() {
    const port = 35729;

    try {
        const portResult = await detectPort(port);
        if (portResult === port) {
            return;
        } else {
            fail(`Unable to start LiveReload server. Port ${port} is currently in use. You likely have another build tool currently in watch mode. Quit that process, then try running this command again.`);
        }
    } catch (err) {
        fail(err);
    }
}

let cachedCoreBuildAddons;

/**
 * Get the path to all currently enabled addons that use the "core" build process.
 *
 * This function caches the result the first time because there are a lot of file lookups involved.
 * I you enable another addon, you will need to restart the build tool.
 *
 * @param {BuildOptions} options
 *
 * @returns {string[]} - An array of filepaths.
 */
function getAllCoreBuildAddons(options) {
    const {vanillaDirectory} = options;

    if (cachedCoreBuildAddons) {
        return cachedCoreBuildAddons;
    }

    cachedCoreBuildAddons =  glob
        .sync(path.join(vanillaDirectory, "**/addon.json"))
        .filter(addonJsonPath => {
            const directory = path.dirname(addonJsonPath);
            const addonJson = getJsonFileForDirectory(directory, "addon");

            if (addonJson && addonJson.build && addonJson.build.process === "core") {
                return true;
            } else {
                return false;
            }
        })
        .map(path.dirname)
        .filter((item, index, self) => self.indexOf(item) == index)
        .filter(addonPath => {
            const addonKey = path.basename(addonPath);

            if (options.enabledAddonKeys.includes(addonKey)) {
                return true;
            } else {
                return false;
            }
        });

    cachedCoreBuildAddons.unshift(options.vanillaDirectory);

    return cachedCoreBuildAddons;
}

/**
 * Get all of paths of all the entry files in addons identififed by `getAllCoreBuildAddons`.
 *
 * @param {BuildOptions} options - The root of the vanilla installation.
 *
 * @returns {Object} - An Object of keyed "sections" and entries for that section.
 */
function getAllCoreBuildEntries(options) {
    const coreAddonPaths = getAllCoreBuildAddons(options);
    const coreBuildEntries = [];

    coreAddonPaths.forEach(coreAddonPath => {
        if (!fs.existsSync(path.join(coreAddonPath, "addon.json"))) {
            return;
        }
        const addonJson = getJsonFileForDirectory(coreAddonPath, "addon");
        const {entries} = addonJson.build;

        if (!entries) {
            return;
        }

        for (let [entryKey, entryPath] of Object.entries(entries)) {
            // Special handling for bootstrap files.
            if (entryKey.includes("bootstrap")) {
                entryKey = entryKey.replace("bootstrap-", "");
            }

            if (!coreBuildEntries[entryKey]) {
                coreBuildEntries[entryKey] = [];
            }

            coreBuildEntries[entryKey].push(path.join(coreAddonPath, entryPath));
        }
    });

    return coreBuildEntries;
}
