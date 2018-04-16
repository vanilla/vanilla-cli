/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const merge = require("webpack-merge");
const babelPreset = require("@vanillaforums/babel-preset");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const { CheckerPlugin } = require('awesome-typescript-loader')
const chalk = require("chalk").default;

const {
    printVerbose,
    getAllCoreBuildAddons,
} = require("./utility");

module.exports = {
    createBaseConfig,
    preprocessWebpackExports,
    getAliasesForRequirements,
};

/**
 * Create the base configuration for webpack builds.
 *
 * Notably this is missing entry/output configs. Be sure to provide those.
 *
 * @param {string} buildRoot - The root path of the addon being built.
 * @param {BuildOptions} options - Which way to build.
 *
 * @returns {Object}
 */
function createBaseConfig(buildRoot, options, shouldUglifyProd = true) {

    const oldScriptsPath = path.join(buildRoot, "./src/js");

    const includes = new Set([
        oldScriptsPath,
    ]);

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
            delete includes[include];
        }
    });

    const commonConfig = {
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
                            loader: "babel-loader",
                            options: {
                                ...babelPreset,
                                cacheDirectory: true
                            }
                        }
                    ]
                },
                {
                    test: /\.tsx?$/,
                    exclude: ["node_modules"],
                    include: Array.from(includes),
                    use: [
                        {
                            loader: "awesome-typescript-loader",
                            options: {
                                // compiler: require.resolve("typescript"),
                                configFileName: path.resolve(options.vanillaDirectory, "tsconfig.json"),
                                useBabel: true,
                                useCache: true,
                                babelOptions: {
                                    babelrc: false,
                                    ...babelPreset,
                                },
                                babelCore: require.resolve("babel-core"),
                            }
                        }
                    ]
                },
                {
                    test: /\.svg$/,
                    use: [
                            {
                            loader: 'html-loader',
                            options: {
                                minimize: true
                            }
                        }
                    ]
                }
            ]
        },
        resolve: {
            modules: [path.join(buildRoot, "node_modules"), "node_modules"],
            alias: {
                'quill$': path.join(buildRoot, 'node_modules/quill/quill.js'),
            },
            extensions: [".ts", ".tsx", ".js", ".jsx", ".svg"]
        },

        /**
         * We need to manually tell webpack where to resolve our loaders.
         * This is because process.cwd() probably won't contain the loaders we need
         * We are expecting thirs tool to be used in a different directory than itself.
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
            }),
            new CheckerPlugin(),
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

    const prettierFile = path.join(options.vanillaDirectory, ".prettierrc.json");

    if (fs.existsSync(prettierFile)) {
        const prettierConfig = require(prettierFile);

        const prettierTsLoader = {
            test: /\.tsx?$/,
            use: {
                loader: 'prettier-loader',
                options: {
                    ...prettierConfig,
                    parser: "typescript",
                },
            },
            // force this loader to run first
            enforce: 'pre',
            // avoid running prettier on all the files!
            // use it only on your source code and not on dependencies!
            exclude: /node_modules/,
        }

        commonConfig.module.rules.push(prettierTsLoader);
    }

    // @ts-ignore
    return merge(commonConfig, options.watch || options.hot ? devConfig : prodConfig);
}

/**
 * Spread "*" declarations among all other sections.
 *
 * @param {Object} exports - The exports to transform.
 *
 * @returns {Object}
 */
function preprocessWebpackExports(exports) {
    if (!("*" in exports)) {
        return exports;
    }

    const star = exports["*"];
    const output = {};

    for (const [key, value] of Object.entries(exports)) {
        if (key === "*") {
            continue;
        }

        output[key] = [
            ...star,
            ...value,
        ];
    }

    return output;
}

/**
 * Generate aliases for any required addons.
 *
 * Aliases will always be generated for core, applications/vanilla, and applications/dashboard
 *
 * @param {BuildOptions} options
 * @param {boolean=} forceAll - Force the function to make aliases for every single addon.
 *
 * @returns {Object}
 */
function getAliasesForRequirements(options, forceAll = false) {
    const { vanillaDirectory, requiredDirectories } = options;

    const allowedKeys = requiredDirectories.map(dir => {
        return path.basename(dir);
    })

    allowedKeys.push("vanilla", "dashboard", "core");

    const result = {
        '@core': path.resolve(vanillaDirectory, 'src/scripts'),
    };
    ['applications', 'addons', 'plugins', 'themes'].forEach(topDirectory => {
        const fullTopDirectory = path.join(vanillaDirectory, topDirectory);

        if(fs.existsSync(fullTopDirectory)) {
            const subdirs = fs.readdirSync(fullTopDirectory);
            subdirs.forEach(addonKey => {
                const key = `@${addonKey}`;

                const shouldAddResult = !result[key] && (forceAll || allowedKeys.includes(addonKey));
                if (shouldAddResult) {
                    result[key] = path.join(vanillaDirectory, topDirectory, addonKey, 'src/scripts');
                }
            });
        }
    });

    const outputString = Object.keys(result).join(chalk.white(", "));
    printVerbose(`Using aliases: ${chalk.yellow(outputString)}`);
    return result;
}
