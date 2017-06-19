// @ts-check

const path = require("path");
const fs = require("fs");
const {spawn} = require('child_process');

const ADDON_TYPE = {
    PLUGIN: "plugin",
    THEME: "theme",
    APPLICATION: "application",
    LEGACY: "legacy"
};

/**
 * @typedef {Object} BuildOptions
 * @property {?boolean} isWatchMode Whether to run the build tool in watch mode
 * @property {?boolean} isCleanMode Whether to delete the build artificats before compiling again
 * @property {?string} buildProcessVersion The version of the build process to use.
 */

/** Class representing an a build tool for frontend vanilla
 * @class
 * @property {?Object} addonInfo An object representation of the themes addon.json
 * @property {string} addonDirectory The directory of the addon to build into/from
 * @property {string} version The version of the build process to use. Maps to a folder in ./versions
 * @property {options} BuildOptions Arguments passed from the command line
 */
class VanillaBuildTool {
    constructor() {
        this.addonInfo = undefined;
        this.addonDirectory = undefined;
        this.version = undefined;
        this.options = {};

        this.spawnChildBuildProcess = this.spawnChildBuildProcess.bind(this);
        this.parseAddonJson = this.parseAddonJson.bind(this);
        this.checkFileExists = this.checkFileExists.bind(this);
    }

    /**
     * Create an instance of the build tool.
     *
     * DO NOT use the constructor directly. Some async IO operations need to take place,
     * and js does not have async constructors.
     *
     * @static
     * @param {string} [addonDirectory=""] The directory of the addon.
     * @param {BuildOptions} options Arguments passed from the command line
     *
     * @memberof VanillaBuildTool
     */
    static async create(addonDirectory = "", options) {
        const instance = new VanillaBuildTool();

        instance.addonDirectory = addonDirectory;
        instance.addonInfo = await instance.parseAddonJson();
        instance.version = instance.addonInfo.version || 'legacy';
        instance.spawnChildBuildProcess();
    }

    /**
     * Spawn a child build process.
     *
     *  This keeps a reference to the child process in case we want to do something with it later.
     *
     * @memberof VanillaBuildTool
     */
    spawnChildBuildProcess() {
        this.childProcess = spawn("gulp", [
            `--addonpath`,
            `${this.addonDirectory}`,
            '--color'
        ], { stdio: 'inherit' });
    }

    /**
     * Parse the addon's addon.json file.
     *
     * @returns {Promise<Object, Error>} The object representation of the addon.json file.
     *
     * @memberof VanillaBuildTool
     */
    async parseAddonJson() {
        const packagePath = path.resolve(this.addonDirectory, "./addon.json");

        return new Promise((resolve, reject) => {
            fs.readFile(packagePath, "utf8", (err, data) => {
                if ((err.code === 'ENOENT')) {
                    resolve({});
                } else {
                    reject(err);
                }

                const addonInfo = JSON.parse(data);
                resolve(addonInfo);
            });
        });
    }

    /**
     * Check file exists or not.
     *
     * @param {string} filePath The absolute path of the file.
     * @returns {boolean}
     *
     * @memberof VanillaBuildTool
     */
    checkFileExists(filePath) {
        return new Promise(resolve => {
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }
};

module.exports = VanillaBuildTool;
