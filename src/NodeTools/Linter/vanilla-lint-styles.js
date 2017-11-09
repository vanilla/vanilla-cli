const stylelint  = require("stylelint");
const { print, sleep } = require("../utility");

module.exports = lintStyles;

/**
 * Lint the given stylesheets with the given options.
 *
 * @async
 * @param {string[]} files - An array of file names or globs.
 * @param {Object} stylelintOptions - The StyleLint configuration object.
 *
 * @returns {Promise.<void>}
 */
async function lintStyles(files, stylelintOptions) {
    const totalOptions = Object.assign({}, stylelintOptions, {
        files,
    });

    print("\nLinting Stylesheets:");
    await sleep(500);

    const data = await stylelint.lint(totalOptions);
    const {output} = data;

    print(output);
}
