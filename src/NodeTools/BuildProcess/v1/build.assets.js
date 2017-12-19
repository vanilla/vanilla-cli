/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const gulp = require("gulp");
const fs = require("fs");
const path = require("path");
const sourcemaps = require("gulp-sourcemaps");
const size = require("gulp-size");
const cache = require("gulp-cache");
const imagemin = require("gulp-imagemin");

/**
 * Gulp build process for images.
 *
 * @param {string} addonDirectory - The directory to build from.
 * @param {Object} options - The build options.
 *
 * @return {any} A gulp execution function.
 */
module.exports = (addonDirectory, options) => () => {
    if (!fs.existsSync(path.join(addonDirectory, "src/images"))) {
        return;
    };

    const process = gulp
        .src(path.join(addonDirectory, "src/images/**/*"))
        .pipe(
            cache(
                imagemin({
                    optimizationLevel: 3,
                    progressive: true,
                    interlaced: true
                })
            )
        )
        .pipe(gulp.dest(path.join(addonDirectory, "design/images")));

    if (options.verbose) {
        process.pipe(size({ showFiles: true }));
    }

    return process;
};
