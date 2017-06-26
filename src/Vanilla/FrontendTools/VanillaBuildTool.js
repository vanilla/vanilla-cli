const path = require("path");
const fs = require("fs");
const VanillaUtility = require("./VanillaUtility");
const Messages = require("./Messages");
const chalk = require("chalk");
const { spawn } = require("child_process");

const ADDON_TYPE = {
    PLUGIN: "plugin",
    THEME: "theme",
    APPLICATION: "application",
    LEGACY: "legacy"
};

/** Class representing an a build tool for frontend vanilla
 * @class
 * @property {?Object} addonInfo An object representation of the themes addon.json
 * @property {string} addonDirectory The directory of the addon to build into/from
 * @property {string} version The version of the build process to use. Maps to a folder in ./versions
 * @property {BuildToolOptions} options Arguments passed from the command line
 */
class VanillaBuildTool {
    constructor() {
        this.addonInfo = undefined;
        this.addonDirectory = undefined;
        this.version = undefined;

        this.spawnChildBuildProcess = this.spawnChildBuildProcess.bind(this);
        this.parseAddonJson = this.parseAddonJson.bind(this);
        this.checkPathExists = this.checkPathExists.bind(this);
    }

    /**
     * Create an instance of the build tool.
     *
     * DO NOT use the constructor directly. Some async IO operations need to take place,
     * and js does not have async constructors.
     *
     * @static
     * @param {string} [addonDirectory=""] The directory of the addon.
     * @param {Object} options Arguments passed from the command line
     *
     * @memberof VanillaBuildTool
     */
    static async create(addonDirectory = "", options = {}) {
        const instance = new VanillaBuildTool();

        instance.addonDirectory = addonDirectory;
        instance.options = options;
        instance.addonInfo = await instance.parseAddonJson();
        if (instance.options.buildProcessVersion) {
            instance.version = options.buildProcessVersion;
        } else {
            instance.version = instance.addonInfo.buildProcess || "legacy";
        }
        await instance.spawnChildBuildProcess();
    }

    /**
     * Spawn a child build process.
     *
     *  This keeps a reference to the child process in case we want to do something with it later.
     *
     * @memberof VanillaBuildTool
     */
    async spawnChildBuildProcess() {
        const directory = path.resolve(__dirname, `./versions/${this.version}`);
        const isValidDirectory = await this.checkPathExists(directory);

        if (!isValidDirectory) {
            const validVersions = await VanillaUtility.getSubDirectories(
                path.resolve(__dirname, `./versions`)
            ).join(", ");

            console.log(
                Messages.ERROR_WRONG_VERSION(this.version, validVersions)
            );
        } else {
            process.chdir(directory);
            console.log(Messages.STARTING_BUILD_PROCESS(this.version));

            const args = [
                "run",
                "build",
                "--",
                `--addonpath`,
                `${this.addonDirectory}`,
                "--color",
                `--options`,
                JSON.stringify(this.options)
            ];

            if (this.options.debug) {
                args.push([`--inspect --inspect-brk="9230"`])
            }

            this.childProcess = spawn(
                "npm",
                ,
                { stdio: "inherit" }
            );
        }
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
                if (err && err.code === "ENOENT") {
                    resolve({});
                    return;
                } else if (err) {
                    console.log(err.code);
                    reject(err);
                    return;
                }

                const addonInfo = JSON.parse(data);
                resolve(addonInfo);
            });
        });
    }

    handleAccessDenied() {}

    /**
     * Check file exists or not.
     *
     * @param {string} filePath The absolute path of the file.
     * @returns {boolean}
     *
     * @memberof VanillaBuildTool
     */
    checkPathExists(filePath) {
        return new Promise(resolve => {
            fs.access(filePath, fs.constants.R_OK, err => {
                if (err) {
                    resolve(false);
                }

                resolve(true);
            });
        });
    }
}

module.exports = VanillaBuildTool;
