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
The CLI requires PHP `5.6.0` or greater installed to run. It also requires [composer](https://getcomposer.org/).

Some commands, currently `build`, requires a minimum Node.js version of `8.0.0` and the package manager `yarn` to be installed. Installation instructions are located [in the wik](https://github.com/vanilla/vanilla-cli/wiki/Node.js-Processes).

### Setup

#### Installation with Composer

1. Run `composer global require 'vanilla/vanilla-cli'`.
2. If your composer bin directory is on your path, you can now run the tool with `vanilla`. Try `vanilla --help` to get started.

#### Manual Installation

1. Clone this repo to the installation directory 
```bash
cd INSTALLATION_FOLDER
git clone git@github.com:vanilla/vanilla-cli.git
```
2. Install the PHP dependancies in the directory where you clone this project.
```bash
cd vanilla-cli
composer install
```
3. Run the tool `./bin/vanilla --help`
4. (Optional) Symlink the tool somewhere on your path. `ln -s ./bin/vanilla SOME_BIN_DIRECTORY`

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

## Documentation

Documentation can be found at this repo's [wiki](https://github.com/vanilla/vanilla-cli/wiki).
