const path = require('path');
const fs = require('fs');

module.exports = {
    getJsEntries
}

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
    const indexPath = path.resolve(
        addonDirectory,
        "./src/js/index.js"
    );

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
