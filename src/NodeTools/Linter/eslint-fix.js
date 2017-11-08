const {CLIEngine} = require("eslint");
const ESlintUtils = require("./eslint-util");
const inquirer = require("inquirer");
const chalk = require("chalk");
const path = require("path");

function getCounts(messages) {
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
 * Trim down the results from eslint.
 *
 * @param {object} report The report to filter
 * @param {string} messageKey Name of the message property on which to filter
 * @param {object} options Options to use for comparison
 *
 * @return {object} Report object which only contains messages that pass filter
 */
function filterResults(report, messageKey, options) {
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
            const {errorCount, warningCount, fixableErrorCount, fixableWarningCount} = getCounts(filteredMessages);
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

const getRuleReport = (report, ruleName) => filterResults(report, "ruleId", {compareVal: ruleName});

/**
 *
 * @param {string[]} files An array of files to lint
 * @param {string} configLocation The location of the configuration file
 */
module.exports = async function runFix(files, configLocation) {
    console.log(files);

    const cli = new CLIEngine({
        configFile: configLocation,
        ignorePath: path.resolve(__dirname, "configs/.eslintignore"),
    });
    const report = cli.executeOnFiles(files);

    if (report && (report.errorCount > 0 || report.warningCount > 0)) {

        // Check if there was a fatal error
        const fatalReport = getFatalResults(report);
        if (fatalReport) {
            const errorFormatter = cli.getFormatter("stylish");
            const errors = errorFormatter(fatalReport);
            console.log(errors);
            console.error("Fatal error(s) were detected. Please correct and try again.");
            return 1;
        }

        // Show summary
        console.log(ESlintUtils.formatSummary(report.results));

        const statsArray = ESlintUtils.formatFixableArray(report.results);
        const answers = await promptFixes(report, statsArray);
        const { rules } = answers;

        if (answers.fix) {
            const eslintCli = new CLIEngine({
                configFile: configLocation,
                fix: ESlintUtils.makeFixFunction(rules),
                ignorePath: path.resolve(__dirname, "configs/.eslintignore"),
            });

            const toFixReport = eslintCli.executeOnFiles(files);
            CLIEngine.outputFixes(toFixReport);

            const fixedReport = eslintCli.executeOnFiles(files);

            console.log();

            for (const rule of rules) {
                const ruleReport = getRuleReport(fixedReport, rule);

                if (ruleReport.errorCount > 0 || ruleReport.warningCount > 0) {
                    console.log(chalk.yellow(`Unable to automatically fix all errors and warnings for ${rule}.`));
                } else {
                    console.log(chalk.green(`Fixes applied, ${rule} is now passing`));
                }
            }
        } else {
            for (const rule of rules) {
                const ruleReport = getRuleReport(report, rule);
                console.log(ESlintUtils.formatDetails(ruleReport.results));
            }
        }
    } else {
        console.log(chalk.green("Great job, all lint rules passed."));
    }
};

function promptFixes(report, stats) {
    const prompts = [{
        name: "rules",
        type: "checkbox",
        message: "Which rules would you like to fix?",
        choices: stats,
        pageSize: stats.length,
    }, {
        name: "fix",
        type: "confirm",
        message: (answers) => {
            const selectedRules = answers.rules.join(", ");
            return `Would you like to attempt to auto-fix ${chalk.yellow(selectedRules)}?`;
        },
        default: false,
        when(answers) {
            for (const rule of answers.rules) {
                const ruleReport = getRuleReport(report, rule);
                if ( ruleReport.fixableErrorCount > 0 || ruleReport.fixableWarningCount > 0) {
                    return true;
                }
            }

            return false;
        },
    }];

    return inquirer.prompt(prompts);
}

function getFatalResults(report) {
    const fatalResults = filterResults(report, "fatal", {present: true});
    if (fatalResults.errorCount > 0) {
        return fatalResults;
    }
    return undefined;
}
