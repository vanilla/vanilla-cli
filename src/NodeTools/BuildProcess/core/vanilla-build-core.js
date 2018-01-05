/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const argv = require("yargs").argv;
const chalk = require("chalk").default;
const path = require("path");
const webpack = require("webpack");
const gulp = require("gulp");
const livereload = require("gulp-livereload");

const buildScripts = require("./build-scripts");
const buildStyles = require("./build-styles");
const { print, printError, spawnChildProcess, checkLiveReloadPort } = require("../../library/utility");

const options = getOptions();
installNodeModules(options)
    .then(() => run(options));

/**
 * Gather the options and print out any warnings.
 *
 * @returns {BuildOptions}
 */
function getOptions() {
    const options = JSON.parse(argv.options);

    // Set the verbose option globally (for printVerbose).
    // @ts-ignore
    global.verbose = options.verbose;

    const devModeWarning = chalk.bold.yellow(`WARNING The process is starting in watch/dev mode. Be sure to run a production build before commiting your changes by running this command without the '--watch' option.\n`);

    options.watch && print(devModeWarning);

    return options;
}

/**
 * Install dependancies for all requirements.
 *
 * @param {BuildOptions} options
 */
async function installNodeModules(options) {
    print("Verifying node_module installation.");
    const originalDir = process.cwd();

    try {
        for (const dir of options.rootDirectories) {
            process.chdir(dir);
            await spawnChildProcess("yarn", ["install"], {});
        }
    } catch(err) {
        printError(`\nNode module installation failed.\n    ${err}\n`);
    }

    print(chalk.green("✓") + " Node modules verified.")
    process.chdir(originalDir);
}

/**
 * Start the livereload server to listen for changes.
 *
 * @param {string} directory - The directory to listen for file changes in.
 */
function startLiveReload(directory) {
    gulp.task("watch", () => {
        livereload.listen();

        const onReload = file => livereload.changed(file.path);

        gulp.watch([
            path.resolve(directory, "design/*.css"),
            path.resolve(directory, "js/*.js")
        ],
            onReload
        );

        gulp.watch(path.resolve(directory, "src/**/*.scss"), () => {
            return buildStyles(options);
        });
    });

    gulp.start("watch");
}

/**
 * Run the build process.
 *
 * @param {BuildOptions} options
 */
async function run(options) {
    let primaryDirectory = options.rootDirectories.slice(0, 1)[0];
    const parentDirectories = options.rootDirectories.slice(1, options.rootDirectories.length);

    print(`Starting build process ${chalk.green("core")} for addon at ${chalk.yellow(primaryDirectory)}.`);
    parentDirectories.forEach(parent => {
        print(`Parent addon found at ${chalk.yellow(parent)}.`);
    });
    print("");

    const promises = [buildScripts.run(options), buildStyles(options)];

    if (options.watch) {
        await checkLiveReloadPort();
        promises.push(startLiveReload(primaryDirectory));
    }

    return Promise.all(promises).then(() => {});
}
