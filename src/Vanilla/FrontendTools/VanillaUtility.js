/**
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
    getSubDirectories
};

function getPackageJsonEntries(addonDirectory) {
    const packagePath = path.resolve(addonDirectory, "./package.json");

    return new Promise(resolve => {
        fs.readFile(packagePath, "utf8", (err, data) => {
            if (err) {
                resolve(false);
            }

            const packageInfo = JSON.parse(data);
            resolve(processJsFilePaths(packageInfo.entries));
        });
    });
}

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

async function getJsEntries(addonDirectory) {
    const packageJsonEntries = await getPackageJsonEntries(addonDirectory);

    if (packageJsonEntries) {
        return packageJsonEntries;
    }

    const indexJs = await getIndexJs(addonDirectory);

    if (indexJs) {
        return indexJs;
    }

    return false;
}

function processJsFilePaths(paths) {
    let results;

    if (paths instanceof String) {
        paths = [paths];
    }

    if (paths instanceof Array) {
        paths.forEach(item => {
            const key = item.replace(/\.[^/.]+$/, "");
            results[key] = item;
        });
    } else if (paths instanceof Object) {
        results = paths;
    }

    return results;
}

/**
 *  Parse the options from the CLI into a javscript object.
 *
 * @param {BuildToolOptions} options
 */
function parseCliOptions(options) {
    options = JSON.parse(options);
    const result = {
        isWatchMode: options.watch || options.watch === "",
        isCleanMode: options.clean || options.clean === "",
        isVerboseMode: options.verbose || options.verbose === "",
        buildProcessVersion: options.process || false
    };

    return result;
}

/**
 *
 *
 *
 * @param {string} rootDirectory An absolute path of the parent folder
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
