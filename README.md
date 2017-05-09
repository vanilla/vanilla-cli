# Vanilla's (C)ommand (L)ine (I)nterface

This tool is used to execute different tasks.

## How to install

```bash
composer install
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
