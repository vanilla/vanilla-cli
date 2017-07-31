<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

namespace Vanilla\Cli;

use \Exception;

/**
 * Class CliUtil
 *
 * @package Vanilla\Cli
 */
class CliUtil {

    /**
     * Write a message.
     *
     * @param string $msg the message to write
     */
    public static function write($msg) {
        echo $msg.PHP_EOL;
    }

    /**
     * Throw an exception with the supplied message.
     *
     * @param string $msg Exception's message.
     * @throws Exception
     */
    public static function error($msg) {
        throw new Exception($msg.PHP_EOL);
    }
}
