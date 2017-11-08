/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const argv = require("yargs").argv;
const chalk = require("chalk");
const chokidar = require("chokidar");

const { print } = require("../utility");
const fixScripts = require("./vanilla-fix-scripts");
const lintScripts = require("./vanilla-lint-scripts");

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

print(`
Linting with the following config files:
- ESLint: ${chalk.yellow(options.eslintFileLocation)}
- StyleLint: ${chalk.yellow(options.stylelintFileLocation)}
`);
print(chalk.green("Starting linting process..."));

if (options.shouldLintScripts) {
    const eslintOptions = {
        configFile: options.eslintFileLocation,
        warnFileIgnored: true,
        ignorePath: path.resolve(__dirname, "configs/.eslintignore"),
    };

    const files = [
        ...options.paths,
        "!**/vendor/**",
        "!**/node_modules/**",
    ];

    lintScripts(files, eslintOptions);

    if (options.shouldFix) {
        fixScripts(files, eslintOptions);
    } else if (options.isWatchMode) {
        const scriptsWatcher = chokidar.watch(files, {
            ignored: [
                "**/vendor/**",
                "**/node_modules/**",
            ],
        });

        scriptsWatcher
            .on("ready", () => {
                print(chalk.green("Listening for file changes..."));
            })
            .on("change", (path) => {
                print(chalk.bold(`\nChange detected in ${path}.`));
                lintScripts([path], eslintOptions);
                print(chalk.green(`Listening for file changes...`));
            });
    }
}
