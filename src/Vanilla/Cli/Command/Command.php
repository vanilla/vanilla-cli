<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Cli;
use \Garden\Cli\Args;

/**
 * Class Command
 *
 * @package Vanilla\Cli\Command
 */
abstract class Command {

    /** @var bool */
    public $isVerbose = false;

    /**
     * Command constructor.
     *
     * @param Cli $cli
     */
    public function __construct(Cli $cli) {
        $cli
            ->command($this->getName());
    }

    /**
     * Return the name of the command.
     *
     * @return string
     */
    public function getName() {
        // Convert "\Namespace\SomeCommandNameCmd" to "some-command-name"
        $className = str_replace(__NAMESPACE__.'\\', '', static::class);
        $commandName = preg_replace('/cmd$/i', '', $className);
        $commandName = preg_replace('/([A-Z])/', '-$1', $commandName);
        $commandName = strtolower(ltrim($commandName, '-'));

        return $commandName;
    }

    /**
     * Command's execution function.
     *
     * @param Args $args
     * @return mixed
     */
    public abstract function run(Args $args);
}
