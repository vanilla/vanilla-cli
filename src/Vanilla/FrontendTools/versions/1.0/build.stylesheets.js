const gulp = require('gulp');
const path = require('path');

const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const cssnano = require('gulp-cssnano');
const stylelint = require('gulp-stylelint');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const size = require('gulp-size');

module.exports = (addonDirectory) => {
    const destination = path.resolve(addonDirectory, 'design');

    return gulp
        .src(path.resolve(addonDirectory, 'src/scss/*.scss'))
        .pipe(plumber())
        .pipe(sourcemaps.init())
        // .pipe(
        //     stylelint({
        //         reporters: [{ formatter: 'string', console: true }]
        //     })
        // )
        .pipe(cssnano())
        .pipe(sass())
        .pipe(autoprefixer())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(destination))
        .pipe(size({ showFiles: true }));
}
