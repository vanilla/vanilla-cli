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

/** Class representing an a build tool for frontend vanilla */
class VanillaBuildTool {
    constructor() {
        this.addonInfo = undefined;
        this.addonDirectory = undefined;
        this.version = undefined;

        this.spawnChildBuildProcess = this.spawnChildBuildProcess.bind(this);
        this.parseAddonJson = this.parseAddonJson.bind(this);
        this.checkFileExists = this.checkFileExists.bind(this);
    }

    static async create(addonDirectory = "") {
        const instance = new VanillaBuildTool();

        instance.addonDirectory = addonDirectory;
        instance.addonInfo = await instance.parseAddonJson();
        instance.version = instance.addonInfo.version || 'legacy';
        instance.spawnChildBuildProcess();
    }

    spawnChildBuildProcess() {
        this.childProcess = spawn("gulp", [
            `--addonpath`,
            `${this.addonDirectory}`
        ]);

        this.childProcess.stdout.on("data", function(data) {
            if (data) console.log(data.toString());
        });

        this.childProcess.stderr.on("data", function(data) {
            if (data) console.log(data.toString());
        });
    }

    async parseAddonJson() {
        const packagePath = path.resolve(this.addonDirectory, "./addon.json");

        return new Promise(resolve => {
            fs.readFile(packagePath, "utf8", (err, data) => {
                if (err) {
                    resolve(false);
                }

                const addonInfo = JSON.parse(data);
                resolve(addonInfo);
            });
        });
    }

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
