/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

// General purpose imports
const path = require("path");
const fs = require("fs");

// Webpack specific imports
const webpack = require("webpack");
const webpackStream = require("webpack-stream");
const merge = require("webpack-merge");
const gulp = require("gulp");
const chalk = require("chalk");
const {print, printError} = require("../../utility");

/**
 * Create the javascript build process.
 *
 * @param {string} addonDirectory - The directory to build from.
 * @param {options} options - The build options.
 *
 * @return {function} A gulp execution function.
 */
module.exports = (addonDirectory, options) => () => {
    let jsEntries = options.buildOptions.js.entry;

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
    })

    if (Object.keys(jsEntries).length === 0) {
        jsEntries = false;
    }

    const webpackBaseConfig = {
        entry: jsEntries,
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    include: [path.resolve(addonDirectory, "./src/js")],
                    exclude: ["node_modules"],
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                presets: path.resolve(__dirname, "./node_modules/babel-preset-env"),
                                cacheDirectory: true
                            }
                        }
                    ]
                }
            ]
        },
        resolve: {
            modules: [path.resolve(addonDirectory, "node_modules"), path.resolve(addonDirectory, "./src/js")],
            extensions: [".js", ".jsx"]
        },
        /**
         * We need to manually tell webpack where to resolve our loaders.
         * This is because process.cwd() probably won't contain the loaders we need
         * We are expecting this tool to be used in a different directory than itself.
         */
        resolveLoader: {
            modules: [path.resolve(__dirname, "node_modules")]
        },
        output: {
            filename: "[name].js"
        }
    };

    const webpackDevConfig = merge(webpackBaseConfig, {
        watch: true,
        cache: true,
        devtool: "eval-source-map",
        plugins: [
            // “If you are using the CLI, the webpack process will not exit with an error code by enabling this plugin.”
            // https://github.com/webpack/docs/wiki/list-of-plugins#noerrorsplugin
            new webpack.NoEmitOnErrorsPlugin(),
            // Some libraries have dev enviroment specific behaviour
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("development")
            }),

            new webpack.LoaderOptionsPlugin({
                debug: true
            })
        ]
    });

    const webpackProdConfig = merge(webpackBaseConfig, {
        devtool: "source-map",
        plugins: [
            // NODE_ENV should be production so that modules do not perform certain development checks
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("production")
            }),
            new webpack.optimize.UglifyJsPlugin({
                sourceMap: true
            })
        ]
    });

    const configToRun = options.watch ? webpackDevConfig : webpackProdConfig;

    return gulp
        .src("")
        .pipe(
            webpackStream(configToRun, webpack, (err, stats) => {
                print(
                    stats.toString({
                        colors: true
                    })
                );
            })
        )
        .pipe(gulp.dest(path.resolve(addonDirectory, "./js")));
};
