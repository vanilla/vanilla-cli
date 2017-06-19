const {spawn} = require('child_process');
const path = require('path');
const chalk = require('chalk');
const VanillaBuildTool = require('./VanillaBuildTool');
const argv = require("yargs").argv;


console.log(chalk.blue("Building javascript for your current directory"));

console.log(argv);

const addonDirectory = process.cwd();
process.chdir(path.resolve(__dirname, './versions/1.0'));

function extractOptions() {
    const options = JSON.parse(argv.options);
    const isWatchMode = !!options.watch;
    return {
        isWatchMode: !!options.watch,
        isCleanMode: !!options.clean,
        buildProcessVersion: options.process || false
    }
}

async function intialize() {
    const options = extractOptions();
    const BuildTool = VanillaBuildTool.create(addonDirectory);
}

intialize()
    .then(() => {

    }).catch(err => {
        console.error(err);
    });
