# Vanilla's Command Line Interface

This tool is used to make various tasks easier for developers working on Vanilla Forums core or addons.

Current functionalities include:

- Building frontend assets (scripts, stylesheets, and images)
- Generating cache files for addons
- Converting addons' info arrays to json

See the [vanilla-cli docs](https://docs.vanillaforums.com/developer/vanilla-cli) for documentation about the different commands.

## Table of Contents

* [Installation](#installation)
* [Basic Usage](#usage)
* [Documentation](#documentation)
* [Tests](#tests)
* [Debugging](#debugging)

## Installation

See our [Installation Docs](https://docs.vanillaforums.com/developer/vanilla-cli/installation/) and our [Quickstart Guide](https://docs.vanillaforums.com/developer/vanilla-cli/build-quickstart/).

## Basic Usage

- From the command line:
```bash
vanilla --help
```
or
```bash
vanilla SOME_COMMAND --help
```
- From other php applications:
```php
require('{{VANILLA_CLI_DIRECTORY}}/vendor/autoload.php');
$cli = new \Vanilla\Cli\Cli();
try {
    $cli->run($args); // Must be: array('vanilla', '{{COMMAND_NAME}}'[, options...])
} catch (Exception $e) {
    ...
}
```

## Documentation

More detailed usage documentation can be found at our official [vanilla-cli docs](https://docs.vanillaforums.com/developer/vanilla-cli/#usage).

- [Getting Started](https://docs.vanillaforums.com/developer/vanilla-cli/#getting-started)
- [Build Tools](https://docs.vanillaforums.com/developer/vanilla-cli/#build-tools)
- [Addon Utilities](https://docs.vanillaforums.com/developer/vanilla-cli/#addon-utilities)
- [Build Tool Quickstart Guide](https://docs.vanillaforums.com/developer/vanilla-cli/build-quickstart)
- [Build Process - Core](https://docs.vanillaforums.com/developer/vanilla-cli/build-process-core)
- [Build Process - 1.0](https://docs.vanillaforums.com/developer/vanilla-cli/build-process-v1)
- [Build Process - Legacy](https://docs.vanillaforums.com/developer/vanilla-cli/build-process-legacy)
- [How Bundling Works](https://docs.vanillaforums.com/developer/vanilla-cli/bundling-process)

## Tests

Some of the node.js build processes have unit and integration tests. Be sure that these pass before making pull requests. To run the tests:

The NodeTools tests are run using [jest](https://facebook.github.io/jest/).

```bash
$ cd src/NodeTools
$ yarn install

$ yarn test
# Or 
$ yarn test --watch
```

## Debugging
During local development you main want to run a debugger. This is supported for the primary PHP process.

### PHP

Ensure you IDE is properly configured for [`XDebug`](https://xdebug.org/index.php).

[How to setup PHPStorm for XDebug](https://www.jetbrains.com/help/phpstorm/configuring-xdebug.html)

[Debugging in VsCode](https://code.visualstudio.com/Docs/editor/debugging)

#### Running the Debugger

Just export `XDEBUG_CONFIG` from your shell, set up your IDE to listen for XDebug, and run your vanilla command.

```bash
export XDEBUG_CONFIG="idekey=PHPSTORM"
vanilla some-command --some-argument
```
