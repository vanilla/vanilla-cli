// @ts-check

const chalk = require('chalk');

module.exports.ERROR_WRONG_VERSION = (inputtedVersion, validVersions) => `
${chalk.red.bold(`Build Error - Incorrect Process Version Number`)}

Build Process Version ${chalk.yellow.bold(inputtedVersion)} is not a valid version.

Currently valid versions are
    ${chalk.green(validVersions)}`;

module.exports.STARTING_BUILD_PROCESS = (version) => `
${chalk.yellow(`Starting Build Process version ${version}`)}
`
