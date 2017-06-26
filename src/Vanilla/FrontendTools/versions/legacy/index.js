const argv = require("yargs").argv;
const addonpath = argv.addonpath;
const options = JSON.parse(argv.options);

const runBuild = require("./build");
const runWatch = require("./watch");

if (options.isWatchMode) {
    runWatch(addonpath).then().catch(err => {
        console.error(err);
    });
} else {
    runBuild(addonpath).then().catch(err => {
        console.error(err);
    });
}
