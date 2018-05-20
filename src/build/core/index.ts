/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import { argv } from "yargs";
import chalk from "chalk";
import path from "path";
import webpack from "webpack";
import gulp from "gulp";
import livereload from "gulp-livereload";
import glob from "glob";
import fs from "fs";

import buildScripts from "./scripts";
import buildScriptsHot from "./hot";
import buildStyles from "./styles";
import {
    print,
    printError,
    printVerbose,
    spawnChildProcess,
    checkLiveReloadPort,
    getAllCoreBuildAddons,
} from "../library/utility";

const options = getOptions();
installNodeModules().then(() => run());

/**
 * Gather the options and print out any warnings.
 *
 * @returns
 */
function getOptions(): ICliOptions {
    const opts = JSON.parse(argv.options);

    // Set the verbose option globally (for printVerbose).
    // @ts-ignore
    global.verbose = opts.verbose;

    const devModeWarning = chalk.bold.yellow(
        `WARNING The process is starting in watch/dev/hot mode. Be sure to run a production build before commiting your changes by running this command without the '--watch' or '--hot' option.\n`,
    );

    (opts.watch || opts.hot) && print(devModeWarning);

    return opts;
}

/**
 * Install dependancies for all requirements.
 *
 * @param options
 */
async function installNodeModules() {
    const { hot, vanillaDirectory, verbose } = options;

    print("Verifying node_module installation.");
    hot && print("This may take a while the first time.");
    const originalDir = process.cwd();

    try {
        let directories = [];
        if (hot) {
            directories = getAllCoreBuildAddons(options).filter(addonPath =>
                fs.existsSync(path.join(addonPath, "package.json")),
            );
        } else {
            directories = options.rootDirectories;
        }

        for (const dir of directories) {
            print(`Installing node modules for directory: ${chalk.yellow(dir)}`);
            process.chdir(dir);
            const spawnOptions = verbose ? { stdio: "inherit" } : {};
            await spawnChildProcess("yarn", ["install"], spawnOptions);
        }
    } catch (err) {
        printError(`\nNode module installation failed.\n    ${err}\n`);
    }

    print(chalk.green("✓") + " Node modules verified.");
    process.chdir(originalDir);
}

/**
 * Start the livereload server to listen for changes.
 *
 * @param directory - The directory to listen for file changes in.
 */
function startLiveReload(directory: string) {
    gulp.task("watch", () => {
        livereload.listen();

        const onReload = (file: any) => livereload.changed(file.path);

        gulp.watch([path.resolve(directory, "design/*.css"), path.resolve(directory, "js/*.js")], onReload);

        gulp.watch(path.resolve(directory, "src/**/*.scss"), () => {
            return buildStyles(options);
        });
    });

    gulp.start("watch");
}

/**
 * Run the build process.
 *
 * @param options
 */
async function run() {
    const primaryDirectory = options.rootDirectories.slice(0, 1)[0];
    const parentDirectories = options.rootDirectories.slice(1, options.rootDirectories.length);

    print(`Starting build process ${chalk.green("core")} for addon at ${chalk.yellow(primaryDirectory)}.`);
    parentDirectories.forEach(parent => {
        print(`Parent addon found at ${chalk.yellow(parent)}.`);
    });
    print("");

    const jsProcess = options.hot ? buildScriptsHot(options) : buildScripts(options);
    const promises = [jsProcess, buildStyles(options)];

    if (options.watch) {
        await checkLiveReloadPort();
        promises.push(startLiveReload(primaryDirectory));
    }

    return Promise.all(promises).then();
}
