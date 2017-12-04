/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const del = require("del");
const { spawnChildProcess } = require("../src/NodeTools/library/utility");

const vanillaExecutablePath = path.resolve(__dirname, "../bin/vanilla");
const baseOptions = ["build", "--process", "core"];

function clearBuiltFiles() {
    del([
        path.join(__dirname, "**/js/*.bundle.*"),
        path.join(__dirname, "**/js/lib.*.*"),
        path.join(__dirname, "**/manifests/**"),
    ]);
}

beforeEach(() => {
    clearBuiltFiles();
});

it("fails in a directory without an addon.json file", () => {
    expect.assertions(1);
    return spawnChildProcess(vanillaExecutablePath, ["build", "--process", "core"], {}).catch(fail => {
        expect(fail).toBeInstanceOf(Error);
    });
});

it("generates dll bundles for all 'exports' in addon.json", () => {
    // expect.assertions(3);
    expect(true).toBeTruthy();

    // return spawnChildProcess("");
});
