/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license http://www.opensource.org/licenses/gpl-2.0.php GNU GPL v2
 */

const gulp = require('gulp');
const path = require('path');

const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const cssnano = require('gulp-cssnano');
const stylelint = require('gulp-stylelint');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const size = require('gulp-size');


module.exports = buildStylesheets;

/**
 * Swallow the error and print it prevent gulp watch tasks from erroring out.
 *
 * @param {Error} error
 */
function swallowError(error) {
    console.log(error.toString());
    this.emit("end");
}

/**
 * Create the stylesheet gulp task function;
 * @export
 *
 * @param {string} addonDirectory The directory where things will be built.
 *
 * @returns {Gulp.Src} A gulp src funtion
 */
function buildStylesheets(addonDirectory, options) {
    const destination = path.resolve(addonDirectory, 'design');

    const process = gulp
        .src(path.resolve(addonDirectory, 'src/scss/*.scss'))
        .pipe(plumber({
            errorHandler: swallowError
        }))
        .pipe(sourcemaps.init())
        // .pipe(
        //     stylelint({
        //         reporters: [{ formatter: 'string', console: true }]
        //     })
        // )
        .pipe(sass())
        .pipe(autoprefixer())
        .pipe(cssnano())
        .pipe(sourcemaps.write('.'))
        .on('error', swallowError)
        .pipe(gulp.dest(destination));

    if (options.isVerboseMode) {
        process.pipe(size({ showFiles: true }));
    }

    return process;
}
