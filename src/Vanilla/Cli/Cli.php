<?php

namespace Vanilla\Cli;

class Cli {
    private $cli;
    private $commands = [];

    public function __construct() {
        $this->cli = new \Garden\Cli\Cli();
        $this->scanCommands();
    }

    private function scanCommands() {
        $dirIterator = new \DirectoryIterator(__DIR__.'/Cmd');
        $commandsIt = new \RegexIterator(new \IteratorIterator($dirIterator), '/^.+\.php$/', \RegexIterator::GET_MATCH);
        foreach ($commandsIt as $info) {
            $cmdName = __NAMESPACE__.'\\Cmd\\'.pathinfo($info[0], PATHINFO_FILENAME);
            if (is_subclass_of($cmdName, 'Vanilla\\Cli\\Cmd\\Cmd')) {
                $cmd = new $cmdName($this->cli);
                $this->commands[$cmd->getName()] = $cmd;
            }
        }
    }

    private function dispatch(\Garden\Cli\Args $args) {
        $commandName = $args->getCommand();
        if ($commandName) {
            /** @var \Vanilla\Cli\Cmd\Cmd $command */
            $command = $this->commands[$commandName];
            $command->run($args);
        }
    }

    public function run(array $argv = null) {
        // Prepend "vanilla" to the arguments since the first element should always be the script name.
        if (is_array($argv) && count($argv) === 0 && $argv[0] !== 'vanilla') {
            array_unshift($argv, 'vanilla');
        }

        $args = $this->cli->parse($argv);
        $this->dispatch($args);
    }
}
