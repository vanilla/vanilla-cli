const chalk = require("chalk");
const table = require("text-table");
const {pluralize} = require("../utility");

module.exports = {
    formatSummary,
    formatFixableArray,
    formatDetails: require("eslint-friendly-formatter"),
    makeFixFunction,
};

function formatFixableArray(results) {
    const fixableRules = new Set();

    for (const result of results) {
        if (result.messages) {
            for (const message of result.messages) {
                if (message.fix) {
                    fixableRules.add(message.ruleId);
                }
            }
        }
    }

    return Array.from(fixableRules);
}

/**
 * Print a short table summary of the different
 *
 * @param results
 *
 * @returns {string}
 */
function formatSummary(results) {
    let errorCount = 0;
    let failureCount = 0;
    let passCount = 0;
    let warningCount = 0;

    results.forEach(function (result) {

        const messages = result.messages;

        if (messages.length === 0) {
            passCount++;
        } else {
            failureCount++;
            warningCount += result.warningCount;
            errorCount += result.errorCount;
        }

    });

    const fileCount = passCount + failureCount;

    const summaryLineArray = [
        chalk.bold(fileCount + " " + pluralize("file", fileCount) + " checked."),
        chalk.green.bold(passCount + " passed."),
        chalk.red.bold(failureCount + " failed."),
    ];

    if (warningCount || errorCount) {
        summaryLineArray.push(chalk.yellow.bold(warningCount + " " + pluralize("warning", warningCount) + "."));
        summaryLineArray.push(chalk.red.bold(errorCount + " " + pluralize("error", errorCount) + "."));
    }

    return `\n${table([summaryLineArray])}\n`;
}

/**
 * Creates a fixing function or boolean that can be provided as eslint's `fix` option.
 *
 * @param  {array|boolean|undefined} rules Either an array of rules, true/false, or a undefined.
 *
 * @return {function|boolean} `fix` option for eslint.
 */
function makeFixFunction(rules) {
    if (typeof rules === "undefined") {
        return true;
    }

    if (typeof rules === "boolean") {
        return rules;
    }

    return (eslintMessage) => rules.includes(eslintMessage.ruleId);
}
