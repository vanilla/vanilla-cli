/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const gulp = require("gulp");
const path = require("path");

const plumber = require("gulp-plumber");
const sourcemaps = require("gulp-sourcemaps");
const cssnano = require("gulp-cssnano");
const autoprefixer = require("gulp-autoprefixer");
const size = require("gulp-size");
const modifyFile = require("gulp-modify-file");
const { print, printVerbose, printError } = require("../../library/utility");
const { createSassTool } = require('../../library/sassTool');

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
 * @param {string} cssTool - The CSS preprocessor to use.
 *
 * @return {function} A gulp execution function.
 */
module.exports = (primaryDirectory, secondaryDirectories, cssTool) => () => {
    const allSrcDirectories = [primaryDirectory, ...secondaryDirectories];
    const destination = path.resolve(primaryDirectory, "design");
    const sassTool = createSassTool(allSrcDirectories);

    return gulp
        .src(getSourceFiles())
        .pipe(
            plumber({
                errorHandler: swallowError
            })
        )
        .pipe(sourcemaps.init())
        .pipe(modifyFile(sassTool.swapPlaceholders))
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
     * Get the entrypoint CSS files. This is always in the "oldest" parent.
     *
     * @return {string[]} The entrypoints
     */
    function getSourceFiles() {
        const rootTheme = allSrcDirectories.slice(-1)[0];
        const srcDir = path.resolve(rootTheme, "src");

        // Ignore partials as entrypoints.
        return [
            path.join(srcDir, `${cssTool}/**/*.${cssTool}`),
            "!" + path.join(srcDir, `${cssTool}/**/_*.${cssTool}`)
        ];
    }

    /**
     * Get the proper stylesheet tool. Currently supports less & sass.
     *
     * @return {Gulp.Plugin} A gulp plugin.
     */
    function getStyleSheetBuilder() {
        if (cssTool === "less") {
            const less = require("gulp-less");
            return less();
        } else {
            const sass = require("gulp-sass");
            return sass({ importer: sassTool.importer });
        }
    }
};
