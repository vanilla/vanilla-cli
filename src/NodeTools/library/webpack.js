/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const webpack = require("webpack");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const merge = require("webpack-merge");
const babelPreset = require("./babel.preset");

module.exports = {
    createBaseConfig
};

function createBaseConfig(buildRoot, isDevMode) {
    const commonConfig = {
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    include: [path.resolve(buildRoot, "./src/js")],
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
            modules: [path.resolve(buildRoot, "node_modules"), path.resolve(buildRoot, "./src/js")],
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
            })
            // new webpack.LoaderOptionsPlugin({
            //     debug: true
            // })
        ]
    };

    const prodConfig = {
        devtool: "source-map",
        plugins: [
            // NODE_ENV should be production so that modules do not perform certain development checks
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("production")
            }),
            new UglifyJsPlugin({
                sourceMap: true
            })
        ]
    };

    return merge(commonConfig, isDevMode ? devConfig : prodConfig);
}
