/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

// General purpose imports
import path from "path";
import fs from "fs";

// Webpack specific imports
import webpack, { Stats } from "webpack";
import stream from "webpack-stream";
import merge from "webpack-merge";
import gulp from "gulp";
import chalk from "chalk";
import { print, printError } from "../library/utility";
import { createBaseConfig } from "../library/webpack-utility";

/**
 * Create the javascript build process.
 *
 * @param addonDirectory - The directory to build from.
 * @param options - The build options.
 *
 * @return A gulp execution function.
 */
const buildScripts = (addonDirectory: string, options: ICliOptions) => () => {
    const jsEntries = options.buildOptions.entries;

    const expectedEntryPoint = "./index.js";

    if (Object.keys(jsEntries).length > 1 || jsEntries.custom !== expectedEntryPoint) {
        printError(
            "The build process v1 does not currently support custom entry points. \nhttps://docs.vanillaforums.com/developer/vanilla-cli/build-process-v1/#javascript\n\nFor custom entrypoints see the build process core.",
        );
        return;
    }

    if (!fs.existsSync(path.join(addonDirectory, "src/js", expectedEntryPoint))) {
        print(chalk.yellowBright("Javascript entrypoint src/js/index.js not found. Skipping JS build."));
        return;
    }

    const v1Config = {
        entry: {
            custom: path.resolve(addonDirectory, "./src/js/index.js"),
        },
        output: {
            filename: "[name].js",
        },
    };

    const baseConfig = createBaseConfig(addonDirectory, options);
    const finalConfig = merge(baseConfig, v1Config);

    return gulp
        .src("")
        .pipe(
            stream(finalConfig, webpack, (err: Error, stats: Stats) => {
                print(
                    stats.toString({
                        colors: true,
                    }),
                );
            }),
        )
        .pipe(gulp.dest(path.resolve(addonDirectory, "./js")));
};

export default buildScripts;
