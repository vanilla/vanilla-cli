const gulp = require('gulp');
const argv = require('yargs').argv;

const utils = require('../../utilities');

const buildJs = require('./build.javascript');
const buildStyles = require('./build.stylesheets');
const buildAssets = require('./build.assets');

const addonpath = argv.addonpath;

gulp.task('build:js', () => {
    return utils.getJsEntries(addonpath)
        .then((jsfiles) => {
            console.log(jsfiles);
            return buildJs(addonpath, jsfiles);
        });
});

gulp.task('default', ['build:js']);
