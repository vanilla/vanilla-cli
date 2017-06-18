const {spawn} = require('child_process');
const path = require('path');
const chalk = require('chalk');
const VanillaBuildTool = require('./VanillaBuildTool');

console.log(chalk.blue("Building javascript for your current directory"));

const addonDirectory = process.cwd();
process.chdir(path.resolve(__dirname, './versions/1.0'));

async function intialize() {
    const BuildTool = VanillaBuildTool.create(addonDirectory);
}

intialize()
    .then(() => {

    }).catch(err => {
        console.error(err);
    });
