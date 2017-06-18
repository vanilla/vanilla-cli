const gulp = require('gulp');
const argv = require('yargs').argv;

const VanillUtility = require('../../VanillaUtility');

const buildJs = require('./build.javascript');
const buildStyles = require('./build.stylesheets');
const buildAssets = require('./build.assets');

const addonpath = argv.addonpath;

gulp.task('build:js', () => {
    return VanillUtility.getJsEntries(addonpath)
        .then((jsfiles) => {
            return buildJs(addonpath, jsfiles);
        });
});

gulp.task('build:styles', () => {
    return buildStyles(addonpath);
})

gulp.task('build:assets', () => {
    return buildAssets(addonpath);
})

gulp.task('default', () => {
    gulp.start('build:styles', 'build:js', 'build:assets');
});

gulp.task('watch', ['default'], function () {
    livereload.listen();

    gulp.watch([
            path.resolve(addonpath, 'design/*.css'),
            path.resolve(addonpath, 'design/images/**/*'),
            path.resolve(addonpath, 'js/*.js'),
            path.resolve(addonpath, 'views/**/*')
        ], (file) => {
            return livereload.changed(file.path);
        }
    );

    gulp.watch(path.resolve(addonpath, 'src/scss/**/*.scss'), ['build:styles']);
    gulp.watch(path.resolve(addonpath, 'src/js/**/*.js'), ['build:js']);
    gulp.watch(path.resolve(addonpath, 'design/images/**/*'), ['build:assets']);
});

module.exports = gulp;
