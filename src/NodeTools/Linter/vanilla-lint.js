/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const argv = require("yargs").argv;
const chalk = require("chalk");
const chokidar = require("chokidar");

const { print, printError } = require("../utility");
const lintScripts = require("./vanilla-lint-scripts");
const lintStyles = require('./vanilla-lint-styles');
const fixScripts = require("./vanilla-fix-scripts");

const addonpath = process.cwd();
const passedOptions = JSON.parse(argv.options);

const options = {
    isVerboseMode: passedOptions.verbose,
    isWatchMode: passedOptions.watch,
    shouldLintScripts: passedOptions.scripts.enable,
    shouldFix: passedOptions.fix,
    shouldLintStyles: passedOptions.styles.enable,
    eslintFileLocation: path.resolve(addonpath, passedOptions.scripts.configFile),
    stylelintFileLocation: path.resolve(addonpath, passedOptions.styles.configFile),
    paths: passedOptions.paths,
};

print(`\nLinting with the following config files:`);
if (options.shouldLintScripts) {
    print(`- ESLint: ${chalk.yellow(options.eslintFileLocation)}`);
}
if (options.shouldLintStyles) {
    print(`- StyleLint: ${chalk.yellow(options.stylelintFileLocation)}`);
}
print(chalk.green("\nStarting linting process..."));

const files = [
    ...options.paths,
    "!**/vendor/**",
    "!**/node_modules/**",
];

const stylelintFiles = [
    ...files,
    "!**/*.js",
    "!**/*.jsx",
];

const eslintFiles = [
    ...files,
    "!**/*.scss",
];

const eslintOptions = {
    configFile: options.eslintFileLocation,
    warnFileIgnored: true,
    ignorePath: path.resolve(__dirname, "configs/.eslintignore"),
};

const stylelintConfigOverrides = {
    plugins: ["stylelint-scss"]
}

const stylelintOptions = {
    configFile: options.stylelintFileLocation,
    configOverrides: stylelintConfigOverrides,
    configBasedir: path.resolve(__dirname),
    formatter: 'verbose',
    syntax: "scss",
};

startProcess()
    .then()
    .catch(err => {
        printError(err);
    });


/**
 * Startup the linting process
 *
 * @async
 *
 * @returns {Promise<void>}
 */
async function startProcess() {
    if (options.shouldLintStyles) {
        await lintStyles(stylelintFiles, stylelintOptions);
    }

    if (options.shouldLintScripts) {
        await lintScripts(eslintFiles, eslintOptions);
    }

    if (options.shouldFix) {
        await fixScripts(eslintFiles, eslintOptions);
    } else if (options.isWatchMode) {
        const ignoredFiles = [
            "**/vendor/**",
            "**/node_modules/**",
        ];

        if (!options.shouldLintStyles) {
            ignoredFiles.push("**/*.scss");
        }

        if (!options.shouldLintScripts) {
            ignoredFiles.push("**/*.js");
        }

        const watcher = chokidar.watch(files, {
            ignored: ignoredFiles,
        });

        watcher
            .on("ready", () => {
                print(chalk.green("Listening for file changes..."));
            })
            .on("change", (path) => {
                print(chalk.bold(`\nChange detected in ${path}.`));
                lintScriptOrStylesheet(path).then();
                print(chalk.green(`Listening for file changes...`));
            });
    }
}

/**
 * Check the file ending of a changed file and lint it with the proper linter.
 *
 * @async
 * @param {string} filePath - The file to lint.
 *
 * @return {void}
 */
async function lintScriptOrStylesheet(filePath) {
    if (filePath.endsWith('.scss')) {
        await lintStyles([filePath], stylelintOptions);
    } else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        await lintScripts([filePath], eslintOptions);
    }
}
