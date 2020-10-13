/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import path from "path";
import { series, task, watch } from "gulp";
import livereload from "gulp-livereload";
import { argv } from "yargs";
import chalk from "chalk";

import { checkLiveReloadPort, print } from "../library/utility";

import buildJs from "./scripts";
import StylesheetBuilder from "../library/StylesheetBuilder";
import buildAssets from "./assets";

/**
 * @var Object The options passed from the PHP process.
 *
 * - buildOptions - The configuration options.
 * - rootDirectories - The directories to search through for src files.
 * - watch - Should this be in watch mode.
 * - verbose - Display verbose output.
 */
console.log(argv.options);
const options: ICliOptions = JSON.parse(argv.options);

// Set the verbose option globally.
// @ts-ignore
global.verbose = options.verbose;

const primaryDirectory = options.rootDirectories.slice(0, 1)[0];
const parentDirectories: string[] = options.rootDirectories.slice(1, options.rootDirectories.length);

print(`Starting build process ${chalk.green("v1")} for addon at ${chalk.yellow(primaryDirectory)}.`);
parentDirectories.forEach((parent) => {
    print(`Parent addon found at ${chalk.yellow(parent)}.`);
});

const devModeWarning = chalk.bold.yellow(`
WARNING The process is starting in watch/dev mode. Be sure to run a production build before commiting your changes by running this command without the '--watch' option.
`);

print(options.watch ? devModeWarning : "");

task("build:js", buildJs(primaryDirectory, options));

task("build:styles", new StylesheetBuilder(options).compiler);

task("build:assets", buildAssets(primaryDirectory, options));

task("build", series("build:assets", "build:styles", "build:js"));

task(
    "watch",
    series("build", () => {
        checkLiveReloadPort().then(() => {
            livereload.listen();

            const onReload = (file: any) => livereload.changed(file.path);

            watch(
                [
                    path.resolve(primaryDirectory, "design/*.css"),
                    path.resolve(primaryDirectory, "design/images/**/*"),
                    path.resolve(primaryDirectory, "js/*.js"),
                    path.resolve(primaryDirectory, "views/**/*"),
                ],
                onReload,
            );

            const { cssTool } = options.buildOptions;

            watch(path.resolve(primaryDirectory, `src/**/*.${cssTool}`), series("build:styles"));
            watch(path.resolve(primaryDirectory, "src/**/*.js"), series("build:js"));
            watch(path.resolve(primaryDirectory, "design/images/**/*"), series("build:assets"));

            print("\n" + chalk.green("Watching for changes in src files..."));
        });
    }),
);

const taskToExecute = options.watch ? "watch" : "build";

task(taskToExecute)();
