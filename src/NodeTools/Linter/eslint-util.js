const chalk = require("chalk");
const table = require("text-table");
const { pluralize } = require("../utility");

module.exports = {
    formatSummary,
    getFixableRulesFromReport,
    formatDetails: require("eslint-friendly-formatter"),
    makeFixFunction,
    filterReportByRule,
    filterReportByFatal,
};

/**
 * Get all fixable rules in a report.
 *
 * @param {Object} report - An ESLint report.

 * @returns {string[]} The fixable rules.
 */
function getFixableRulesFromReport(report) {
    const fixableRules = new Set();

    for (const result of report.results) {
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
 * Print a short table summary with general details from the results.
 *
 * @param {array} results - A list of results from an ESLint report.
 *
 * @returns {string} The output to be printed.
 */
function formatSummary(results) {
    let errorCount = 0;
    let failureCount = 0;
    let passCount = 0;
    let warningCount = 0;

    results.forEach((result) => {

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
 * Creates a fixing function or boolean that can be provided as ESLint's `fix` option.
 *
 * @param {array|boolean|undefined} rules - Either an array of rules, true/false, or a undefined.
 *
 * @returns {function|boolean} `fix` option for eslint.
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

/**
 * Get the Counts from an ESLint report.
 *
 * @param {array} messages - An array of messages from an ESLint report.
 *
 * @returns {Object} An object contain the
 */
function calculateCountsFromMessages(messages) {
    const counts = messages.reduce((result, message) => {
        if (message.severity === 1) {
            result.warningCount++;
            if (message.fix) {
                result.fixableWarningCount++;
            }
        }
        if (message.severity === 2) {
            result.errorCount++;

            if (message.fix) {
                result.fixableErrorCount++;
            }
        }
        return result;
    }, {errorCount: 0, warningCount: 0, fixableErrorCount: 0, fixableWarningCount: 0});

    return counts;
}

/**
 * Filter a report to only have contents around a single rule.
 *
 * @param {Object} report - The report.
 * @param {string} ruleName - The rule to filter by.

 * @returns {Object} A new filtered report.
 */
function filterReportByRule(report, ruleName) {
    return filterReport(report, "ruleId", {compareVal: ruleName});
}

function filterReportByFatal(report) {
    const fatalResults = filterReport(report, "fatal", {present: true});
    if (fatalResults.errorCount > 0) {
        return fatalResults;
    }
    return undefined;
}

/**
 * Filter an ESLint report based on message type.
 *
 * @param {Object} report - The report to filter.
 * @param {string} messageKey - Name of the message property on which to filter
 * @param {Object} options - Options to use for comparison
 *
 * @returns {Object} Report object which only contains messages that pass filter
 */
function filterReport(report, messageKey, options) {
    const output = {};
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalFixableErrors = 0;
    let totalFixableWarnings = 0;

    output.results = report.results.map((result) => {
        const filteredMessages = result.messages.filter((msg) => {
            if (options.present) {
                return (msg[messageKey]);
            }
            if (options.compareVal) {
                return (msg[messageKey] === options.compareVal);
            }
            return false;
        });

        if (filteredMessages) {
            const {errorCount, warningCount, fixableErrorCount, fixableWarningCount} = calculateCountsFromMessages(filteredMessages);
            totalErrors += errorCount;
            totalWarnings += warningCount;
            totalFixableErrors += fixableErrorCount;
            totalFixableWarnings += fixableWarningCount;

            // fixableErrors += fixableErrors;
            return {
                filePath: result.filePath,
                messages: filteredMessages,

                errorCount,
                warningCount,
                fixableErrorCount,
                fixableWarningCount,
            };
        }
        return {};
    });
    output.errorCount = totalErrors;
    output.warningCount = totalWarnings;
    output.fixableErrorCount = totalFixableErrors;
    output.fixableWarningCount = totalFixableWarnings;
    return output;
}
