/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import path from "path";
import gulp from "gulp";
import livereload from "gulp-livereload";
import { argv } from "yargs";
import chalk from "chalk";

import { print, sleep, checkLiveReloadPort } from "../library/utility";

import buildJs from "./scripts";
import StylesheetBuilder from "../library/StylesheetBuilder";
import buildAssets from "./assets";
import { log } from "util";

/**
 * @var Object The options passed from the PHP process.
 *
 * - buildOptions - The configuration options.
 * - rootDirectories - The directories to search through for src files.
 * - watch - Should this be in watch mode.
 * - verbose - Display verbose output.
 */
const options: ICliOptions = JSON.parse(argv.options);

// Set the verbose option globally.
// @ts-ignore
global.verbose = options.verbose;

const primaryDirectory = options.rootDirectories.slice(0, 1)[0];
const parentDirectories: string[] = options.rootDirectories.slice(1, options.rootDirectories.length);
const { cssTool } = options.buildOptions;

print(`Starting build process ${chalk.green("v1")} for addon at ${chalk.yellow(primaryDirectory)}.`);
parentDirectories.forEach(parent => {
    print(`Parent addon found at ${chalk.yellow(parent)}.`);
});

const devModeWarning = chalk.bold.yellow(`
WARNING The process is starting in watch/dev mode. Be sure to run a production build before commiting your changes by running this command without the '--watch' option.
`);

print(options.watch ? devModeWarning : "");

gulp.task("build:js", buildJs(primaryDirectory, options));

gulp.task("build:styles", new StylesheetBuilder(options).compiler);

gulp.task("build:assets", buildAssets(primaryDirectory, options));

gulp.task("build", ["build:assets", "build:styles", "build:js"]);

gulp.task("watch", ["build"], () => {
    checkLiveReloadPort().then(() => {
        livereload.listen();

        const onReload = (file: any) => livereload.changed(file.path);

        const watchPaths = (root: string) => {
            gulp.watch(
                [
                    path.resolve(root, "design/*.css"),
                    path.resolve(root, "design/images/**/*"),
                    path.resolve(root, "js/*.js"),
                    path.resolve(root, "views/**/*"),
                ],
                onReload,
            );
            gulp.watch(path.resolve(root, `src/**/*.${cssTool}`), ["build:styles"]);
            gulp.watch(path.resolve(root, "src/**/*.js"), ["build:js"]);
            gulp.watch(path.resolve(root, "design/images/**/*"), ["build:assets"]);
        };

        watchPaths(primaryDirectory);
        if (options.watchExtra) {
            log("Watching additional directory " + options.watchExtra);
            watchPaths(options.watchExtra);
        }

        print("\n" + chalk.green("Watching for changes in src files..."));
    });
});

const taskToExecute = options.watch ? "watch" : "build";

gulp.start(taskToExecute);
