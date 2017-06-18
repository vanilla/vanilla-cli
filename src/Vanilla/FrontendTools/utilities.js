const path = require("path");
const fs = require("fs");

module.exports = {
    getJsEntries,
    fileExists,
    isAddon
};

function fileExists(filePath) {
    return new Promise(resolve => {
        fs.readFile(filePath, (err, data) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

async function isAddon(addonPath) {
    const indexPath = path.resolve(addonPath, "./addon.json");
    return await fileExists(indexPath);
}

function getPackageJsonEntries(addonPath) {
    const packagePath = path.resolve(addonPath, "./package.json");

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

function getIndexJs(addonPath) {
    const indexPath = path.resolve(addonPath, "./src/js/index.js");

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

async function getJsEntries(addonPath) {
    const packageJsonEntries = await getPackageJsonEntries(addonPath);

    if (packageJsonEntries) {
        return packageJsonEntries;
    }

    const indexJs = await getIndexJs(addonPath);

    if (indexJs) {
        return indexJs;
    }

    return false;
}

function processJsFilePaths(paths) {
    let result;

    if (typeof paths === "string") {
        paths = [paths];
    }

    if (typeof paths === "array") {
        paths.foreach(item => {
            const key = item.replace(/\.[^/.]+$/, "");
            results[key] = item;
        });
    } else if (typeof paths === "object") {
        results = paths;
    }

    return result;
}
