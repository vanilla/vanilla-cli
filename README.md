# Vanilla's Command Line Interface

This tool is used to make various tasks easier for developers working on Vanilla Forums core or addons.

Current functionalities include:

- Building frontend assets (scripts, stylesheets, and images)
- Generating cache files for addons
- Converting addons' info arrays to json

See the [wiki](https://github.com/vanilla/vanilla-cli/wiki) for documentation about the different commands.

## Table of Contents

* [Installation](#installation)
* [Usage](#usage)
* [Debugging](#debugging)
* [Documentation](#documentation)
* [License](#license)

## Installation

### Prerequisites
The CLI requires PHP `5.6.0` or greater installed to run. 

Some commands, currently `build`, requires a minimum Node.js version of `8.0.0` and the package manager `yarn` to be installed. Installation instructions are located [in the wik](https://github.com/vanilla/vanilla-cli/wiki/Node.js-Processes).

### Setup

Install the PHP dependencies in the directory where you cloned this project.
```bash
cd VANILLA_CLI_FOLDER
composer install
```

Then symlink the tool somewhere on your path.
```bash
ln -s /usr/local/bin
```
```bash
ln -s ~/bin
```

## Usage

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

## Debugging
During local development you main want to run a debugger. This is supported for both php process and JS process.

### PHP

Ensure you IDE is properly configured for [`XDebug`](https://xdebug.org/index.php).

[How to setup PHPStorm for XDebug](https://www.jetbrains.com/help/phpstorm/configuring-xdebug.html)

[Debugging in VsCode](https://code.visualstudio.com/Docs/editor/debugging)

If you use [VSCode](https://code.visualstudio.com/) a debugging script is included called `Listen for XDebug`

#### Running the Debugger

Just export `XDEBUG_CONFIG` from your shell, set up your IDE to listen for XDebug, and run your vanilla command.

```bash
export XDEBUG_CONFIG="idekey=PHPSTORM"
vanilla some-command --some-argument
```

## Documentation

Documentation can be found at this repo's [wiki](https://github.com/vanilla/vanilla-cli/wiki).
