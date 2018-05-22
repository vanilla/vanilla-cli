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
import PrettierPlugin from "prettier-webpack-plugin";
import HappyPack from "happypack";
import ForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import chalk from "chalk";
import { printVerbose, getAllCoreBuildAddons } from "./utility";
import glob from "glob";

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

    if (options.buildOptions.process === "core") {
        const coreBuildAddons = getAllCoreBuildAddons(options);
        coreBuildAddons.forEach(coreAddon => {
            includes.add(path.join(coreAddon, "./src/scripts"));
        });
    }

    // Add the realpaths as well because filesystems are complicated and the user could run the tool
    // from the realpath or the symlink depending on the OS and shell.
    includes.forEach(include => {
        if (fs.existsSync(include)) {
            includes.add(fs.realpathSync(include));
        } else {
            includes.delete(include);
        }
    });

    let commonConfig: Configuration = {
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

    commonConfig = mergeTypescriptConfig(options, commonConfig, Array.from(includes));

    // @ts-ignore
    return merge(commonConfig, options.watch || options.hot ? devConfig : prodConfig);
}

function mergeTypescriptConfig(options: ICliOptions, config: Configuration, includedFiles: string[]) {
    // Push in the prettier plugin.
    const prettierFile = path.join(options.vanillaDirectory, "prettier.config.js");
    const tsConfigFile = path.join(options.vanillaDirectory, "tsconfig.json");
    const tslintFile = path.join(options.vanillaDirectory, "tslint.json");

    if (fs.existsSync(prettierFile) && !options.skipPrettify) {
        const prettierConfig = require(prettierFile);
        config.plugins!.unshift(
            new PrettierPlugin({
                ...prettierConfig,
                parser: "typescript",
                extensions: [".ts", ".tsx"],
            }),
        );
    }

    if (fs.existsSync(tsConfigFile)) {
        // Push in happypack and the typechecker
        config.plugins!.push(
            new HappyPack({
                id: "ts",
                verbose: options.verbose,
                threadPool: happyThreadPool,
                loaders: [
                    {
                        path: "ts-loader",
                        query: {
                            happyPackMode: true,
                            configFile: tsConfigFile,
                        },
                    },
                ],
            }),
        );
        config.plugins!.push(
            new ForkTsCheckerWebpackPlugin({
                tsconfig: tsConfigFile,
                tslint: fs.existsSync(tslintFile) ? tslintFile : undefined,
                checkSyntacticErrors: true,
                async: true,
            }),
        );

        // Push in the loaders
        config.module!.rules.push({
            test: /\.tsx?$/,
            exclude: ["node_modules"],
            include: includedFiles,
            use: [
                {
                    loader: "happypack/loader?id=ts",
                },
            ],
        });
    }

    return config;
}

/**
 * Spread "*" declarations among all other sections.
 *
 * @param exports - The exports to transform.
 */
<<<<<<< HEAD:src/NodeTools/library/webpack-utility.js
function preprocessWebpackExports(exports, addonDirectory) {
=======
export function preprocessWebpackExports(exports: IBuildExports) {
    if (!("*" in exports)) {
        return exports;
    }

>>>>>>> Convert to typescript:src/Build/library/webpack-utility.ts
    const star = exports["*"];
    const output: any = {};

    const expandGlobs = (items) => {
        const newItems = [];

        items.forEach(item => {
            if (!item.includes("*")) {
                newItems.push(item);
            }

            const resolvedPath = path.join(addonDirectory, item);
            newItems.concat(glob.sync(resolvedPath));
        });

        return newItems;
    };

    for (const [key, value] of Object.entries(exports)) {
        if (key === "*") {
            continue;
        }

<<<<<<< HEAD:src/NodeTools/library/webpack-utility.js
        output[key] = [
            ...expandGlobs(star),
            ...expandGlobs(value),
        ];
=======
        output[key] = [...star, ...value];
>>>>>>> Convert to typescript:src/Build/library/webpack-utility.ts
    }

    exports = output;


    return exports;
}

/**
 * Generate aliases for any required addons.
 *
 * Aliases will always be generated for core, applications/vanilla, and applications/dashboard
 *
 * @param options
 * @param forceAll - Force the function to make aliases for every single addon.
 */
export function getAliasesForRequirements(options: ICliOptions, forceAll = false) {
    const { vanillaDirectory, requiredDirectories } = options;
    if (!requiredDirectories) {
        return {};
    }

    const allowedKeys = requiredDirectories.map(dir => {
        return path.basename(dir);
    });

    allowedKeys.push("vanilla", "dashboard");

<<<<<<< HEAD:src/NodeTools/library/webpack-utility.js
    const result = {};
    ['applications', 'addons', 'plugins', 'themes'].forEach(topDirectory => {
=======
    const result: { [key: string]: string } = {
        "@core": path.resolve(vanillaDirectory, "src/scripts"),
    };
    ["applications", "addons", "plugins", "themes"].forEach(topDirectory => {
>>>>>>> Convert to typescript:src/Build/library/webpack-utility.ts
        const fullTopDirectory = path.join(vanillaDirectory, topDirectory);

        if (fs.existsSync(fullTopDirectory)) {
            const subdirs = fs.readdirSync(fullTopDirectory);
            subdirs.forEach(addonKey => {
                const key = `@${addonKey}`;

                const shouldAddResult = !result[key] && (forceAll || allowedKeys.includes(addonKey));
                if (shouldAddResult) {
                    result[key] = path.join(vanillaDirectory, topDirectory, addonKey, "src/scripts");
                }
            });
        }
    });

    const outputString = Object.keys(result).join(chalk.white(", "));
    printVerbose(`Using aliases: ${chalk.yellow(outputString)}`);
    return result;
}
