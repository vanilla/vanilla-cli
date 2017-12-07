const sass = require("node-sass");
const postcss = require("postcss");
const autoprefixer = require("autoprefixer");
const chokidar = require("chokidar");
const glob = require("glob");
const { createSassTool } = require("../../library/SassTool");

const SassTool = createSassTool();
