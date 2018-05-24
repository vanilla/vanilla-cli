/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import { argv } from "yargs";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import { spawn, exec, SpawnOptions } from "child_process";
import { print, printError, printVerbose, spawnChildProcess, getJsonFileForDirectory } from "../library/utility";

const options = JSON.parse(argv.options);

const isVerbose = options.verbose || false;
let command = options.watch ? "watch" : "build";
const workingDirectory = process.cwd();

// For when want to output to the CLI
const spawnOptions: SpawnOptions = {
    stdio: "inherit",
};

/**
 * Primary execution function
 */
async function run() {
    const primaryDirectory = options.rootDirectories[0];

    print(`Starting build process ${chalk.green("legacy")} for addon at ${chalk.yellow(primaryDirectory)}.`);

    createLegacyBuildShim();
    const npmTaskExists = await runNpmTaskIfExists();

    if (!npmTaskExists) {
        const gulpTaskExists = await runGulpTaskIfExists();
        const gruntTaskExists = await runGruntTaskIfExists();
        const rubyTaskExists = await runRubyTaskIfExists();

        return gulpTaskExists || gruntTaskExists || rubyTaskExists;
    }

    return true;
}

run()
    .then(taskExists => {
        if (taskExists) {
            print(chalk.green("Build process completed successfully."));
        } else {
            print(
                chalk.red("No legacy build tasks found.") +
                    "\nVisit https://github.com/vanilla/vanilla-cli/wiki/Build-Tools#legacy for more information.",
            );
        }
    })
    .catch(err => {
        printError(`${chalk.red("There was an error in the build process\n")}`);
        print(err);
    });

function createLegacyBuildShim() {
    // Create an empty bower_components folder if bower.json exists and there isn't one.
    // This is a shim for some older build tools that don't handle this well.
    const $bowerJsonPath = path.resolve(workingDirectory, "bower.json");
    const $bowerComponentsPath = path.resolve(workingDirectory, "bower_components");

    if (fs.existsSync($bowerJsonPath) && !fs.existsSync($bowerComponentsPath)) {
        fs.mkdirSync($bowerComponentsPath);
    }
}

/**
 * Check if a node dependancy has been installed and is on the path. Installs if it can't find it.
 *
 * @param packageName The name of the node dependacny
 */
async function checkGlobalNodeDependancyInstalled(packageName: string) {
    return new Promise((resolve, reject) => {
        print(`Checking that build tool ${chalk.yellow(packageName)} is installed globally.`);
        const whichProcess = exec(`which ${packageName}`, (error, stdout, stderr) => {
            if (stdout) {
                print(chalk.green(`${packageName} is installed globally. Proceding with build process.`));
                return resolve(true);
            }

            print(chalk.yellow(`${packageName} is not installed globally. Installing it now.`));

            const installProcess = spawn("npm", ["install", "-g", packageName], spawnOptions);
            installProcess.on("error", err => {
                print(chalk.red(`\nThere was an issue installing ${packageName}. Aborting build process.\n`));
                return reject(err);
            });

            installProcess.on("close", () => {
                print(chalk.green(`${packageName} install successfull. Proceding with build process.`));
                return resolve(true);
            });
        });
    });
}

/**
 * Conditionally run an npm task if it exists
 */
async function runNpmTaskIfExists() {
    const packageJson = getJsonFileForDirectory(workingDirectory, "package");

    if (!packageJson) {
        isVerbose &&
            print(
                `No ${chalk.yellow("package.json")} found in ${chalk.cyan(
                    workingDirectory,
                )}. Skipping npm tasks check.`,
            );
        return false;
    }

    if (!packageJson.scripts) {
        isVerbose &&
            print(`Scripts not found in ${chalk.cyan(`${workingDirectory}/package.json`)}. Skipping npm tasks check.`);
        return false;
    }

    if (!packageJson.scripts[command]) {
        isVerbose &&
            print(
                `Script '${chalk.yellow(command)}' not found in ${chalk.cyan(
                    `${workingDirectory}/package.json`,
                )}. Skipping npm tasks check.`,
            );
        return false;
    }

    // Script exists. Execute it.
    isVerbose && print(`Package.json script ${chalk.yellow(command)} found. Starting script.`);

    return await spawnChildProcess("npm", ["run", command, "--", "--color"], spawnOptions);
}

/**
 * Conditionally run a gulp task if it exists.
 */
