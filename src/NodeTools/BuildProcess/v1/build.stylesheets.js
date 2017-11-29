/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const gulp = require("gulp");
const path = require("path");
const fs = require("fs");

const plumber = require("gulp-plumber");
const sourcemaps = require("gulp-sourcemaps");
const cssnano = require("gulp-cssnano");
const autoprefixer = require("gulp-autoprefixer");
const size = require("gulp-size");
const modifyFile = require("gulp-modify-file");
const chalk = require("chalk");
const { print, printVerbose, printError } = require("../../utility");

/**
 * Swallow the error and print it prevent gulp watch tasks from erroring out.
 *
 * @param {Error} error
 */
function swallowError(error) {
    printError(error.toString());
    this.emit("end");
}

/**
 * Create the stylesheet gulp task function.
 * @export
 *
 * @param {string} primaryDirectory - The directory of the addon that initiated the build process.
 * @param {string[]} secondaryDirectories - Any parent directories to fetch source files from.
 * @param {Object} options - Build options.
 *
 * @return {function} A gulp execution function.
 */
module.exports = (primaryDirectory, secondaryDirectories, options) => () => {
    const allSrcDirectories = [primaryDirectory, ...secondaryDirectories];
    const destination = path.resolve(primaryDirectory, "design");

    return gulp
        .src(getSourceFiles())
        .pipe(
            plumber({
                errorHandler: swallowError
            })
        )
        .pipe(sourcemaps.init())
        .pipe(modifyFile(swapPlaceholders))
        .pipe(getStyleSheetBuilder())
        .pipe(
            autoprefixer({
                browsers: ["ie > 9", "last 6 iOS versions", "last 4 versions"]
            })
        )
        .pipe(cssnano())
        .pipe(sourcemaps.write("."))
        .on("error", swallowError)
        .pipe(gulp.dest(destination))
        .pipe(size({ showFiles: true }));

    /**
     * Swap out all of the placeholders in parent theme with a file import.
     *
     * @param {string} content - The file content.
     * @param {string} entryFilePath - The path of the file.
     *
     * @return {string} The new contets of a file.
     */
    function swapPlaceholders(content, entryFilePath) {
        const placeholderRegex = /\/\*\*\s*@vanilla-cli-placeholder:\s*([^\s]*)\s*\*\*\//g;

        const modifiedRelativeFilePath = path.relative(process.cwd(), entryFilePath);

        print(chalk.yellow(`Using Entrypoint: ${modifiedRelativeFilePath}`));

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
     * Get the entrypoint CSS files. This is always in the "oldest" parent.
     *
     * @return {string[]} The entrypoints
     */
    function getSourceFiles() {
        const rootTheme = allSrcDirectories.slice(-1)[0];
        const srcDir = path.resolve(rootTheme, "src");

        // Ignore partials as entrypoints.
        return [
            path.join(srcDir, `${options.cssTool}/**/*.${options.cssTool}`),
            "!" + path.join(srcDir, `${options.cssTool}/**/_*.${options.cssTool}`)
        ];
    }

    /**
     * Get the proper stylesheet tool. Currently supports less & sass.
     *
     * @return {Gulp.Plugin} A gulp plugin.
     */
    function getStyleSheetBuilder() {
        if (options.cssTool === "less") {
            const less = require("gulp-less");
            return less();
        } else {
            const sass = require("gulp-sass");
            return sass({ importer });
        }
    }

    /**
     * Create a custom Sass importer to search node modules folder with ~ prefix.
     *
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
            trueFilePath = resolveFilePathInNodeModules(url.replace(regex, ""));
            printVerbose(`Mapping request SCSS import ${chalk.yellow(url)} to ${trueFilePath}`);
        } else {
            trueFilePath = url;
        }

        return done({ file: trueFilePath });
    }

    /**
     * Attempt to resolve a file in potentially multiple addon directories.
     *
     * Will attempt to lookup up the child, then check parents.
     *
     * @param {string} requestPath - The requested file to lookup.
     *
     * @return {string} A resolved absolute file path.
     * @throws {Error} If the file couldn't be resolved anywhere.
     */
    function resolveOneFilePathFromMutlipleAddons(requestPath) {
        for (const srcDirectory of allSrcDirectories) {
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
     * @param {string} requestPath - The requested file to lookup.
     *
     * @return {string} A resolved absolute file path.
     * @throws {Error} If the file couldn't be resolved anywhere.
     */
    function resolveAllFilePathsFromMutlipleAddons(requestPath) {
        const paths = [];

        for (const srcDirectory of allSrcDirectories) {
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
            throw new Error(`Failed css node_module lookup. Package ${jsonPath}} not found.`);
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
};
