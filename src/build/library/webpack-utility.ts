/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import path from "path";
import fs from "fs";
import webpack, { Configuration } from "webpack";
import merge from "webpack-merge";
import UglifyJsPlugin from "uglifyjs-webpack-plugin";
import HappyPack from "happypack";

const happyThreadPool = HappyPack.ThreadPool({ size: 4, id: "scripts" });

/**
 * Create the base configuration for webpack builds.
 *
 * Notably this is missing entry/output configs. Be sure to provide those.
 *
 * @param buildRoot - The root path of the addon being built.
 * @param options - Which way to build.
 */
export function createBaseConfig(buildRoot: string, options: ICliOptions, shouldUglifyProd = true) {
    const oldScriptsPath = path.join(buildRoot, "./src/js");

    const commonConfig: Configuration = {
        cache: true,
        context: buildRoot,
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    exclude: () => false,
                    use: [
                        {
                            loader: "happypack/loader?id=babel",
                        },
                    ],
                },
                {
                    test: /\.svg$/,
                    use: [
                        {
                            loader: "html-loader",
                            options: {
                                minimize: true,
                            },
                        },
                    ],
                },
            ],
        },
        resolve: {
            modules: [
                path.join(buildRoot, "node_modules"),
                "node_modules",
                path.resolve(__dirname, "../../../node_modules"),
            ],
            extensions: [".ts", ".tsx", ".js", ".jsx", ".svg"],
        },
        plugins: [
            new HappyPack({
                id: "babel",
                verbose: options.verbose,
                threadPool: happyThreadPool,
                loaders: [
                    {
                        path: "babel-loader",
                        query: {
                            presets: [require.resolve("@vanilla/babel-preset")],
                            cacheDirectory: true,
                        },
                    },
                ],
            }),
        ],

        /**
         * We need to manually tell webpack where to resolve our loaders.
         * This is because process.cwd() probably won't contain the loaders we need
         * We are expecting thirs tool to be used in a different directory than itself.
         */
        resolveLoader: {
            modules: [path.resolve(__dirname, "../../../node_modules")],
        },
        output: {
            filename: "[name].js",
        },
        stats: "minimal",
    };

    const devConfig: Configuration = {
        mode: "development",
        devtool: "eval-source-map",
        plugins: [
            // Some libraries have dev enviroment specific behaviour
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("development"),
            }),
        ],
        optimization: {
            noEmitOnErrors: true,
        },
    };

    const prodConfig = {
        devtool: "source-map",
        mode: "production",
        plugins: [
            // NODE_ENV should be production so that modules do not perform certain development checks
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("production"),
            }),
        ],
    };

    if (shouldUglifyProd) {
        prodConfig.plugins.push(
            // @ts-ignore
            new UglifyJsPlugin({
                sourceMap: true,
            }),
        );
    }

    // @ts-ignore
    return merge(commonConfig, options.watch || options.hot ? devConfig : prodConfig);
}
