/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const remove = require("remove");
const glob = require("glob-promise");
const fs = require("fs");

const buildScripts = require("../BuildProcess/core/build.scripts");

// Fixtures
const coreAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla/core");
const dashboardAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla/applications/dashboard");

/**
 * @type {BuildOptions}
 */
const baseOptions = {
    buildOptions: {
        process: 'core',
        cssTool: 'scss',
    },
    vanillaDirectory: path.resolve(__dirname, "./fixtures/vanilla/"),
    watch: false,
    verbose: false,
};

afterAll((done) => {
    return remove([
        path.resolve(dashboardAddonDirectory, "js"),
        path.resolve(coreAddonDirectory, "js"),
        path.resolve(coreAddonDirectory, "manifests"),
    ], () => {
        done();
    })
});

describe("Builds the core addon", () => {
    beforeAll(() => {
        const options = {...baseOptions};
        options.buildOptions.entries = {
            "core.client.js": "core.js",
            "core.admin.js": "core-admin.js"
        };
        options.buildOptions.exports = {
            "core.client": ["Garden.js", "react"],
            "core.admin": ["Garden.js", "react"]
        };
        options.rootDirectories = [
            coreAddonDirectory,
        ];
        options.requiredDirectories = [
            coreAddonDirectory,
        ];

        return buildScripts.run(options);
    });

    it("generates lib bundles for all 'exports' in addon.json", () => {
        expect(fs.existsSync(path.join(coreAddonDirectory, "js/lib.core.admin.js"))).toBe(true);
        expect(fs.existsSync(path.join(coreAddonDirectory, "js/lib.core.client.js"))).toBe(true);
    });

    it("generates lib sourcemaps for all 'exports' in addon.json", () => {
        expect(fs.existsSync(path.join(coreAddonDirectory, "js/lib.core.admin.js.map"))).toBe(true);
        expect(fs.existsSync(path.join(coreAddonDirectory, "js/lib.core.client.js.map"))).toBe(true);
    });

    it("generates entry bundles for all 'entries' in addon.json", async function() {
        expect(fs.existsSync(path.join(coreAddonDirectory, "js/core.admin.js"))).toBe(true);
        expect(fs.existsSync(path.join(coreAddonDirectory, "js/core.client.js"))).toBe(true);
    });

    it("generates entry sourcemaps for all 'entries' in addon.json", () => {
        expect(fs.existsSync(path.join(coreAddonDirectory, "js/core.admin.js.map"))).toBe(true);
        expect(fs.existsSync(path.join(coreAddonDirectory, "js/core.client.js.map"))).toBe(true);
    });

    /**
     * If this fails it is likely that the process is not building against its own bundles properly.
     */
    it("does not include code from exports inside of the built entries", () => {
        // Final bundles should not contain react in them.
        const outputContents = fs.readFileSync(path.join(coreAddonDirectory, "js/core.admin.js"), "utf8");
        expect(outputContents).not.toContain("REACT_STRING");
    });
})

describe("Builds an application on top of core", () => {
    const outputFilename = "dashboard.client.js";

    beforeAll(() => {
        const options = {...baseOptions};
        options.buildOptions.entries = {
            [outputFilename]: "index.js",
        };
        options.buildOptions.exports = {};
        options.rootDirectories = [
            dashboardAddonDirectory,
        ];
        options.requiredDirectories = [
            coreAddonDirectory,
        ];

        return buildScripts.run(options);
    });

    it("Does not generate any 'lib' bundles", () => {
        return expect(glob(path.join(dashboardAddonDirectory, "js/lib.*"))).resolves.toHaveLength(0);
    });

    it("generates entry bundles with sourcemaps for all 'entries' in addon.json", () => {
        expect(fs.existsSync(path.join(`js/${outputFilename}`))).toBe(true);
        expect(fs.existsSync(path.join(`js/${outputFilename}.map`))).toBe(true);
    });

    /**
     * If this fails it is likely that the process is not building against its own bundles properly.
     */
    it("does not include code from the core library", () => {
        // Final bundles should not contain react in them.
        const outputContents = fs.readFileSync(path.join(dashboardAddonDirectory, `js/${outputFilename}`), "utf8");
        expect(outputContents).not.toContain("REACT_STRING");
    });
})
