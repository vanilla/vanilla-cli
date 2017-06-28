/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license http://www.opensource.org/licenses/gpl-2.0.php GNU GPL v2
 */

const path = require("path");
const gulp = require("gulp");
const livereload = require("gulp-livereload");
const argv = require("yargs").argv;

const VanillaUtility = require("../../VanillaUtility");

const buildJs = require("./build.javascript");
const buildStyles = require("./build.stylesheets");
const buildAssets = require("./build.assets");

const addonpath = process.cwd();
const passedOptions = JSON.parse(argv.options);

const options = {
    isVerboseMode: passedOptions.verbose || false,
    isWatchMode: passedOptions.watch || false
}

gulp.task("build:js", () => {
    return VanillaUtility.getJsEntries(addonpath).then(jsfiles => {
        return buildJs(addonpath, options, jsfiles);
    });
});

gulp.task("build:styles", () => {
    return buildStyles(addonpath, options);
});

gulp.task("build:assets", () => {
    return buildAssets(addonpath, options);
});

gulp.task("build", ["build:js", "build:assets", "build:styles"]);

gulp.task("watch", ["build"], () => {
    livereload.listen();

    gulp.watch(
        [
            path.resolve(addonpath, "design/*.css"),
            path.resolve(addonpath, "design/images/**/*"),
            path.resolve(addonpath, "js/*.js"),
            path.resolve(addonpath, "views/**/*")
        ],
        file => {
            return livereload.changed(file.path);
        }
    );

    gulp.watch(path.resolve(addonpath, "src/scss/**/*.scss"), ["build:styles"]);
    gulp.watch(path.resolve(addonpath, "src/js/**/*.js"), ["build:js"]);
    gulp.watch(path.resolve(addonpath, "design/images/**/*"), ["build:assets"]);
});


const tasksToExecute = [
    options.isWatchMode ? "watch" : "build"
]

gulp.task("default", tasksToExecute, () => {
});

gulp.start('default');
