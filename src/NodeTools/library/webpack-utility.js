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
const PrettierPlugin = require("prettier-webpack-plugin");
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const HappyPack = require('happypack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
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

    let commonConfig = {
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
                            loader: 'happypack/loader?id=babel',
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
        plugins: [
            new HardSourceWebpackPlugin({
                // Either an absolute path or relative to webpack's options.context.
                cacheDirectory: path.join(options.vanillaDirectory, 'node_modules/.cache/hard-source/[confighash]'),
            }),
            new HappyPack({
                id: 'babel',
                verbose: options.verbose,
                rules: [
                    {
                        path: 'babel-loader',
                        query: {
                            ...babelPreset,
                            cacheDirectory: false
                        }
                    }
                ]
            }),
        ],

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
        },
        stats: "minimal",
    };

    const devConfig = {
        mode: "development",
        devtool: "eval-source-map",
        plugins: [
            // Some libraries have dev enviroment specific behaviour
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify("development")
            }),
        ],
        optimization: {
            noEmitOnErrors: true,
        }
    };

    const prodConfig = {
        devtool: "source-map",
        mode: "production",
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

    commonConfig = mergeTypescriptConfig(options, commonConfig, includes);

    // @ts-ignore
    return merge(commonConfig, options.watch || options.hot ? devConfig : prodConfig);
}

function mergeTypescriptConfig(options, config, includedFiles) {
    // Push in the prettier plugin.
    const prettierFile = path.join(options.vanillaDirectory, ".prettierrc.json");
    const tsConfigFile = path.join(options.vanillaDirectory, "tsconfig.json");
    const tslintFile = path.join(options.vanillaDirectory, "tslint.json");

    if (fs.existsSync(prettierFile)) {
        const prettierConfig = require(prettierFile);
        config.plugins.unshift(new PrettierPlugin({
            ...prettierConfig,
            parser: "typescript",
            extensions: [".ts", ".tsx"],
        }));
    }

    if (fs.existsSync(tsConfigFile)) {
    // Push in happypack and the typechecker

        config.plugins.push(
            new HappyPack({
                id: 'ts',
                verbose: options.verbose,
                rules: [
                    {
                        path: 'ts-loader',
                        query: {
                            happyPackMode: true,
                            configFile: tsConfigFile
                        }
                    }
                ]
        }));
        config.plugins.push(
            new ForkTsCheckerWebpackPlugin({
                tsconfig: tsConfigFile,
                tslint: fs.existsSync(tslintFile) ? tslintFile : false,
                checkSyntacticErrors: true,
                async: false,
            }),
        );

        // Push in the loaders
        config.module.rules.push({
            test: /\.tsx?$/,
            exclude: ["node_modules"],
            include: Array.from(includedFiles),
            use: [
                {
                    loader: 'happypack/loader?id=ts',
                }
            ]
        })
    }

    return config;
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
