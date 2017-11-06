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

    /**
     * Get the addon.json file in the current directory.
     */
    public static function getAddonJsonForCWD() {
        $addonJsonPath = getcwd().'/addon.json';

        if (file_exists($addonJsonPath)) {
            $addonJson = json_decode(file_get_contents($addonJsonPath), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                CliUtil::write("\n\nThere were some issues parsing your addon.json file. Please ensure that it is valid JSON");
                CliUtil::error("\nError Type: ".json_last_error_msg());
            }

            return $addonJson;
        }
    }
}
