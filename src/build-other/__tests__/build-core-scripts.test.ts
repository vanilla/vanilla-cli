/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

import path from "path";
import del from "del";
import glob from "glob-promise";
import fs from "fs";
import mock from "mock-fs";
import buildScripts, { getManifestPathsForDirectory, isValidEntryPoint } from "../core/scripts";

const skipCleanup = process.env.NO_CLEANUP || false;

// Fixtures
const coreAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla");
const dashboardAddonDirectory = path.resolve(__dirname, "./fixtures/vanilla/applications/dashboard");

describe("function unit tests", () => {
    afterEach(() => {
        mock.restore();
    });

    describe("getManifestPathsForDirectory", () => {
        const file1 = "/test/manifests/file1.export-manifest.json";
        const file2 = "/test/manifests/file.export-manifest.json";
        const invalidFile = "/test/manifests/something.asome-export-asdfad.json";
        const nestedFile = "/test/manifests/subdir/nested.export-manifest.json";

        beforeEach(() => {
            mock({
                [file1]: "",
                [file2]: "",
                [invalidFile]: "",
                [nestedFile]: "",
            });
        });

        it("finds only the 3 valid manifests", () => {
            const manifestPaths = getManifestPathsForDirectory("/test");
            expect(manifestPaths).toContain(file1);
            expect(manifestPaths).toContain(file2);
            expect(manifestPaths).toContain(nestedFile);
            expect(manifestPaths).not.toContain(invalidFile);
        });
    });

    describe("isValidEntryPoint", () => {
        it("Accepts an object of string => string", () => {
            const input = {
                string: "string",
            };
            expect(isValidEntryPoint(input)).toBe(true);
        });

        it("Accepts an object of string => string[]", () => {
            const input = {
                string: ["string", "string"],
            };
            expect(isValidEntryPoint(input)).toBe(true);
        });

        it("Accepts an array of strings", () => {
            const input: any = ["string"];
            expect(isValidEntryPoint(input)).toBe(true);
        });

        it("Accepts an array of strings", () => {
            const input: any = ["string"];
            expect(isValidEntryPoint(input)).toBe(true);
        });

        it("Rejects empty objects and arrays", () => {
            const emptyObject = {};
            const emptyArray: any = [];
            expect(isValidEntryPoint(emptyObject)).toBe(false);
            expect(isValidEntryPoint(emptyArray)).toBe(false);
        });
    });
});
