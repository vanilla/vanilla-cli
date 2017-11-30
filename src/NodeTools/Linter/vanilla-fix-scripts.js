/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const { CLIEngine } = require("eslint");
const ESlintUtils = require("./eslint-util");
const { print, printError } = require("../library/utility");
const inquirer = require("inquirer");
const chalk = require("chalk");

module.exports = fixScripts;

/**
 * Interactively fix user supplied rules in the provided files.
 *
 * @async
 * @param {array} files - An array of file paths or globs to fix.
 * @param {pbject} eslintOptions - The options to spawn ESLint with.
 *
 * @returns {Promise<void>}
 */
async function fixScripts(files, eslintOptions) {
    const cli = new CLIEngine(eslintOptions);

    const filesWithoutStyles = files.filter(fileName => {
        return !/.scss$/.test(fileName)
    });

    const report = cli.executeOnFiles(filesWithoutStyles);

    if (report && (report.errorCount > 0 || report.warningCount > 0)) {

        // Check if there was a fatal error
        const fatalReport = ESlintUtils.filterReportByFatal(report);
        if (fatalReport) {
            const errorFormatter = cli.getFormatter("stylish");
            const errors = errorFormatter(fatalReport.results);
            print(errors);
            printError("Fatal error(s) were detected. Please correct and try again.");
        }

        const fixableRules = ESlintUtils.getFixableRulesFromReport(report);

        if (fixableRules.length === 0) {
            print(chalk.yellow("No fixable errors or warnings were found."));
            return;
        }

        const answers = await promptFixes(report, fixableRules);
        const { rules } = answers;

        if (answers.fix) {
            const fixEslintOptions = Object.assign({}, eslintOptions, {
                fix: ESlintUtils.makeFixFunction(rules),
            });
            const eslintCli = new CLIEngine(fixEslintOptions);

            const toFixReport = eslintCli.executeOnFiles(files);
            CLIEngine.outputFixes(toFixReport);

            const fixedReport = eslintCli.executeOnFiles(files);

            print();

            for (const rule of rules) {
                const ruleReport = ESlintUtils.filterReportByRule(fixedReport, rule);

                if (ruleReport.errorCount > 0 || ruleReport.warningCount > 0) {
                    print(chalk.yellow(`Unable to automatically fix all errors and warnings for ${rule}.`));
                } else {
                    print(chalk.green(`Fixes applied, ${rule} is now passing`));
                }
            }
        } else {
            for (const rule of rules) {
                const ruleReport = ESlintUtils.filterReportByRule(report, rule);
                print(ESlintUtils.formatDetails(ruleReport.results));
            }
        }
    } else {
        print(chalk.green("Great job, all lint rules passed."));
    }
}

/**
 * Prompt the user for which rules they want to fix.
 *
 * @param {Object} report - An ESLint report.
 * @param {string[]} rules - An array of rule names.
 *
 * @returns {Promise<Object[]>} A promise of answers to the prompt.
 */
function promptFixes(report, rules) {
    const prompts = [{
        name: "rules",
        type: "checkbox",
        message: "Which rules would you like to fix?",
        choices: rules,
        pageSize: rules.length,
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
                const ruleReport = ESlintUtils.filterReportByRule(report, rule);
                if ( ruleReport.fixableErrorCount > 0 || ruleReport.fixableWarningCount > 0) {
                    return true;
                }
            }

            return false;
        },
    }];

    return inquirer.prompt(prompts);
}
