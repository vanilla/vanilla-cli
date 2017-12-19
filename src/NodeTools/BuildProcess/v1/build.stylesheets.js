/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const gulp = require("gulp");
const util = require("gulp-util");
const path = require("path");
const glob = require("globby");
const chalk = require("chalk").default;

const plumber = require("gulp-plumber");
const sourcemaps = require("gulp-sourcemaps");
const cssnano = require("gulp-cssnano");
const autoprefixer = require("gulp-autoprefixer");
const size = require("gulp-size");
const modifyFile = require("gulp-modify-file");
const { print, printVerbose, printError } = require("../../library/utility");
const { createSassTool } = require('../../library/sass-utility');

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
 * @param {BuildOptions} options
 *
 * @return {any} A gulp execution function.
 */
module.exports = (options) => () => {

    const { rootDirectories } = options;
    const { cssTool } = options.buildOptions;
    const destination = path.resolve(rootDirectories[0], "design");
    const sassTool = createSassTool(rootDirectories);

    const minifier = process.env.NODE_ENV !== "test" ? cssnano : util.noop;
    const src = getSourceFiles();

    glob(src).then(results => {
        results.forEach(srcFile => {
            const prettyPath = srcFile.replace(options.vanillaDirectory, '');
            print(chalk.yellow(`Using Entrypoint: ${prettyPath}`));
        })
    });

    const compiler = gulp
        .src(src)
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
        .pipe(minifier())
        .pipe(sourcemaps.write("."))
        .on("error", swallowError)
        .pipe(gulp.dest(destination));

    if (process.env.NODE_ENV !== "test") {
        compiler.pipe(size({ showFiles: true }));
    }

    return compiler;

    /**
     * Get the entrypoint CSS files. This is always in the "oldest" parent.
     *
     * @return {string[]} The entrypoints
     */
    function getSourceFiles() {
        const rootTheme = rootDirectories.slice(-1)[0];
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
     * @return {any} A gulp plugin.
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
