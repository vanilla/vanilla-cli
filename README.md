# Vanilla's (C)ommand (L)ine (I)nterface

This tool is used to execute various Vanilla Forums related commands during local development.
Current functionalities include addon-related utilities such as cache regeneration and conversion,
as well as full front-end build tooling for vanilla addons.

## How to install

```bash
composer install
```

If you would like to use the frontend build tools as well, you will need to have `node` and `yarn` installed.

The minimum supported Node version `8.0.0` and the minimum supported PHP version is `7.1.0`.

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

sudo apt-get update && sudo apt-get install nodejs yarn
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
