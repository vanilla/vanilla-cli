/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const {spawn} = require('child_process');
const path = require('path');
const chalk = require('chalk');
const VanillaBuildTool = require('./VanillaBuildTool');
const VanillaUtility = require('./VanillaUtility');
const argv = require('yargs').argv;

const addonDirectory = process.cwd();

async function intialize() {
    const options = VanillaUtility.parseCliOptions(argv.options);
    const BuildTool = VanillaBuildTool.create(addonDirectory, options);
}

intialize()
    .then(() => {

    }).catch(err => {
        console.error(err);
    });
