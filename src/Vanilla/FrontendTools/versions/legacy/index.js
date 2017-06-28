const argv = require("yargs").argv;
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");
const { spawn, exec } = require("child_process");
const VanillaUtility = require("../../VanillaUtility");

const addonpath = argv.addonpath;
const options = JSON.parse(argv.options);
const isVerbose = options.verbose || false;
let command = options.watch ? "watch" : "build";
const workingDirectory = process.cwd();

const spawnOptions = {
    stdio: "inherit"
};


const conditionalSpawnOptions = {};
if (isVerbose) {
    conditionalSpawnOptions.stdio = "inherit";
}

async function run() {
    const npmTaskExists = await runNpmTaskIfExists();

    if (!npmTaskExists) {
        await runGulpTaskIfExists();
        await runGruntTaskIfExists();
        await runRubyTaskIfExists();
    }
}

run()
    .then(() => {
        console.log(chalk.green("Build process completed successfully."));
    })
    .catch(err => {
        console.error(`${chalk.red("There was an error in the build process\n")}
`);
        console.error(err);
    });

async function spawnChildBuildProcess(command, args, options) {
    return new Promise((resolve, reject) => {
        const task = spawn(command, args, options);

        task.on("close", () => {
            return resolve(true);
        });

        task.on("error", err => {
            return reject(err);
        });
    });
}

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

async function runNpmTaskIfExists() {
    const packageJson = await VanillaUtility.getPackageJson(workingDirectory);

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

    return await spawnChildBuildProcess(
        "npm",
        ["run", command, "--", "--color"],
        spawnOptions
    );
}

async function runGulpTaskIfExists() {
    const gulpFilePath = path.join(workingDirectory, "gulpfile.js");

    if (!fs.existsSync(gulpFilePath)) {
        isVerbose &&
            console.log(
                `${chalk.yellow("gulpfile")} not found in ${chalk.cyan(
                    workingDirectory
                )}. Skipping gulp task check`
            );

        return;
    }

    const gulpfile = require(gulpFilePath);
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
    await spawnChildBuildProcess(
        "gulp",
        [command, "--", "--color"],
        spawnOptions
    );
}

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

async function runGruntTaskIfExists() {
    const gruntfilePath = path.join(workingDirectory, "gruntfile.js");

    if (!fs.existsSync(gruntfilePath)) {
        isVerbose &&
            console.log(
                `${chalk.yellow("gruntfile")} not found in ${chalk.cyan(
                    workingDirectory
                )}. Skipping grunt task checks`
            );

        return;
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
    await spawnChildBuildProcess("grunt", [command, "--color"], spawnOptions);
}

async function checkDependencyOnPath(package) {
    return new Promise((resolve, reject) => {
        exec(`which ${package}`, (err, stdout, stderr) => {
            if (err) {
                return reject(err);
            }

            if (!stdout) {
                return reject(
                    `Package ${chalk.yellow(
                        package
                    )} does not exist or found in your path. It is required for a legacy ruby build process.`
                );
            }

            resolve(true);
        });
    });
}

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

async function runRubyTaskIfExists() {
    const gemfilePath = path.join(workingDirectory, "Gemfile");

    if (!fs.existsSync(gemfilePath)) {
        isVerbose &&
            console.log(
                `${chalk.yellow("Gemfile")} not found in ${chalk.cyan(
                    workingDirectory
                )}. Skipping ruby checks.`
            );

        return;
    }

    await checkDependencyOnPath("ruby");
    await runBundler();

    isVerbose && console.log("Beginning Ruby build process");
    if (command === "build") {
        await spawnChildBuildProcess("compass", ["compile"], spawnOptions);
    } else if (command === "watch") {
        await spawnChildBuildProcess("compass", ["watch"], spawnOptions);
    }
}
