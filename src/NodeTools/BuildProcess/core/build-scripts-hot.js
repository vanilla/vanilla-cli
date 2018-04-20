/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const fs = require("fs");
const os = require("os");
const glob = require("glob");
const webpack = require("webpack");
const merge = require("webpack-merge");
const express = require("express");
const chalk = require("chalk").default;
const devMiddleware = require("webpack-dev-middleware");
const hotMiddleware = require("webpack-hot-middleware");
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');

const {
    createBaseConfig,
    getAliasesForRequirements,
} = require("../../library/webpack-utility");
const {
    print,
    printError,
    getAllCoreBuildEntries,
    getAllCoreBuildAddons,
    fail,
} = require("../../library/utility");

module.exports = {
    run,
};

/**
 * Build a webpack configuration for a subset of entries.
 *
 * @param {Object} entries - An Object of "sectionKey => string[]"
 * @param {string} sectionKey - The section key to build a config for.
 * @param {BuildOptions} options
 */
function buildConfigForSection(entries, sectionKey, options) {
    if (!(sectionKey in entries)) {
        fail(`Could not build section ${sectionKey}, as no addons have defined that section.`);
    }
    const filteredEntries = entries[sectionKey];

    const baseConfig = createBaseConfig(options.vanillaDirectory, options);

    const config = merge(baseConfig, {
        name: sectionKey,
        entry: {
            [sectionKey]: [
                require.resolve('webpack-hot-middleware/client')
                + "?dynamicPublicPath=true"
                + "&path=__webpack_hmr"
                + `&name=${sectionKey}`
                + "&reload=true",
                ...filteredEntries,
            ]
        },
        output: {
            filename: `${sectionKey}-hot-bundle.js`,
            chunkFilename: `[name]-${sectionKey}-hot-chunk.js`,
            publicPath: "http://127.0.0.1:3030/",
        },
        resolve: {
            alias: getAliasesForRequirements(options, true),
        },
        plugins: [
            new HardSourceWebpackPlugin({
                // Either an absolute path or relative to webpack's options.context.
                cacheDirectory: path.normalize(path.join(__dirname, '../../node_modules/.cache/hard-source/[confighash]')),
            }),
            new webpack.HotModuleReplacementPlugin(),
        ],
    });

    const coreBuildNodeModules = getAllCoreBuildAddons(options).map(addonDirectory => {
        return path.join(addonDirectory, "node_modules");
    })

    config.resolve.modules.unshift(...coreBuildNodeModules);

    return config;
}

/**
 * Run the hot javascript build process.
 *
 * @param {BuildOptions} options
 */
function run(options) {
    try {
        const entries = getAllCoreBuildEntries(options);

        let config;

        if (options.section) {
            config = [buildConfigForSection(entries, options.section, options)];
        } else {
            config = Object.keys(entries)
                .filter(section => section !== "polyfills")
                .map(entryKey => {
                    return buildConfigForSection(entries, entryKey, options);
                });
        }

        const compiler = webpack(config);
        const app = express();

        // Allow CORS
        app.use(function(req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });

        app.use(devMiddleware(compiler, {
            publicPath: "http://127.0.0.1:3030/",
            stats: {
                chunks: false, // Makes the build much quieter
                modules: false,
                colors: true // Shows colors in the console
            }
        }));

        app.use(hotMiddleware(compiler));

        app.listen(3030, () => {
            print("Dev server listening on port 3030.");

            print(
                "Complete hot reload setup by adding the following to your vanilla config file.\n" +
                chalk.bold.red(`$Configuration["HotReload"]["Enabled"] = true;\n`)
            );
        });

    } catch (err) {
        if (options.verbose) {
            throw err;
        } else {
            printError(err);
        }
    }
}
