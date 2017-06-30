/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license http://www.opensource.org/licenses/gpl-2.0.php GNU GPL v2
 */

// General purpose imports
const path = require("path");

// Webpack specific imports
const webpack = require("webpack");
const webpackStream = require("webpack-stream");
const merge = require("webpack-merge");

const gulp = require("gulp");

/**
 * create the javascript build process
 */
module.exports = (addonDirectory, options, entries) => {
    if (typeof entries === "string") {
        entries = {
            custom: entries
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
                    use: [{
                        loader: 'babel-loader',
                        options: {
                            presets: path.resolve(__dirname, './node_modules/babel-preset-env'),
                            cacheDirectory: true
                        }
                    }]
                }
            ]
        },
        resolve: {
            modules: [path.resolve(addonDirectory, "node_modules"), path.resolve(addonDirectory, "./src")],
            extensions: [".js", ".jsx"]
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

    return gulp
        .src("")
        .pipe(
            webpackStream(
                options.isWatchMode ? webpackDevConfig : webpackProdConfig,
                webpack,
                (err, stats) => {
                    if (options.isVerboseMode) {
                        console.log(
                            stats.toString({
                                colors: true
                            })
                        );
                    }
                }
            )
        )
        .pipe(gulp.dest(path.resolve(addonDirectory, "./js")));
};