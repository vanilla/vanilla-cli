const path = require("path");
const remove = require("remove");
const fs = require("fs");
const mock = require("mock-fs");

const buildStyles = require("../BuildProcess/core/build-styles");

const themeDirectory = path.resolve(__dirname, "./fixtures/vanilla/themes/theme");
const childThemeDirectory = path.resolve(__dirname, "./fixtures/vanilla/themes/child-theme");

/** @type {BuildOptions} */
const baseOptions = {
    buildOptions: {
        process: "core",
        cssTool: "scss",
    },
    vanillaDirectory: path.resolve(__dirname, "./fixtures/vanilla/"),
    watch: false,
    verbose: false
};

describe.only("Integration Tests", () => {
    afterAll(done => {
        remove(
            [
                path.resolve(themeDirectory, "design"),
                path.resolve(childThemeDirectory, "design"),
            ],
            () => {
                done();
            }
        );
    });
    describe("Standalone Theme", () => {
        beforeAll(() => {
            const options = {
                ...baseOptions,
                rootDirectories: [
                    themeDirectory,
                ],
            };

            return buildStyles(options);
        });

        it("builds a custom.css and sourcemap file", () => {
            expect(fs.existsSync(path.join(themeDirectory, "design/custom.css"))).toBe(true);
            expect(fs.existsSync(path.join(themeDirectory, "design/custom.css.map"))).toBe(true);
        });

        it("can import it's own partials", () => {
            const outputContents = fs.readFileSync(path.join(themeDirectory, "design/custom.css"), "utf8");
            const partialRegex = /\.imported\-selector/;

            expect(partialRegex.test(outputContents)).toBe(true);
        });

        it("contains the right variables", () => {
            const outputContents = fs.readFileSync(path.join(themeDirectory, "design/custom.css"), "utf8");

            expect(outputContents.includes("DEFAULT_VARIABLE")).toBe(true);
            expect(outputContents.includes("NOT_OVERRIDABLE_VARIBALE")).toBe(true);
        });
    });

    describe("Child Theme", () => {
        beforeAll(() => {
            const options = {
                ...baseOptions,
                rootDirectories: [
                    childThemeDirectory,
                    themeDirectory,
                ],
            };

            return buildStyles(options);
        });

        it("builds a custom.css and sourcemap file", () => {
            expect(fs.existsSync(path.join(childThemeDirectory, "design/custom.css"))).toBe(true);
            expect(fs.existsSync(path.join(childThemeDirectory, "design/custom.css.map"))).toBe(true);
        });

        it("includes its parents' imported partials", () => {
            const outputContents = fs.readFileSync(path.join(childThemeDirectory, "design/custom.css"), "utf8");
            const partialRegex = /\.imported\-selector/;

            expect(partialRegex.test(outputContents)).toBe(true);
        });

        it("contains the right variables", () => {
            const outputContents = fs.readFileSync(path.join(childThemeDirectory, "design/custom.css"), "utf8");

            expect(outputContents.includes("CHILD_VARIABLE")).toBe(true);
            expect(outputContents.includes("NOT_OVERRIDABLE_VARIBALE")).toBe(true);
        });

        it("Does not contain overriden variables", () => {
            const outputContents = fs.readFileSync(path.join(childThemeDirectory, "design/custom.css"), "utf8");
            expect(outputContents.includes("DEFAULT_VARIABLE")).not.toBe(true);
        })

        it("includes a custom partial from the child theme", () => {
            const outputContents = fs.readFileSync(path.join(childThemeDirectory, "design/custom.css"), "utf8");
            const partialRegex = /\.child\-partial\-selector/;

            expect(partialRegex.test(outputContents)).toBe(true);
        });

    });
});
