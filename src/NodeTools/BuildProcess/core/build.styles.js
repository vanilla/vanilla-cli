const path = require("path");
const gulp = require("gulp");
const livereload = require("gulp-livereload");
const chalk = require("chalk").default;
const makeV1StylesheetBuilder = require("../../BuildProcess/v1/build.stylesheets");

const { print } = require("../../library/utility");

/**
 * Build the stylesheets and start a watch process if necessary.
 *
 * @param {BuildOptions} options - The Options passed from PHP
 */
module.exports = function buildStyles(options) {
    const primaryDirectory = options.rootDirectories.slice(0, 1)[0];
    const parentDirectories = options.rootDirectories.slice(1, options.rootDirectories.length);

    gulp.task("build", makeV1StylesheetBuilder(primaryDirectory, parentDirectories, options.buildOptions.cssTool));

    gulp.task("watch", ["build"], () => {
        livereload.listen();

        const onReload = file => livereload.changed(file.path);

        gulp.watch(path.resolve(primaryDirectory, "design/*.css"),
            onReload
        );

        const { cssTool } = options.buildOptions;

        gulp.watch(path.resolve(primaryDirectory, `src/**/*.${cssTool}`), ["build"]);

        print("\n" + chalk.green('Watching for changes in stylesheets...'));
    });

    const taskToExecute = options.watch ? "watch" : "build";
    gulp.start(taskToExecute);
}

