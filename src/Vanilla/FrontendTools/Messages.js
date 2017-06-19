const chalk = require('chalk');

module.exports.ERROR_WRONG_VERSION = (inputtedVersion, validVersions) => `
Build Process Version
    ${chalk.blue(this.version)}
is not a valid version.

Currently valid versions are
    ${validVersions}`;

module.exports.STARTING_BUILD_PROCESS = (version) => `
${chalk.yellow(`Starting Build Process version ${version}`)}
`
