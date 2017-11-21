<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

namespace Vanilla\Cli;

use \DirectoryIterator;
use \IteratorIterator;
use \RegexIterator;
use \Garden\Cli\Args;
use \Vanilla\Cli\Command\Command;

/**
 * Class Cli
 *
 * @package Vanilla\Cli
 */
class Cli {
    private $cli;
    private $commands = [];

    /**
     * Cli constructor.
     */
    public function __construct() {
        $this->cli = new \Garden\Cli\Cli();
        $this->scanCommands();
    }

    /**
     * Scan for available commands.
     */
    private function scanCommands() {
        $dirIterator = new DirectoryIterator(__DIR__.'/Command');
        $commandsIt = new RegexIterator(new IteratorIterator($dirIterator), '/^.+\Cmd.php$/', RegexIterator::GET_MATCH);
        $commandNameSpace =  __NAMESPACE__.'\\Command\\';
        foreach ($commandsIt as $info) {
            $commandName = $commandNameSpace.pathinfo($info[0], PATHINFO_FILENAME);
            if (is_subclass_of($commandName, $commandNameSpace.'Command')) {
                $command = new $commandName($this->cli);
                $this->commands[$command->getName()] = $command;
            }
        }
    }

    /**
     * Dispatch arguments to the correct command.
     *
     * @param Args $args Cli's arguments.
     */
    private function dispatch(Args $args) {
            /** @var Command $command */
            $command = $this->commands[$args->getCommand()];
            $command->run($args);
    }

    /**
     * Cli's execution function.
     *
     * @param array|null $argv Arguments. If nothing is supplied $GLOBALS['argv'] will be used instead.
     */
    public function run(array $argv = null) {
        // Prepend "vanilla" to the arguments since the first element should always be the script name.
        if (is_array($argv) && count($argv) === 0 && $argv[0] !== 'vanilla') {
            array_unshift($argv, 'vanilla');
        }

        $args = $this->cli->parse($argv);
        $this->dispatch($args);
    }
}
