const { CLIEngine } = require("eslint");

const { print } = require("../utility");
const ESLintUtil = require("./eslint-util");

module.exports = lintScripts;

function lintScripts(files, eslintOptions) {
    const eslint = new CLIEngine(eslintOptions);

    const report = eslint.executeOnFiles(files);
    const formatter = eslint.getFormatter("stylish");

    print(ESLintUtil.formatSummary(report.results));
    print(formatter(report.results));
}
