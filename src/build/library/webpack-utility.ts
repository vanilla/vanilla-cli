/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import path from "path";
import fs from "fs";
import webpack, { Configuration } from "webpack";
import merge from "webpack-merge";
import babelPreset from "@vanillaforums/babel-preset";
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

    const includes = new Set([oldScriptsPath]);

    // Add the realpaths as well because filesystems are complicated and the user could run the tool
    // from the realpath or the symlink depending on the OS and shell.
    includes.forEach(include => {
        if (fs.existsSync(include)) {
            includes.add(fs.realpathSync(include));
        } else {
            includes.delete(include);
        }
    });

    const commonConfig: Configuration = {
        cache: true,
        context: buildRoot,
        module: {
            rules: [
                {
                    test: /\.jsx?$/,
                    exclude: ["node_modules"],
                    include: [
                        ...Array.from(includes),
                        // We need to transpile quill's ES6 because we are building form source.
                        /\/node_modules\/quill/,
                        /\/node_modules\/\@vanillaforums/,
                    ],
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
            modules: [path.join(buildRoot, "node_modules"), "node_modules"],
            alias: {
                quill$: path.join(buildRoot, "node_modules/quill/quill.js"),
            },
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
                            ...babelPreset,
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
