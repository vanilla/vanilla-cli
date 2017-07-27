/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 * @module VanillaUtility
 */

/**
 * @typedef BuildOptions
 * @property {?boolean} isWatchMode
 * @property {?boolean} isCleanMode
 * @property {?string} buildProcessVersion
 */

const path = require("path");
const fs = require("fs");
const yargs = require("yargs");

module.exports = {
    getJsEntries,
    parseCliOptions,
    getPackageJson,
    getSubDirectories,
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

/**
 *  Parse the options from the CLI into a javscript object.
 *
 * @param {string} options A JSON encoded array of options passed from php
 *
 * @returns {BuildToolOptions}
 */
function parseCliOptions(optionsString) {
    const options = JSON.parse(optionsString);
    const result = {
        isWatchMode: options.watch || options.watch === "",
        isCleanMode: options.clean || options.clean === "",
        isVerboseMode: options.verbose || options.verbose === "",
        buildProcessVersion: options.process || false
    };

    return result;
}

/**
 * Fetch all of the direct subdirectories of a given directory
 *
 * @param {string} rootDirectory An absolute path of the parent folder
 *
 * @async
 * @returns {string[]} The subdirectories
 */
function getSubDirectories(rootDirectory) {
    return new Promise(resolve => {
        fs.readdir(rootDirectory, (err, files) => {
            var directoryList = [];
            for (var index = 0; index < files.length; ++index) {
                var file = files[index];
                if (file[0] !== ".") {
                    var filePath = rootDirectory + "/" + file;
                    fs.stat(
                        filePath,
                        function(err, stat) {
                            if (stat.isDirectory()) {
                                directoryList.push(this.file);
                            }
                            if (files.length === this.index + 1) {
                                resolve(directoryList)
                            }
                        }.bind({ index: index, file: file })
                    );
                }
            }
        });
    })
}
