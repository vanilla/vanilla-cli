/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const gulp = require("gulp");
const livereload = require("gulp-livereload");
const argv = require("yargs").argv;
const chalk = require('chalk');

const {print} = require("../../utility");

const buildJs = require("./build.javascript");
const buildStyles = require("./build.stylesheets");
const buildAssets = require("./build.assets");

const addonpath = process.cwd();

/**
 * @var Object The options passed from the PHP process.
 *
 * - buildOptions - The configuration options.
 * - rootDirectories - The directories to search through for src files.
 * - watch - Should this be in watch mode.
 * - verbose - Display verbose output.
 */
const options = JSON.parse(argv.options);

// Set the verbose option globally.
global.verbose = options.verbose;

const primaryDirectory = options.rootDirectories.slice(0, 1)[0];
const parentDirectories = options.rootDirectories.slice(1, options.rootDirectories.length);

print(`Starting build process ${chalk.green('v1')} for addon at ${chalk.yellow(primaryDirectory)}.`);
parentDirectories.forEach(parent => {
    print(`Parent addon found at ${chalk.yellow(parent)}.`);
});
print('');

gulp.task("build:js", buildJs(addonpath, options));

gulp.task("build:styles", buildStyles(primaryDirectory, parentDirectories, options.buildOptions));

gulp.task("build:assets", buildAssets(primaryDirectory, options.buildOptions));

gulp.task("build", ["build:assets", "build:styles", "build:js"]);

gulp.task("watch", ["build"], () => {
    livereload.listen();

    gulp.watch(
        [
            path.resolve(addonpath, "design/*.css"),
            path.resolve(addonpath, "design/images/**/*"),
            path.resolve(addonpath, "js/*.js"),
            path.resolve(addonpath, "views/**/*"),
        ],
        file => {
            return livereload.changed(file.path);
        }
    );

    const { cssTool } = options.cssTool;

    gulp.watch(path.resolve(addonpath, `src/**/*.${cssTool}`), ["build:styles"]);
    gulp.watch(path.resolve(addonpath, "src/**/*.js"), ["build:js"]);
    gulp.watch(path.resolve(addonpath, "design/images/**/*"), ["build:assets"]);

    print("\n" + chalk.green('Watching for changes in src files...'));
});


const taskToExecute = options.watch ? "watch" : "build";

gulp.start(taskToExecute);
