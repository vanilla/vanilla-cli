/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

// General purpose imports
const path = require("path");

// Webpack specific imports
const webpack = require("webpack");
const webpackStream = require("webpack-stream");
const merge = require("webpack-merge");

// Manually require webpack loaders so that they can get picked up by pkg
require("babel-loader");
require("babel-preset-env");

const gulp = require("gulp");

/**
 * Create the javascript build process
 */
module.exports = (addonDirectory, options, entries) => {
    console.log("Attempting to resolve CLI deps in" + path.resolve(__dirname, "node_modules"));

    if (typeof entries === "string") {
        entries = {
            custom: entries,
        };
    }

    const webpackBaseConfig = {
        entry: entries,
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    include: [path.resolve(addonDirectory, "./src")],
                    exclude: ["node_modules"],
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                presets: path.resolve(__dirname, "./node_modules/babel-preset-env"),
                                cacheDirectory: true,
                            },
                        },
                    ],
                },
            ],
        },
        resolve: {
            modules: [path.resolve(addonDirectory, "node_modules"), path.resolve(addonDirectory, "./src")],
            extensions: [".js", ".jsx"],
        },
        /**
         * We need to manually tell webpack where to resolve our loaders.
         * This is because process.cwd() probably won't contain the loaders we need
         * We are expecting this tool to be used in a different directory than itself.
         */
        resolveLoader: {
            modules: [path.resolve(__dirname, "node_modules")],
        },
        output: {
            filename: "[name].js",
        },
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
                "process.env.NODE_ENV": JSON.stringify("development"),
            }),

            new webpack.LoaderOptionsPlugin({
                debug: true,
            }),
        ],
    });

    const webpackProdConfig = merge(webpackBaseConfig, {
        devtool: "source-map",
        plugins: [
            // NODE_ENV should be production so that modules do not perform certain development checks
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("production"),
            }),
            new webpack.optimize.UglifyJsPlugin({
                sourceMap: true,
            }),
        ],
    });

    return gulp
        .src("")
        .pipe(
            webpackStream(options.isWatchMode ? webpackDevConfig : webpackProdConfig, webpack, (err, stats) => {
                console.log(
                    stats.toString({
                        colors: true,
                    }),
                );
            }),
        )
        .pipe(gulp.dest(path.resolve(addonDirectory, "./js")));
};
