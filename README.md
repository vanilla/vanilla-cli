# Vanilla's (C)ommand (L)ine (I)nterface

This tool is used to make various tasks easier for developers working on Vanilla Forums core or addons.

Current functionalities include:

- Building frontend assets (scripts, stylesheets, and images)
- Generating cache files for addons
- Converting addons' info arrays to json

See the [wiki](https://github.com/vanilla/vanilla-cli/wiki) for documentation about the different commands.

## Prerequisites
The CLI requires PHP `5.6.0` or greater installed to run. 

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
Both the core of Vanilla and its many addons often have their own tools to build their frontend dependencies. Normally these tools bundle, concatenate, and/or minify the javascript and styles, compress images and other assets, and may include a CSS authoring tool such as [Sass](http://sass-lang.com/) or [Less](http://lesscss.org/). Many of these build toolchains accomplish the same objective but in different ways.

The build tool aims to provide a consistant experience to building a frontend assets for vanilla (js/css/images). By default it will check your project for an existing build process and attempt to hook into that, but it provides its own mature, well tested build processes as well.

You can choose which build process to use by defining a `buildProcessVersion` in your project's [addon.json](http://docs.vanillaforums.com/developer) file and settings it to a valid build process version. Currently valid versions are `1.0` and `legacy`

For information on the build process and its configuration, check the [wiki](https://github.com/vanilla/vanilla-cli/wiki/Build-Tools)

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
