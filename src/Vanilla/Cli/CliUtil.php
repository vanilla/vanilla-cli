<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

namespace Vanilla\Cli;

use \Exception;
use \Garden\Cli\LogFormatter;

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
    public static function fail($msg) {
        $logger = new LogFormatter();

        $logger
            ->setDateFormat('')
            ->error($msg);

        throw new Exception();
    }

    /**
     * Get the addon.json file in the current directory.
     */
    public static function getAddonJsonForDirectory($directory) {
        $addonJsonPath = $directory.'/addon.json';

        if (file_exists($addonJsonPath)) {
            $addonJson = json_decode(file_get_contents($addonJsonPath), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                CliUtil::write("\n\nThere were some issues parsing your addon.json file. Please ensure that it is valid JSON");
                CliUtil::fail("\nError Type: ".json_last_error_msg());
            }

            return $addonJson;
        } else {
            CliUtil::fail("No addon.json file was found. Make sure that you are in addons directory");
        }
    }
}
