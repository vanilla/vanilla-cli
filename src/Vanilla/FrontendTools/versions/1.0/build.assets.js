const gulp = require('gulp');
const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const size = require('gulp-size');
const cache = require('gulp-cache');
const imagemin = require("gulp-imagemin");

module.exports = (addonDirectory, options) => {
    const process =  gulp
        .src(path.resolve(addonDirectory, 'src/images/**/*'))
        .pipe(
            cache(
                imagemin({
                    optimizationLevel: 3,
                    progressive: true,
                    interlaced: true
                })
            )
        )
        .pipe(gulp.dest(path.resolve(addonDirectory, 'design/images')));

    if (options.isVerboseMode) {
        process.pipe(size({ showFiles: true }));
    }

    return process;
}
