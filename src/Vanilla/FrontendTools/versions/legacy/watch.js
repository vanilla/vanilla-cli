const { spawn } = require("child_process");

const VanillaUtility = require("../../VanillaUtility");
const Messages = require("../../Messages");

async function runWatchProcess(addonPath) {
    const packageJson = await VanillaUtility.getPackageJson(addonPath);

    if (!packageJson || !packageJson.scripts.watch) {
        console.log(Messages.ERROR_NO_LEGACY_WATCH_PROCESS(addonPath));
        return;
    }

    console.log(Messages.STARTING_WATCH_PROCESS("legacy"));
    process.chdir(addonPath);
    spawn("npm", ["run", "watch", "--color"], { stdio: "inherit" });
}

module.exports = runWatchProcess;
