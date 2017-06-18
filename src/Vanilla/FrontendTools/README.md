# Vanilla Frontend Build Tools

Historically every part of Vanilla, be it the core product, plugins, themes, or applications each maintained their own build process. Over time these build processes included Ruby based tools such as `compass` and the Ruby version of `sass`, to `grunt`, `gulp`, `webpack`, various cli tools and more. One theme even did server-side compilation of `less` stylesheets. This repository represents a move to a common set of build tools to be used across all parts of vanilla going forward.

## Versioning

An addon may specify which version of the build process it would like to use with the `buildProcessVersion` field in its `addon.json` file. In order to retain backwards compatibility with addons that are not `vanilla-cli` aware, if none is specified this tool will attempt to use whichever node-based build tools are included in the project. This tool does not currently support `ruby` based build tools.

#### 1.0

This build process is primary `gulp` based. It builds stylesheets using `node-sass`, bundles javascript with `webpack` and `babel`, generates icon-fonts from svg's and compresses image assets.

#### Legacy

> __Notice__: This build process is deprecated and only exists to support legacy addons. New addons should use the latest build process.

This build process will attempt to find the tasks `build`, `watch`, `test`, and `lint` in the addon itself by checking the following possible build tools:

1. npm scripts *eg. `npm run build`*
2. `gulp`
3. `grunt`

## Contributing
