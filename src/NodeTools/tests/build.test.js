/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const del = require("del");
const glob = require("glob-promise");
const fs = require("fs");

const { spawnChildProcess, getJsonFileForDirectory } = require("../library/utility");

// Fixtures
const vanillaExecutablePath = path.resolve(__dirname, "../../../bin/vanilla");
const coreAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla/core");
const coreAddonJson = getJsonFileForDirectory(coreAddonDirectory, "addon");
const dashboardAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla/applications/dashboard");
const dashboardAddonJson = getJsonFileForDirectory(dashboardAddonDirectory, "addon");
const baseOptions = ["build", "--process", "core"];

const orignalCWD = process.cwd();

function clearBuiltFiles() {
    console.log("clearing files")
    return del([
        path.join(__dirname, "./fixtures/**/js/*.js"),
        path.join(__dirname, "./fixtures/**/manifests/*.json")
    ]);
}

// afterAll(() => {
    // return clearBuiltFiles()
//         .then((files) => {
//             console.log("files cleared: " + files);
//             process.chdir(orignalCWD);
//         });
// });

const buildOptions = [...baseOptions, "--vanillasrc", path.resolve(__dirname, "./fixtures/vanilla/")];

describe("Build 'vanilla/core'", () => {
    beforeAll(() => {
        process.chdir(coreAddonDirectory);
        return spawnChildProcess(vanillaExecutablePath, buildOptions, {});
    })

    it("generates lib bundles for all 'exports' in addon.json", () => {
        expect(fs.existsSync(path.join("js/lib.core.admin.js"))).toBe(true);
        expect(fs.existsSync(path.join("js/lib.core.client.js"))).toBe(true);
    });

    it("generates lib sourcemaps for all 'exports' in addon.json", () => {
        expect(fs.existsSync(path.join("js/lib.core.admin.js.map"))).toBe(true);
        expect(fs.existsSync(path.join("js/lib.core.client.js.map"))).toBe(true);
    });

    it("generates entry bundles for all 'entries' in addon.json", async function() {
        expect(fs.existsSync(path.join("js/core.admin.js"))).toBe(true);
        expect(fs.existsSync(path.join("js/core.client.js"))).toBe(true);
    });

    it("generates entry sourcemaps for all 'entries' in addon.json", () => {
        expect(fs.existsSync(path.join("js/core.admin.js.map"))).toBe(true);
        expect(fs.existsSync(path.join("js/core.client.js.map"))).toBe(true);
    });

    /**
     * If this fails it is likely that the process is not building against its own bundles properly.
     */
    it("does not include code from exports inside of the built entries", () => {
        // Final bundles should not contain react in them.
        const outputContents = fs.readFileSync(path.join(coreAddonDirectory, "js/core.admin.js"), "utf8");
        expect(outputContents).not.toContain("@license React");
    });
})

describe("Build 'vanilla/applications/vanilla'", () => {
    beforeAll(() => {
        process.chdir(dashboardAddonDirectory);
        return spawnChildProcess(vanillaExecutablePath, buildOptions, {});
    })

    it("Does not generate any 'lib' bundles", () => {
        return expect(glob(path.join(dashboardAddonDirectory, "js/lib.*"))).resolves.toHaveLength(0);
    });

    it("generates entry bundles with sourcemaps for all 'entries' in addon.json", () => {
        expect(fs.existsSync(path.join("js/dashboard.client.js"))).toBe(true);
        expect(fs.existsSync(path.join("js/dashboard.client.js.map"))).toBe(true);
    });

    /**
     * If this fails it is likely that the process is not building against its own bundles properly.
     */
    it("does not include code from the core library", () => {
        // Final bundles should not contain react in them.
        const outputContents = fs.readFileSync(path.join(dashboardAddonDirectory, "js/dashboard.client.js"), "utf8");
        expect(outputContents).not.toContain("REACT_STRING");
    });
})
