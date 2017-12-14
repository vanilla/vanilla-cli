/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const remove = require("remove");
const glob = require("glob-promise");
const fs = require("fs");
const mock = require("mock-fs");

const buildScripts = require("../BuildProcess/core/build-scripts");

// Fixtures
const coreAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla/core");
const dashboardAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla/applications/dashboard");

/**
 * @type {BuildOptions}
 */
const baseOptions = {
    buildOptions: {
        process: "core",
        cssTool: "scss"
    },
    vanillaDirectory: path.resolve(__dirname, "./fixtures/vanilla/"),
    watch: false,
    verbose: false
};

describe("Integration tests", () => {
    beforeAll(() => {
        const options = { ...baseOptions };
        options.addonKey = "core";
        options.buildOptions.entries = {
            app: "core.js",
            admin: "core-admin.js"
        };
        options.buildOptions.exports = {
            app: ["Garden.js", "react"],
            admin: ["Garden.js", "react"]
        };
        options.rootDirectories = [coreAddonDirectory];
        options.requiredDirectories = [coreAddonDirectory];

        return buildScripts.run(options);
    });

    afterAll(done => {
        return remove(
            [
                path.resolve(dashboardAddonDirectory, "js"),
                path.resolve(coreAddonDirectory, "js"),
                path.resolve(coreAddonDirectory, "manifests")
            ],
            () => {
                done();
            }
        );
    });

    describe("builds the core javascript", () => {
        it("generates lib bundles for all 'exports' in addon.json", () => {
            expect(fs.existsSync(path.join(coreAddonDirectory, "js/lib-core-admin.js"))).toBe(true);
            expect(fs.existsSync(path.join(coreAddonDirectory, "js/lib-core-app.js"))).toBe(true);
        });

        it("generates lib sourcemaps for all 'exports' in addon.json", () => {
            expect(fs.existsSync(path.join(coreAddonDirectory, "js/lib-core-admin.js.map"))).toBe(true);
            expect(fs.existsSync(path.join(coreAddonDirectory, "js/lib-core-app.js.map"))).toBe(true);
        });

        it("generates manifest files for all `exports` in addon.json", () => {
            expect(fs.existsSync(path.join(coreAddonDirectory, "manifests/admin-manifest.json"))).toBe(true);
            expect(fs.existsSync(path.join(coreAddonDirectory, "manifests/app-manifest.json"))).toBe(true);
        })

        test("The core lib bundle contains the string from the react stub", () => {
            // Final bundles should not contain react in them.
            const outputContents = fs.readFileSync(path.join(coreAddonDirectory, "js/lib-core-admin.js"), "utf8");
            expect(outputContents).toContain("REACT_STRING");
        });

        it("generates entry bundles for all 'entries' in addon.json", async function() {
            expect(fs.existsSync(path.join(coreAddonDirectory, "js/core-admin.js"))).toBe(true);
            expect(fs.existsSync(path.join(coreAddonDirectory, "js/core-app.js"))).toBe(true);
        });

        it("generates entry sourcemaps for all 'entries' in addon.json", () => {
            expect(fs.existsSync(path.join(coreAddonDirectory, "js/core-admin.js.map"))).toBe(true);
            expect(fs.existsSync(path.join(coreAddonDirectory, "js/core-app.js.map"))).toBe(true);
        });

        /**
         * If this fails it is likely that the process is not building against its own bundles properly.
         */
        it("does not include code from exports inside of the built entries", () => {
            // Final bundles should not contain react in them.
            const outputContents = fs.readFileSync(path.join(coreAddonDirectory, "js/core-admin.js"), "utf8");
            expect(outputContents).not.toContain("REACT_STRING");
        });
    });

    describe("Builds an application on top of core", () => {
        const outputFilename = "dashboard-app.js";

        beforeAll(() => {
            const options = { ...baseOptions };
            options.addonKey = "dashboard";
            options.buildOptions.entries = {
                app: "index.js"
            };
            options.buildOptions.exports = {};
            options.rootDirectories = [dashboardAddonDirectory];
            options.requiredDirectories = [coreAddonDirectory];

            return buildScripts.run(options);
        });

        it("Does not generate any 'lib' bundles", () => {
            return expect(glob(path.join(dashboardAddonDirectory, "js/lib-*"))).resolves.toHaveLength(0);
        });

        it("generates entry bundles with sourcemaps for all 'entries' in addon.json", () => {
            expect(fs.existsSync(path.join(dashboardAddonDirectory, `js/${outputFilename}`))).toBe(true);
            expect(fs.existsSync(path.join(dashboardAddonDirectory, `js/${outputFilename}.map`))).toBe(true);
        });

        /**
         * If this fails it is likely that the process is not building against its own bundles properly.
         */
        it("does not include code from the core library", () => {
            // Final bundles should not contain react in them.
            const outputContents = fs.readFileSync(path.join(dashboardAddonDirectory, `js/${outputFilename}`), "utf8");
            expect(outputContents).not.toContain("REACT_STRING");
        });
    });
});

describe("function unit tests", () => {
    afterEach(() => {
        mock.restore();
    });

    describe("getManifestPathsForDirectory", () => {
        const file1 = "/test/file1.export-manifest.json";
        const file2 = "/test/file.export-manifest.json";
        const invalidFile = "/test/something.asome-export-asdfad.json";
        const nestedFile = "/test/subdir/nested.export-manifest.json";

        beforeEach(() => {
            mock({
                [file1]: "",
                [file2]: "",
                [invalidFile]: "",
                [nestedFile]: ""
            });
        });

        it("finds only the 3 valid manifests", () => {
            const manifestPaths = buildScripts.getManifestPathsForDirectory("/test");
            expect(manifestPaths).toContain(file1);
            expect(manifestPaths).toContain(file2);
            expect(manifestPaths).toContain(nestedFile);
            expect(manifestPaths).not.toContain(invalidFile);
        });
    });

    describe("isValidEntryPoint", () => {
        it("Accepts an object of string => string", () => {
            const input = {
                "string": "string"
            };
            expect(buildScripts.isValidEntryPoint(input)).toBe(true);
        })

        it("Accepts an object of string => string[]", () => {
            const input = {
                "string": ["string", "string"]
            };
            expect(buildScripts.isValidEntryPoint(input)).toBe(true);
        })

        it("Accepts an array of strings", () => {
            const input = ["string"];
            expect(buildScripts.isValidEntryPoint(input)).toBe(true);
        })

        it("Accepts an array of strings", () => {
            const input = ["string"];
            expect(buildScripts.isValidEntryPoint(input)).toBe(true);
        })

        it("Rejects empty objects and arrays", () => {
            const emptyObject = {};
            const emptyArray = [];
            expect(buildScripts.isValidEntryPoint(emptyObject)).toBe(false);
            expect(buildScripts.isValidEntryPoint(emptyArray)).toBe(false);
        })
    })
});
