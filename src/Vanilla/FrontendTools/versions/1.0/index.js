const argv = require("yargs").argv;
const path = require("path");
const { spawn } = require("child_process");

const workingDirectory = process.cwd();
const processDirectory = __dirname;
const gulpFileLocation = path.resolve(__dirname, "./gulpfile.js");
const gulpLocation = path.resolve(__dirname, "./node_modules/gulp/bin/gulp.js");

console.log(gulpFileLocation);

const gulp = spawn(
    gulpLocation,
    ["--color","--gulpfile", gulpFileLocation, "--workingDirectory", workingDirectory, '--options', argv.options, ],
    { stdio: "inherit" }
);
gulp.on("close", () => {
});
