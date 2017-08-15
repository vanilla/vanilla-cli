/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const gulp = require('gulp');
const path = require('path');
const fs = require('fs');

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
    this.emit('end');
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
    /**
     * Create a custom Sass importer to search node modules folder with ~ prefix
     *
     * @param {string} url The filepath
     * @param {string} prev The previous filepath
     * @param {function} done Completion callback
     */
    function importer(url, prev, done) {
        var regex = /^~/;
        if (!url.match(regex)) {
            var cssImportRegex = /^((\/\/)|(http:\/\/)|(https:\/\/))/;
            // if we don't escape this, then it's breaking the normal css @import
            if (url.match(cssImportRegex)) {
                return done({ file: `'` + url + `'` });
            }

            return done({ file: url });
        }

        var baseDirectory = fs.realpathSync(path.join(
            addonDirectory,
            'node_modules',
            url.replace(regex, '')
        ));

        const jsonDirectory = path.resolve(baseDirectory, 'package.json');
        let fileName = "";
        if (fs.existsSync(jsonDirectory)) {
            const json = require(jsonDirectory);
            if (json.style) {
                fileName = path.resolve(baseDirectory, json.style);
            } else if (json.main && json.main.match(/.scss$/)) {
                fileName = path.resolve(baseDirectory, json.main);
            } else {
                throw new Error(`No SCSS file found for module ${baseDirectory}}`);
            }
        } else {
            throw new Error(`No package.json found for ${jsonDirectory}}`);
        }

        if (fileName.endsWith('.css')) {
            fileName = fileName.slice(0, -4);
        }

        return done({file: fileName});
    }
    const destination = path.resolve(addonDirectory, 'design');

    const process = gulp
        .src(path.resolve(addonDirectory, 'src/scss/*.scss'))
        .pipe(
            plumber({
                errorHandler: swallowError
            })
        )
        .pipe(sourcemaps.init())
        // .pipe(
        //     stylelint({
        //         reporters: [{ formatter: 'string', console: true }]
        //     })
        // )
        .pipe(sass({importer}))
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
