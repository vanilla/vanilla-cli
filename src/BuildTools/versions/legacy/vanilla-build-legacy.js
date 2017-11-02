/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const argv = require("yargs").argv;
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const { spawn, exec } = require("child_process");
const utility = require("../../utility");

const options = JSON.parse(argv.options);

const isVerbose = options.verbose || false;
let command = options.watch ? "watch" : "build";
const workingDirectory = process.cwd();

// For when want to output to the CLI
const spawnOptions = {
    stdio: "inherit"
};

// For when you don't only out in verbose mode
const conditionalSpawnOptions = {};
if (isVerbose) {
    conditionalSpawnOptions.stdio = "inherit";
}

/**
 * Primary execution function
 *
 * @returns {Promise}
 * @throws {Error} Some kind of build error.
 */
async function run() {
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
            console.log(chalk.green("Build process completed successfully."));
        } else {
            console.log(chalk.red("No legacy build tasks found.") + "\nVisit https://github.com/vanilla/vanilla-cli/wiki/Build-Tools#legacy for more information.")
        }
    })
    .catch(err => {
        console.error(
            `${chalk.red("There was an error in the build process\n")}`
        );
        console.error(err);
    });

function createLegacyBuildShim() {
    // Create an empty bower_components folder if bower.json exists and there isn't one.
    // This is a shim for some older build tools that don't handle this well.
    console.log()
    const $bowerJsonPath = path.resolve(workingDirectory, 'bower.json');
    const $bowerComponentsPath = path.resolve(workingDirectory, 'bower_components');

    if (fs.existsSync($bowerJsonPath) && !fs.existsSync($bowerComponentsPath)) {
        fs.mkdirSync($bowerComponentsPath);
    }
}

/**
 * Check if a node dependancy has been installed and is on the path. Installs if it can't find it.
 *
 * @param {string} packageName The name of the node dependacny
 * @returns Promise<boolean>
 * @throws {Error} If the install process fails
 */
async function checkGlobalNodeDependancyInstalled(packageName) {
    return new Promise((resolve, reject) => {
        console.log(
            `Checking that build tool ${chalk.yellow(
                packageName
            )} is installed globally.`
        );
        const whichProcess = exec(
            `which ${packageName}`,
            (err, stdout, stderr) => {
                if (stdout) {
                    console.log(
                        chalk.green(
                            `${packageName} is installed globally. Proceding with build process.`
                        )
                    );
                    return resolve(true);
                }

                console.log(
                    chalk.yellow(
                        `${packageName} is not installed globally. Installing it now.`
                    )
                );

                const installProcess = spawn(
                    "npm",
                    ["install", "-g", packageName],
                    conditionalSpawnOptions
                );
                installProcess.on("error", err => {
                    console.log(
                        chalk.red(
                            `\nThere was an issue installing ${packageName}. Aborting build process.\n`
                        )
                    );
                    return reject(err);
                });

                installProcess.on("close", () => {
                    console.log(
                        chalk.green(
                            `${packageName} install successfull. Proceding with build process.`
                        )
                    );
                    return resolve(true);
                });
            }
        );
    });
}

/**
 * Conditionally run an npm task if it exists
 *
 * @returns {boolean} Whether or not the task existed
 */
async function runNpmTaskIfExists() {
    const packageJson = await utility.getPackageJson(workingDirectory);

    if (!packageJson) {
        isVerbose &&
            console.log(
                `No ${chalk.yellow("package.json")} found in ${chalk.cyan(
                    workingDirectory
                )}. Skipping npm tasks check.`
            );
        return false;
    }

    if (!packageJson.scripts[command]) {
        isVerbose &&
            console.log(
                `Script '${chalk.yellow(command)}' not found in ${chalk.cyan(
                    `${workingDirectory}/package.json`
                )}. Skipping npm tasks check.`
            );
        return false;
    }

    // Script exists. Execute it.
    isVerbose &&
        console.log(
            `Package.json script ${chalk.yellow(
                command
            )} found. Starting script.`
        );

    return await utility.spawnChildProcess(
        "npm",
        ["run", command, "--", "--color"],
        spawnOptions
    );
}

/**
 * Conditionally run a gulp task if it exists.
 *
 * @returns {undefined}
 */
