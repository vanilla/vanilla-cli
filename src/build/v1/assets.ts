/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import gulp from "gulp";
import fs from "fs";
import path from "path";
import size from "gulp-size";
import cache from "gulp-cache";
import imagemin from "gulp-imagemin";
import chalk from "chalk";
import { print } from "../library/utility";

/**
 * Gulp build process for images.
 *
 * @param addonDirectory - The directory to build from.
 * @param options - The build options.
 *
 * @return A gulp execution function.
 */
const buildAssets = (addonDirectory: string, options: ICliOptions) => (cb: any) => {
    if (!fs.existsSync(path.join(addonDirectory, "src/images"))) {
        print(chalk.yellowBright("No images found. Skipping assets build."));
        cb();
        return;
    }

    const process = gulp
        .src(path.join(addonDirectory, "src/images/**/*"))
        .pipe(
            cache(
                imagemin({
                    optimizationLevel: 3,
                    progressive: true,
                    interlaced: true,
                }),
            ),
        )
        .pipe(gulp.dest(path.join(addonDirectory, "design/images")));

    if (options.verbose) {
        process.pipe(size({ showFiles: true }));
    }

    return process;
};

export default buildAssets;
