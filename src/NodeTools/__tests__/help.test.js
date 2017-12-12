/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");
const { spawnChildProcess } = require('../library/utility');

const vanillaExecutablePath = path.resolve(__dirname, "../../../bin/vanilla");

it("runs and exits cleanly", () => {
    expect.assertions(1);
    return spawnChildProcess(vanillaExecutablePath, [], {})
        .then(result => {
            expect(result).toBe(true);
        });
})
