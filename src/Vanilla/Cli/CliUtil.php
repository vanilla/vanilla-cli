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
     * Exits the process and prints an error message.
     *
     * @param string $msg The Error's message.
     */
    public static function fail($msg) {
        $logger = new LogFormatter();

        $logger
            ->setDateFormat('')
            ->error($msg);

        exit(1);
    }

    /**
     * Prints a yellow warning message
     *
     * @param string $msg Warning's message.
     */
    public static function warn($msg) {
        $logger = new LogFormatter();

        $logger
            ->setDateFormat('')
            ->warn($msg.PHP_EOL);
    }

    /**
     * Get the addon.json file in the current directory.
     */
    public static function getAddonJsonForDirectory($directory) {
        $addonJsonPath = $directory.'/addon.json';

        if (file_exists($addonJsonPath)) {
            $addonJson = json_decode(file_get_contents($addonJsonPath), true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                self::write("\n\nThere were some issues parsing your addon.json file. Please ensure that it is valid JSON");
                self::fail("\nError Type: ".json_last_error_msg());
            }

            return $addonJson;
        }
        self::fail("No addon.json file was found. Make sure that you are in an addon's directory");
    }
}
