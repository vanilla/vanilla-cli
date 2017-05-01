<?php

namespace Vanilla\Cli\Cmd;

abstract class Cmd {

    public function __construct(\Garden\Cli\Cli $cli) {
        $cli->command($this->getName());
    }

    /**
     * Return the name of the command.
     *
     * @return string
     */
    public function getName() {
        // Convert "\Namespace\SomeCommandName" to "some-command-name"
        $className = str_replace(__NAMESPACE__.'\\', '', static::class);
        $className = preg_replace('/([A-Z])/', '-$1', $className);
        $className = strtolower(ltrim($className, '-'));

        return $className;
    }

    abstract function run(\Garden\Cli\Args $args);
}
