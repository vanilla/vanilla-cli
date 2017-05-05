<?php
/**
 *
 */

namespace Vanilla\Cli;

use \Exception;

class CliUtil {
    public static function write($msg) {
        echo $msg.PHP_EOL;
    }

    public static function error($msg) {
        throw new Exception($msg.PHP_EOL);
    }
}
