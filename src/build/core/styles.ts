/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */
import path from "path";
import gulp from "gulp";
import chalk from "chalk";
import { print } from "../library/utility";
import StylesheetBuilder from "../library/StylesheetBuilder";

/**
 * Build the stylesheets and start a watch process if necessary.
 *
 * @param options - The Options passed from PHP
 * @param callback - A callback to be called when the event is build is finished.
 */
export default function buildStyles(options: ICliOptions, callback?: () => void) {
    gulp.task("build", new StylesheetBuilder(options).compiler);

    if (callback) {
        gulp.on("task_stop", callback);
    }

    gulp.start("build");
}
