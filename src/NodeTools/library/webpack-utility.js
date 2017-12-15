/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const merge = require("webpack-merge");
const babelPreset = require("./babel-preset");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
    createBaseConfig,
};

/**
 * Create the base configuration for webpack builds.
 *
 * Notably this is missing entry/output configs. Be sure to provide those.
 *
 * @param {string} buildRoot - The root path of the addon being built.
 * @param {boolean} isDevMode - Which way to build.
 */
function createBaseConfig(buildRoot, isDevMode, shouldUglifyProd = true) {
    const commonConfig = {
        context: buildRoot,
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    include: [path.join(buildRoot, "./src/js")],
                    exclude: ["node_modules"],
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                ...babelPreset,
                                cacheDirectory: true
                            }
                        }
                    ]
                }
            ]
        },
        resolve: {
            modules: [path.join(buildRoot, "node_modules")],
            extensions: [".js", ".jsx"]
        },

        /**
         * We need to manually tell webpack where to resolve our loaders.
         * This is because process.cwd() probably won't contain the loaders we need
         * We are expecting this tool to be used in a different directory than itself.
         */
        resolveLoader: {
            modules: [path.resolve(__dirname, "../node_modules")]
        },
        output: {
            filename: "[name].js"
        }
    };

    const devConfig = {
        cache: true,
        devtool: "eval-source-map",
        plugins: [
            // Prevent a bad build from crashing the process.
            new webpack.NoEmitOnErrorsPlugin(),
            // Some libraries have dev enviroment specific behaviour
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("development")
            })
        ]
    };

    const prodConfig = {
        devtool: "source-map",
        plugins: [
            // NODE_ENV should be production so that modules do not perform certain development checks
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("production")
            })
        ]
    };

    if (shouldUglifyProd) {
        prodConfig.plugins.push(
            // @ts-ignore
            new UglifyJsPlugin({
                sourceMap: true
            })
        );
    }

    // @ts-ignore
    return merge(commonConfig, isDevMode ? devConfig : prodConfig);
}