async function runGulpTaskIfExists() {
    const gulpFilePath = path.resolve(workingDirectory, "gulpfile.js");

    if (!fs.existsSync(gulpFilePath)) {
        isVerbose &&
            print(`${chalk.yellow("gulpfile")} not found in ${chalk.cyan(workingDirectory)}. Skipping gulp task check`);

        return false;
    }

    const gulpfile = require(gulpFilePath);
    if (!gulpfile.tasks) {
        throw new Error(
            `${chalk.yellow(
                "gulpfile",
            )} found but no tasks were found. Be sure to export gulp at the end of your gulpfile.

    ${chalk.green("module.exports = gulp")}`,
        );
    }

    const gulpTasks: any = Object.keys(gulpfile.tasks).sort();

    if (!gulpTasks[command]) {
        // If there command is build, it may also be the default gulp task.
        if (command === "build") {
            if (gulpTasks.default) {
                command = "default";
            } else {
                throw new Error(
                    `${chalk.yellow("gulpfile")} found but no ${chalk.cyan(command)} or ${chalk.cyan(
                        "default",
                    )} task was defined. Exiting build process.`,
                );
            }
        } else {
            throw new Error(
                `${chalk.yellow("gulpfile")} found but no ${chalk.cyan(
                    command,
                )} task was defined. Exiting build process.`,
            );
        }
    }

    // Task exists. Execute it.
    await checkGlobalNodeDependancyInstalled("gulp");
    print(`Gulp task ${command} found. Starting gulp ${command} process`);
    await spawnChildProcess("gulp", [command, "--", "--color"], spawnOptions);
}

/**
 * Fetch all the grunt tasks in working directories grunt file by parsing `gulp --help`
 */
function getGruntTasks(): Promise<string[]> {
    return new Promise(resolve => {
        const gruntHelpProcess = exec("grunt --help --no-color", (err, stdout, stderr) => {
            const trimmedOutput = /Available tasks([\s\S]+) \n\n/.exec(stdout);
            const result = trimmedOutput
                ? trimmedOutput[0]
                      .trim()
                      .split("\n")
                      .map(x => x.trim().split("  ")[0])
                : [];

            resolve(result);
        });
    });
}

/**
 * Conditionally run a grunt task if it exists
 */
async function runGruntTaskIfExists() {
    const gruntfilePath = path.resolve(workingDirectory, "gruntfile.js");

    if (!fs.existsSync(gruntfilePath)) {
        isVerbose &&
            print(
                `${chalk.yellow("gruntfile")} not found in ${chalk.cyan(workingDirectory)}. Skipping grunt task checks`,
            );

        return false;
    }

    await checkGlobalNodeDependancyInstalled("grunt");

    const gruntTasks = await getGruntTasks();
    // In vanilla themse grunt build task is called default
    if (command === "build") {
        command = "default";
    }

    if (gruntTasks.length < 1) {
        throw new Error(`${chalk.yellow("gruntfile")} found but no tasks were found. Aborting build process.`);
    }

    if (!gruntTasks.includes(command)) {
        throw new Error(
            `${chalk.yellow("gruntfile")} found but no ${chalk.cyan(command)} task was defined. Exiting build process.`,
        );
    }

    // Tasks exists. Execute it.
    print(`Grunt task ${command} found. Starting grunt ${command} process`);
    await spawnChildProcess("grunt", [command, "--color"], spawnOptions);
}

/**
 * Check if a package is installed and on the path
 */
async function checkDependencyOnPath(packageName: string) {
    return new Promise((resolve, reject) => {
        exec(`which ${packageName}`, (err, stdout, stderr) => {
            if (err) {
                return reject(err);
            }

            if (!stdout) {
                return reject(
                    `Package ${chalk.yellow(
                        packageName,
                    )} does not exist or found in your path. It is required for a legacy ruby build process.`,
                );
            }

            resolve(true);
        });
    });
}

/**
 * Run the ruby bundler to install all gems from a Gemfile
 */
async function runBundler() {
    await checkDependencyOnPath("bundler");
    print("Installing Ruby Gems.\n");

    return new Promise((resolve, reject) => {
        const bundlerProcess = spawn("bundler", ["install"], {
            stdio: "inherit",
        });
        bundlerProcess.on("error", err => {
            return reject(err);
        });

        bundlerProcess.on("close", code => {
            if (code === 0) {
                print(`Ruby gems installed successfully.`);
            }
            resolve();
        });
    });
}

/**
 * Conditionally run a ruby task if it exists.
 */
async function runRubyTaskIfExists() {
    const gemfilePath = path.resolve(workingDirectory, "Gemfile");

    if (!fs.existsSync(gemfilePath)) {
        isVerbose &&
            print(`${chalk.yellow("Gemfile")} not found in ${chalk.cyan(workingDirectory)}. Skipping ruby checks.`);

        return false;
    }

    await checkDependencyOnPath("ruby");
    await runBundler();

    isVerbose && print("Beginning Ruby build process");
    if (command === "build") {
        await spawnChildProcess("compass", ["compile"], spawnOptions);
    } else if (command === "watch") {
        await spawnChildProcess("compass", ["watch"], spawnOptions);
    }
}
