/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

const path = require("path");

function resolveBabel(moduleName) {
    return path.resolve(__dirname, `../node_modules/babel-${moduleName}`);
}

module.exports = {
    presets: [
        resolveBabel('preset-react'),
        resolveBabel('preset-env'),
    ],
    plugins: [
        resolveBabel('plugin-transform-object-rest-spread'),
    ]
}
