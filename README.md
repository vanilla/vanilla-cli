# Vanilla's (C)ommand (L)ine (I)nterface

This tool is used to execute various Vanilla Forums related commands during local development.
Current functionalities include addon-related utilities such as cache regeneration and conversion,
as well as full front-end build tooling for vanilla addons.

## Prerequisites
The CLI requires PHP `7.1.0` or greater installed to run. 

Additionally the command `build` requires a minimum Node.js version of `8.0.0` and the package manager `yarn` to be installed. Installation instructions [below](#for-os-x).

## Table of Contents

* [Installation](#installation)
* [Usage](#usage)
* [Build Tool](#build-tool)
* [Debugging](#debugging)
* [Documentation](#documentation)
* [License](#license)

## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)

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

If you would like to use the frontend build tools as well, you will need to have `node` and `yarn` installed.

#### For OS X
```bash
brew install node
brew install yarn
```

#### For Debian/Ubuntu Linux
```bash
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

sudo apt-get update && sudo apt-get install nodejs yarn
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

### Build Tool

The build tool gives a consistant UX to building a Vanilla Forums addon. By default it will check your project for an existing build process and attempt to hook into that, but it provides its own mature, well tested build processes.

You can choose which build process to use by defining a `buildProcessVersion` in your project's [addon.json](http://docs.vanillaforums.com/developer) file and settings it to a valid build process version. Currently valid versions are `1.0` and `legacy`

```
usage: vanilla build [<options>]

Run the javascript build process.

OPTIONS
  --help, -?      Display this help.
  --watch, -w     Run the build process in watch mode. Best used with the
                  livereload browser extensions.
  --process, -p   Which version of the build process to use. This will override
                  the one specified in the addon.json
  --reset, -r     Reinstall the build tools dependencies before building.
  --verbose, -v   Show detailed build process output
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

### Node.js
The build processes of this tool use [Node.js](https://nodejs.org/en/). Debugging of the node processes are not officially supported at this time. PR's welcome.

## Documentation
Documentation can be found at this repo's [wiki](https://github.com/vanilla/vanilla-cli/wiki).

## License
[GNU GPL v2](http://www.opensource.org/licenses/gpl-2.0.php)
