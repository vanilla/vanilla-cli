/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const gulp = require("gulp");
const livereload = require("gulp-livereload");
const argv = require("yargs").argv;
const chalk = require("chalk").default;

const { print, sleep, checkLiveReloadPort } = require("../../library/utility");

const buildJs = require("./build.javascript");
const buildStyles = require("./build.stylesheets");
const buildAssets = require("./build.assets");

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
// @ts-ignore
global.verbose = options.verbose;

const primaryDirectory = options.rootDirectories.slice(0, 1)[0];
const parentDirectories = options.rootDirectories.slice(1, options.rootDirectories.length);

print(`Starting build process ${chalk.green("v1")} for addon at ${chalk.yellow(primaryDirectory)}.`);
parentDirectories.forEach(parent => {
    print(`Parent addon found at ${chalk.yellow(parent)}.`);
});

const devModeWarning = chalk.bold.yellow(`
WARNING The process is starting in watch/dev mode. Be sure to run a production build before commiting your changes by running this command with the '--watch' option.
`);

print(options.watch ? devModeWarning : "");

gulp.task("build:js", buildJs(primaryDirectory, options));

gulp.task("build:styles", buildStyles(options));

gulp.task("build:assets", buildAssets(primaryDirectory, options.buildOptions));

gulp.task("build", ["build:assets", "build:styles", "build:js"]);

gulp.task("watch", ["build"], () => {
    checkLiveReloadPort().then(() => {
        livereload.listen();

        const onReload = file => livereload.changed(file.path);

        gulp.watch(
            [
                path.resolve(primaryDirectory, "design/*.css"),
                path.resolve(primaryDirectory, "design/images/**/*"),
                path.resolve(primaryDirectory, "js/*.js"),
                path.resolve(primaryDirectory, "views/**/*")
            ],
            onReload
        );

        const { cssTool } = options.buildOptions;

        gulp.watch(path.resolve(primaryDirectory, `src/**/*.${cssTool}`), ["build:styles"]);
        gulp.watch(path.resolve(primaryDirectory, "src/**/*.js"), ["build:js"]);
        gulp.watch(path.resolve(primaryDirectory, "design/images/**/*"), ["build:assets"]);

        print("\n" + chalk.green("Watching for changes in src files..."));
    })
});

const taskToExecute = options.watch ? "watch" : "build";

gulp.start(taskToExecute);
