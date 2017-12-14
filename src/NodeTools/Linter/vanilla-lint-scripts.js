/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const { CLIEngine } = require("eslint");

const { print, sleep } = require("../library/utility");
const ESLintUtil = require("./eslint-util");

module.exports = lintScripts;

/**
 * Lint the given scripts with the given options.
 *
 * @async
 * @param {string[]} files - An array of file names or globs.
 * @param {Object} stylelintOptions - The ESLint configuration object.
 *
 * @returns {Promise.<void>}
 */
async function lintScripts(files, eslintOptions) {
    const eslint = new CLIEngine(eslintOptions);
    const filesWithoutStyles = files.filter(fileName => {
        return !/.scss$/.test(fileName)
    });

    const report = eslint.executeOnFiles(filesWithoutStyles);
    const formatter = eslint.getFormatter("stylish");

    print("\nJavascript Lint Results:");

    await sleep(1000);
    print(ESLintUtil.formatSummary(report.results));
    print(formatter(report.results));
}
