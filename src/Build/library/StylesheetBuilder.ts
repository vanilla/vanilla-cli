/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import gulp from "gulp";
import util from "gulp-util";
import path from "path";
import glob from "globby";
import chalk from "chalk";
import plumber from "gulp-plumber";
import sourcemaps from "gulp-sourcemaps";
import cssnano from "gulp-cssnano";
import autoprefixer from "gulp-autoprefixer";
import size from "gulp-size";
import modifyFile from "gulp-modify-file";
import { print, printVerbose, printError } from "./utility";
import SassTool from "./SassTool";

export default class StylesheetBuilder {
    private sassTool: SassTool;
    constructor(private cliOptions: ICliOptions) {
        const { rootDirectories } = this.cliOptions;
        this.sassTool = new SassTool(rootDirectories);
    }

    public compiler = () => {
        const { rootDirectories, buildOptions } = this.cliOptions;
        const destination = path.resolve(rootDirectories[0], "design");

        const minifier = process.env.NODE_ENV !== "test" ? cssnano : util.noop;
        const sourceGlobs = this.getSourceGlobs();
        glob.sync(sourceGlobs).forEach(srcFile => {
            const prettyPath = srcFile.replace(this.cliOptions.vanillaDirectory, "");
            print(chalk.yellow(`Using Entrypoint: ${prettyPath}`));
        });

        const compiler = gulp
            .src(sourceGlobs)
            .pipe(plumber())
            .pipe(sourcemaps.init())
            .pipe(modifyFile(this.sassTool.swapPlaceholders))
            .pipe(this.getStyleSheetBuilder())
            .pipe(
                autoprefixer({
                    browsers: ["ie > 9", "last 6 iOS versions", "last 4 versions"],
                }),
            )
            .pipe(minifier())
            .pipe(sourcemaps.write("."))
            .pipe(gulp.dest(destination));

        if (process.env.NODE_ENV !== "test") {
            compiler.pipe(size({ showFiles: true }));
        }

        return () => compiler;
    };

    /**
     * Get the entrypoint CSS files. This is always in the "oldest" parent.
     *
     * @return The entrypoints
     */
    private getSourceGlobs(): string[] {
        const { rootDirectories, buildOptions } = this.cliOptions;
        const rootTheme = rootDirectories.slice(-1)[0];
        const srcDir = path.resolve(rootTheme, "src");

        // Ignore partials as entrypoints.
        return [
            path.join(srcDir, `${buildOptions.cssTool}/**/*.${buildOptions.cssTool}`),
            "!" + path.join(srcDir, `${buildOptions.cssTool}/**/_*.${buildOptions.cssTool}`),
        ];
    }

    /**
     * Get the proper stylesheet tool. Currently supports less & sass.
     */
    private getStyleSheetBuilder() {
        if (this.cliOptions.buildOptions.cssTool === "less") {
            const less = require("gulp-less");
            return less();
        } else {
            const sass = require("gulp-sass");
            // @ts-ignore
            return sass({ importer: this.sassTool.importer });
        }
    }
}
