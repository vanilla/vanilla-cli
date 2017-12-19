/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const gulp = require("gulp");
const chalk = require("chalk").default;
const makeV1StylesheetBuilder = require("../../BuildProcess/v1/build.stylesheets");
const { print } = require("../../library/utility");

/**
 * Build the stylesheets and start a watch process if necessary.
 *
 * @param {BuildOptions} options - The Options passed from PHP
 */
module.exports = function buildStyles(options) {
    gulp.task("build", makeV1StylesheetBuilder(options));

    gulp.start("build");
}

