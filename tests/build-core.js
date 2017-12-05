/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const del = require("del");
const glob = require("glob-promise");
const fs = require("fs");

const { spawnChildProcess, getJsonFileForDirectory } = require("../src/NodeTools/library/utility");

// Fixtures
const vanillaExecutablePath = path.resolve(__dirname, "../bin/vanilla");
const coreAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla/core");
const coreAddonJson = getJsonFileForDirectory(coreAddonDirectory, "addon");
const gardenAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla/applications/garden");
const gardenAddonJson = getJsonFileForDirectory(gardenAddonDirectory, "addon");
const baseOptions = ["build", "--process", "core"];

const orignalCWD = process.cwd();

function clearBuiltFiles() {
    del([
        path.join(__dirname, "**/js/*.bundle.*"),
        path.join(__dirname, "**/js/lib.*.*"),
        path.join(__dirname, "**/manifests/**")
    ]);
}

afterAll(() => {
    clearBuiltFiles();
    process.chdir(orignalCWD);
});

const buildOptions = [...baseOptions, "--vanillasrc", path.resolve(__dirname, "./fixtures/vanilla/")];

describe("Build 'vanilla/core'", () => {
    const numberOfImports = Object.keys(coreAddonJson.build.entries).length;
    const numberOfExports = Object.keys(coreAddonJson.build.exports).length;

    beforeAll(() => {
        process.chdir(coreAddonDirectory);
        return spawnChildProcess(vanillaExecutablePath, buildOptions, {});
    })

    it("generates lib bundles for all 'exports' in addon.json", () => {
        expect.assertions(1);
        return expect(glob(path.join(coreAddonDirectory, "js/lib.*.js"))).resolves.toHaveLength(numberOfExports);
    });

    it("generates lib sourcemaps for all 'exports' in addon.json", () => {
        expect.assertions(1);
        return expect(glob(path.join(coreAddonDirectory, "js/lib.*.js.map"))).resolves.toHaveLength(numberOfExports);
    });

    it("generates entry bundles for all 'entries' in addon.json", () => {
        expect.assertions(1);
        return expect(glob(path.join(coreAddonDirectory, "js/*.bundle.js"))).resolves.toHaveLength(numberOfExports);
    });

    it("generates entry sourcemaps for all 'entries' in addon.json", () => {
        expect.assertions(1);
        return expect(glob(path.join(coreAddonDirectory, "js/*.bundle.js.map"))).resolves.toHaveLength(numberOfExports);
    });

    /**
     * If this fails it is likely that the process is not building against its own bundles properly.
     */
    it("does not include code from exports inside of the built entries", () => {
        // Final bundles should not contain react in them.
        const outputContents = fs.readFileSync(path.join(coreAddonDirectory, "js/core-admin.bundle.js"), "utf8");
        expect(outputContents).not.toContain("@license React");
    });
})

describe("Build 'vanilla/applications/vanilla'", () => {
    const numberOfImports = Object.keys(gardenAddonJson.build.entries).length;

    beforeAll(() => {
        process.chdir(gardenAddonDirectory);
        return spawnChildProcess(vanillaExecutablePath, buildOptions, {});
    })

    it("Does not generate any 'lib' bundles", () => {
        return expect(glob(path.join(gardenAddonDirectory, "js/lib.*"))).resolves.toHaveLength(0);
    });

    it("generates entry bundles for all 'entries' in addon.json", () => {
        expect.assertions(1);
        return expect(glob(path.join(gardenAddonDirectory, "js/*.bundle.js"))).resolves.toHaveLength(numberOfImports);
    });

    it("generates entry sourcemaps for all 'entries' in addon.json", () => {
        expect.assertions(1);
        return expect(glob(path.join(gardenAddonDirectory, "js/*.bundle.js.map"))).resolves.toHaveLength(numberOfImports);
    });

    /**
     * If this fails it is likely that the process is not building against its own bundles properly.
     */
    it("does not include code from the core library", () => {
        // Final bundles should not contain react in them.
        const outputContents = fs.readFileSync(path.join(gardenAddonDirectory, "js/garden.bundle.js"), "utf8");
        expect(outputContents).not.toContain("@license React");
    });
})
