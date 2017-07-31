/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const chalk = require('chalk');

module.exports = {
    ERROR_WRONG_VERSION,
    STARTING_BUILD_PROCESS,
    STARTING_WATCH_PROCESS,
    ERROR_NO_LEGACY_BUILD_PROCESS,
    ERROR_NO_LEGACY_WATCH_PROCESS
}

function ERROR_WRONG_VERSION (inputtedVersion, validVersions) {
    return `
${chalk.red.bold(`Build Error - Incorrect Process Version Number`)}

Build Process Version ${chalk.yellow.bold(inputtedVersion)} is not a valid version.

Currently valid versions are
    ${chalk.green(validVersions)}`;
}

function STARTING_BUILD_PROCESS (version) {
    return `
${chalk.yellow(`Starting Build Process version ${version}`)}
`;
}

function STARTING_WATCH_PROCESS (version) {
    return `
${chalk.yellow(`Starting Build Process version ${version} in watch mode.`)}
`;
}

function ERROR_NO_LEGACY_BUILD_PROCESS (addonPath) {
    return `
${chalk.red.bold('Build Error - No Build Process Found')}

No build process was found for the addon in the directory
    ${chalk.yellow(addonPath)}

This is addon is attempting to use the legacy build process but does not
declare an npm script for ${chalk.green('build')}

Either create this script or change your buildProcess version.
`
}

function ERROR_NO_LEGACY_WATCH_PROCESS (addonPath) {
    return `
${chalk.red.bold('Build Error - No Build Process (watch mode) found')}

No watch process was found for the addon in the directory
    ${chalk.yellow(addonPath)}

This is addon is attempting to use the legacy build process but does not
declare an npm script for ${chalk.green('watch')}

Either create this script or change your buildProcess version.
`
}
