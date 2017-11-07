/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 * @module utility
 */

const path = require("path");
const fs = require("fs");
const { spawn, exec } = require("child_process");

module.exports = {
    getJsEntries,
    getPackageJson,
    spawnChildProcess,
    pluralize,
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

/**
 * Get the index js file path if it exists
 *
 * @param {any} addonDirectory
 *
 * @async
 * @returns {string|boolean}
 */
function getIndexJs(addonDirectory) {
    const indexPath = path.resolve(addonDirectory, "./src/js/index.js");

    return new Promise(resolve => {
        fs.readFile(indexPath, "utf8", (err, data) => {
            if (err) {
                resolve(false);
            } else {
                resolve(indexPath);
            }
        });
    });
}

/**
 * Get the javascript entry points from the package.json if they exist
 *
 * @param {string} addonDirectory
 *
 * @async
 * @returns {string[] | false}
 */
async function getJsEntries(addonDirectory) {
    const packageJson =  await getPackageJson(addonDirectory);
    const {entries} = packageJson;

    if (entries) {
        return entries;
    }

    const indexJs = await getIndexJs(addonDirectory);

    if (indexJs) {
        return indexJs;
    }

    return false;
}

const defaultSpawnOptions = {
    stdio: "inherit"
};

/**
 * Spawn a child build process. Wraps child_process.spawn
 *
 * @param {string} command
 * @param {string[]} args
 * @param {Object} options
 * @returns Promise<boolean> Return if the process exits cleanly.
 * @throws {Error} If the process throws and error
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

function pluralize(word, count) {
    const plural = count === 1 ? word : word + 's';
    return plural;
};
