/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

// General purpose imports
const path = require("path");
const fs = require("fs");

// Webpack specific imports
const webpack = require("webpack");
const stream = require("webpack-stream");
const merge = require("webpack-merge");
const gulp = require("gulp");
const chalk = require("chalk").default;
const { print, printError } = require("../../library/utility");
const { createBaseConfig } = require("../../library/webpack-utility");

/**
 * Create the javascript build process.
 *
 * @param {string} addonDirectory - The directory to build from.
 * @param {BuildOptions} options - The build options.
 *
 * @return {any} A gulp execution function.
 */
module.exports = (addonDirectory, options) => () => {
    let jsEntries = options.buildOptions.entries;

    Object.keys(jsEntries).forEach(entryKey => {
        const filePath = path.join(options.rootDirectories[0], 'src/js/index.js')
        const prettyPath = filePath.replace(options.vanillaDirectory, '')

        if (fs.existsSync(filePath)) {
            print(chalk.yellow(`Using Entrypoint: ${prettyPath}`));
            jsEntries[entryKey] = filePath;
        } else {
            // Don't throw if the "default" entry point is not found.
            if (/src\/js\/index\.js/.test(filePath)) {
                delete jsEntries[entryKey];
            } else {
                print(chalk.red(`Entrypoint provided but not found: ${prettyPath}`));
                throw new Error();
            }
        }
    });

    if (Object.keys(jsEntries).length === 0) {
        jsEntries = {};
    }

    const v1Config = {
        entry: jsEntries,
        output: {
            filename: "[name].js"
        }
    };

    const baseConfig = createBaseConfig(addonDirectory, options.watch);
    const finalConfig = merge(baseConfig, v1Config);

    return gulp
        .src("")
        .pipe(
            stream(finalConfig, webpack, (err, stats) => {
                print(
                    stats.toString({
                        colors: true
                    })
                );
            })
        )
        .pipe(gulp.dest(path.resolve(addonDirectory, "./js")));
};
