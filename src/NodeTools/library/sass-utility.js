/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const fs = require("fs");
const chalk = require("chalk").default;

const { print, printVerbose, printError } = require("./utility");

module.exports = {
    createSassTool
}

function createSassTool(sourceDirectories) {

    return {
        importer,
        swapPlaceholders,
    };

    /**
     * Create a custom Sass importer to search node modules folder with ~ prefix.
     *
     * @public
     * @param {string} url - The filepath.
     * @param {string} prev - The previous filepath.
     * @param {function} done - Completion callback.
     */
    function importer(url, prev, done) {
        const nodeModuleRegex = /^~/;
        const cssHttpImportRegex = /^((\/\/)|(http:\/\/)|(https:\/\/))/;

        let trueFilePath = "";

        if (url.match(cssHttpImportRegex)) {
            // Ensure the file name is wrapped in quotes or we'll break the native css @import
            trueFilePath = `'${url}'`;
        } else if (url.match(nodeModuleRegex)) {
            trueFilePath = resolveFilePathInNodeModules(url.replace(nodeModuleRegex, ""));
            printVerbose(`Mapping request SCSS import ${chalk.yellow(url)} to ${trueFilePath}`);
        } else {
            trueFilePath = url;
        }

        return done({ file: trueFilePath });
    }

    /**
     * Swap any placeholders comments in an SCSS file imports.
     *
     * The function will attempt to resolve a file of the captured name in all source directories.
     * filenames containing "variables" will be matched in reverse order or source directories.
     *
     * @public
     * @param {string} content - The file content.
     * @param {string} entryFilePath - The path of the file.
     *
     * @return {string} The new contents of a file.
     */
    function swapPlaceholders(content, entryFilePath) {
        const placeholderRegex = /\/\*\*\s*@vanilla-cli-placeholder:\s*([^\s]*)\s*\*\*\//g;

        const replacedText = content.replace(placeholderRegex, (match, captureGroup1) => {
            const resolvedFilePaths = resolveAllFilePathsFromMutlipleAddons(`src/scss/${captureGroup1}`) || [];

            // Everything but variables should be oldest to youngest.
            if (!/variables/.test(captureGroup1)) {
                resolvedFilePaths.reverse();
            }

            let output = "";

            resolvedFilePaths.forEach(resolvedFilePath => {
                const relativeFilePath = path.relative(entryFilePath, resolvedFilePath);

                printVerbose(`Inserting file ${chalk.yellow(relativeFilePath)} into parent entrypoint.`)
                output += `@import "${resolvedFilePath}";\n`;
            });
            return output;
        });

        return replacedText;
    }


    /**
     * Attempt to resolve a file in potentially multiple addon directories.
     *
     * Will attempt to lookup up the child, then check parents.
     *
     * @private
     * @param {string} requestPath - The requested file to lookup.
     *
     * @return {string} A resolved absolute file path.
     * @throws {Error} If the file couldn't be resolved anywhere.
     */
    function resolveOneFilePathFromMutlipleAddons(requestPath) {
        for (const srcDirectory of sourceDirectories) {
            const lookupPath = path.join(srcDirectory, requestPath);

            if (fs.existsSync(lookupPath)) {
                return fs.realpathSync(lookupPath);
            }
        }
    }

    /**
     * Attempt to resolve a file in potentially multiple addon directories.
     *
     * Will attempt to lookup up the child, then check parents.
     *
     * @private
     * @param {string} requestPath - The requested file to lookup.
     *
     * @return {string[]} A resolved absolute file path.
     * @throws {Error} If the file couldn't be resolved anywhere.
     */
    function resolveAllFilePathsFromMutlipleAddons(requestPath) {
        const paths = [];

        for (const srcDirectory of sourceDirectories) {
            const lookupPath = path.join(srcDirectory, requestPath);

            if (fs.existsSync(lookupPath)) {
                paths.push(fs.realpathSync(lookupPath));
            }
        }

        return paths;
    }

    /**
     * Shortcut for resolving a node_modules with absolutely specifying the path.
     *
     * Checks the package.json for "style" and "main" keys to find an scss/css entrypoint.
     *
     * @private
     * @param {string} requestPath - The path to look up.
     *
     * @returns {string} The resolved absolute file path.
     * @throws {Error} If no file can be located.
     */
    function resolveFilePathInNodeModules(requestPath) {
        const moduleBasePath = path.join("node_modules", requestPath);
        const packageJsonPath = path.join(moduleBasePath, 'package.json');
        const resolvedPath = resolveOneFilePathFromMutlipleAddons(moduleBasePath);

        if (!resolvedPath) {
            throw new Error(`Failed css node_module lookup. Package ${moduleBasePath}} not found.`);
        }

        const json = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

        let fileName = "";

        if (json.style) {
            fileName = path.resolve(moduleBasePath, json.style);
        } else if (json.main && json.main.match(/.s?css$/)) {
            fileName = path.resolve(moduleBasePath, json.main);
        } else {
            throw new Error(`No SCSS file found for module ${moduleBasePath}}`);
        }

        // Remove the direct import of .css or Sass will try and do a CSS import.
        if (fileName.endsWith(".css")) {
            fileName = fileName.slice(0, -4);
        }

        return fileName;
    }
}
