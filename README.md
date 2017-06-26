# Vanilla's (C)ommand (L)ine (I)nterface

This tool is used to execute various Vanilla Forums related commands during local development.
Current functionalities include addon-related utilities such as cache regeneration and conversion,
as well as full front-end build tooling for vanilla addons.

## How to install

```bash
composer install
```

If you would like to use the frontend build tools as well, you will need to have `node` and `yarn` installed.

**For OS X:**
```bash
brew install node
brew install yarn
```

**For Debian/Ubuntu Linux:**
```bash
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list

sudo apt-get update && sudo apt-get install nodejs && sudo apt-get install yarn
```

## How to use

- From the command line:
```bash
php vanilla --help
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

## Debugging the Build process for local development

> **Notice**: Debugging the build process requires at least Node.js 8.x in order to benefit from the new node debugging process.

The build tooling contained in this CLI are written in node and are process forked from the primary PHP one. If you pass `--debug` as an argument to `vanilla build` then each node process will be spawned with a the `--inspect` and `--insect-brk` arguments. They will break on the first line to allow you to connect a debugger.

#### Child Processes 
The `build` command will spawn a different child process based on which version of the build process you are using. As a result they also break on the first line and wait to attatch a debugger, but they will listen on a different port. The primary node process listens on port `9229` and the child process will listen on port `9230`.

#### Tools
Node.js 8.x and onwards use the Chrome Debugger Protocol, which is the same protocol used by Google Chrome. This means thats once a node process has been started on your local machine with the `--inspect --inspect-brk` flags, you can go to [`chrome://inspect`](chrome://inspect) in Google Chrome and attatch your debugger in the chrome developer tools.

This project also comes with debugging configurations for [VSCode](https://code.visualstudio.com/) a popular Javascript editor. Simply start your process and run one of the included debugging configurations.
