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

    const expectedEntryPoint = "./index.js";

    if (Object.keys(jsEntries).length > 1 || jsEntries["custom"] !== expectedEntryPoint) {
        printError("The build process v1 does not currently support custom entry points. \nhttps://docs.vanillaforums.com/developer/vanilla-cli/build-process-v1/#javascript\n\nFor custom entrypoints see the build process core.");
        return;
    }

    if (!fs.existsSync(path.join(addonDirectory, 'src/js', expectedEntryPoint))) {
        print(chalk.yellowBright("Javascript entrypoint src/js/index.js not found. Skipping JS build."));
        return;
    }

    const v1Config = {
        entry: {
            custom: path.resolve(addonDirectory, "./src/js/index.js")
        },
        output: {
            filename: "[name].js"
        }
    };

    const baseConfig = createBaseConfig(addonDirectory, options);
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
