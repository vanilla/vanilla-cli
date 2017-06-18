const {spawn} = require('child_process');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue("Building javascript for your current directory"));

const addonDirectory = process.cwd();
process.chdir(path.resolve(__dirname, './versions/1.0'));

const childProcess = spawn('gulp', [
    `--addonpath`, `${addonDirectory}`,
])

childProcess.stdout.on('data', function(data) {
    if (data) console.log(data.toString())
})

childProcess.stderr.on('data', function(data) {
    if (data) console.log(data.toString())
})
