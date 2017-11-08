/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const gulp = require("gulp");
const eslint = require("gulp-eslint");
const stylelint = require("gulp-stylelint");
const argv = require("yargs").argv;
const chalk = require("chalk");
const beep = require("beepbeep");
const lintfix = require("./eslint-fix");
const {formatSummary} = require("./eslint-util");

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


gulp.task("lint:scripts", () => {
    const src = [
        ...options.paths,
        "!**/vendor/**",
        "!**/node_modules/**",
    ];

    return gulp.src(src)
        .pipe(eslint({
            configFile: options.eslintFileLocation,
            warnFileIgnored: true,
            ignorePath: path.resolve(__dirname, "configs/.eslintignore"),
        }))
        .pipe(eslint.results(results => {
            console.log(formatSummary(results));
        }))
        .pipe(eslint.format())
        .on("error", beep);
});

gulp.task("lint:styles", () => {
    const src = path.join(addonpath, "src/**/*.js");

    return gulp.src(src)
        .pipe(stylelint());
});

gulp.task("lint", ["lint:scripts"]);

gulp.task("watch", ["lint:scripts"], () => {

});

console.log(`
Linting with the following config files:
- ESLint: ${chalk.yellow(options.eslintFileLocation)}
- StyleLint: ${chalk.yellow(options.stylelintFileLocation)}
`);
console.log(chalk.green("Starting linting process..."));

if (options.shouldLintScripts) {
    console.log(options.paths);

    if (options.shouldFix) {
        const src = [
            ...options.paths,
            "!**/vendor/**",
            "!**/node_modules/**",
        ];

        lintfix(src, options.eslintFileLocation)
            .then(() => {})
            .catch(e => {
                console.error(e);
            });
    } else {
        gulp.start("lint:scripts");
    }
}

