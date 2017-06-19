// General purpose imports
const path = require("path");

// Webpack specific imports
const webpack = require("webpack");
const webpackStream = require("webpack-stream");
const merge = require("webpack-merge");

// Gulp specific imports
const gulp = require("gulp");

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
                    loaders: ["babel-loader?cacheDirectory=true"]
                }
            ]
        },
        resolve: {
            modules: [path.resolve(addonDirectory, "./src"), "node_modules"],
            extensions: [".js", ".jsx"]
        },
        output: {
            filename: "[name].js"
        }
    };

    const webpackDevConfig = merge(webpackBaseConfig, {
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