async function runGulpTaskIfExists() {
    const gulpFilePath = path.resolve(workingDirectory, "gulpfile.js");

    if (!fs.existsSync(gulpFilePath)) {
        isVerbose &&
            console.log(
                `${chalk.yellow("gulpfile")} not found in ${chalk.cyan(
                    workingDirectory
                )}. Skipping gulp task check`
            );

        return false;
    }

    const gulpfile = JSON.parse(fs.readFileSync(gulpFilePath, 'utf8'));
    if (!gulpfile.tasks) {
        throw new Error(
            `${chalk.yellow(
                "gulpfile"
            )} found but no tasks were found. Be sure to export gulp at the end of your gulpfile.

    ${chalk.green("module.exports = gulp")}`
        );
    }

    const gulpTasks = Object.keys(gulpfile.tasks).sort();

    if (!gulpTasks[command]) {
        // If there command is build, it may also be the default gulp task.
        if (command === "build") {
            if (gulpTasks["default"]) {
                command = "default";
            } else {
                throw new Error(
                    `${chalk.yellow("gulpfile")} found but no ${chalk.cyan(
                        command
                    )} or ${chalk.cyan(
                        "default"
                    )} task was defined. Exiting build process.`
                );
            }
        } else {
            throw new Error(
                `${chalk.yellow("gulpfile")} found but no ${chalk.cyan(
                    command
                )} task was defined. Exiting build process.`
            );
        }
    }

    // Task exists. Execute it.
    await checkGlobalNodeDependancyInstalled("gulp");
    console.log(`Gulp task ${command} found. Starting gulp ${command} process`);
    await utility.spawnChildProcess(
        "gulp",
        [command, "--", "--color"],
        spawnOptions
    );
}

/**
 * Fetch all the grunt tasks in working directories grunt file by parsing `gulp --help`
 *
 * @returns {Promise<string[]>}
 */
async function getGruntTasks() {
    return new Promise(resolve => {
        const gruntHelpProcess = exec(
            "grunt --help --no-color",
            (err, stdout, stderr) => {
                const trimmedOutput = /Available tasks([\s\S]+) \n\n/.exec(
                    stdout
                );
                const result = trimmedOutput
                    ? trimmedOutput[1]
                          .trim()
                          .split("\n")
                          .map(x => x.trim().split("  ")[0])
                    : [];

                resolve(result);
            }
        );
    });
}

/**
 * Conditionally run a grunt task if it exists
 *
 * @returns
 */
async function runGruntTaskIfExists() {
    const gruntfilePath = path.resolve(workingDirectory, "gruntfile.js");

    if (!fs.existsSync(gruntfilePath)) {
        isVerbose &&
            console.log(
                `${chalk.yellow("gruntfile")} not found in ${chalk.cyan(
                    workingDirectory
                )}. Skipping grunt task checks`
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
        throw new Error(
            `${chalk.yellow(
                "gruntfile"
            )} found but no tasks were found. Aborting build process.`
        );
    }

    if (!gruntTasks.includes(command)) {
        throw new Error(
            `${chalk.yellow("gruntfile")} found but no ${chalk.cyan(
                command
            )} task was defined. Exiting build process.`
        );
    }

    // Tasks exists. Execute it.
    console.log(
        `Grunt task ${command} found. Starting grunt ${command} process`
    );
    await utility.spawnChildProcess("grunt", [command, "--color"], spawnOptions);
}

/**
 * Check if a package is installed and on the path
 *
 * @param {string} packageName The name of the package
 * @returns {Promise}
 */
async function checkDependencyOnPath(packageName) {
    return new Promise((resolve, reject) => {
        exec(`which ${packageName}`, (err, stdout, stderr) => {
            if (err) {
                return reject(err);
            }

            if (!stdout) {
                return reject(
                    `Package ${chalk.yellow(
                        packageName
                    )} does not exist or found in your path. It is required for a legacy ruby build process.`
                );
            }

            resolve(true);
        });
    });
}

/**
 * Run the ruby bundler to install all gems from a Gemfile
 *
 * @returns {Promise}
 */
async function runBundler() {
    await checkDependencyOnPath("bundler");
    console.log("Installing Ruby Gems.\n");

    return new Promise((resolve, reject) => {
        const bundlerProcess = spawn("bundler", ["install"], {
            stdio: "inherit"
        });
        bundlerProcess.on("error", err => {
            return reject(err);
        });

        bundlerProcess.on("close", code => {
            if (code === 0) {
                console.log(`Ruby gems installed successfully.`);
            }
            resolve();
        });
    });
}

/**
 * Conditionally run a ruby task if it exists.
 *
 * @returns {Promise}
 */
async function runRubyTaskIfExists() {
    const gemfilePath = path.resolve(workingDirectory, "Gemfile");

    if (!fs.existsSync(gemfilePath)) {
        isVerbose &&
            console.log(
                `${chalk.yellow("Gemfile")} not found in ${chalk.cyan(
                    workingDirectory
                )}. Skipping ruby checks.`
            );

        return false;
    }

    await checkDependencyOnPath("ruby");
    await runBundler();

    isVerbose && console.log("Beginning Ruby build process");
    if (command === "build") {
        await utility.spawnChildProcess("compass", ["compile"], spawnOptions);
    } else if (command === "watch") {
        await utility.spawnChildProcess("compass", ["watch"], spawnOptions);
    }
}
