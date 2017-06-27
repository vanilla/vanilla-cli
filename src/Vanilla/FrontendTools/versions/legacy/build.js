const { spawn } = require("child_process");

const VanillaUtility = require("../../VanillaUtility");
const Messages = require("../../Messages");

/**
 * Run the `npm run build` command in the addon directory
 *
 * @param {string} addonPath The path of the addon
 * @returns {Promise<void, Error>}
 */
async function runBuildProcess(addonPath) {
    const packageJson = await VanillaUtility.getPackageJson(addonPath);

    if (!packageJson || !packageJson.scripts.build) {
        console.log(Messages.ERROR_NO_LEGACY_BUILD_PROCESS(addonPath));
        return;
    }

    console.log(Messages.STARTING_BUILD_PROCESS('legacy'));
    process.chdir(addonPath);
    spawn("npm", ["run", "build", "--","--color"], {stdio: "inherit"});
}

module.exports = runBuildProcess;
