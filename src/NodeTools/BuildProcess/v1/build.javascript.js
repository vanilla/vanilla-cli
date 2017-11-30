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
const chalk = require("chalk");
const { print, printError } = require("../../library/utility");
const { createBaseConfig } = require("../../library/webpack");
const babelPreset = require("../../library/babel.preset");

/**
 * Create the javascript build process.
 *
 * @param {string} addonDirectory - The directory to build from.
 * @param {options} options - The build options.
 *
 * @return {function} A gulp execution function.
 */
module.exports = (addonDirectory, options) => callback => {
    let jsEntries = options.buildOptions.entries;

    Object.keys(jsEntries).forEach(entryKey => {
        const filePath = path.join("./src/js", jsEntries[entryKey]);

        if (fs.existsSync(filePath)) {
            print(chalk.yellow(`Using Entrypoint: ${filePath}`));
        } else {
            // Don't throw if the "default" entry point is not found.
            if (/index.js/.test(jsEntries[entryKey])) {
                delete jsEntries[entryKey];
            } else {
                print(chalk.red(`Entrypoint provided but not found: ${filePath}`));
                throw new Error();
            }
        }
    });

    if (Object.keys(jsEntries).length === 0) {
        jsEntries = false;
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
