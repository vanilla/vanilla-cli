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
        // Convert "\Namespace\SomeCommandNameCmd" to "some-command-name"
        $className = str_replace(__NAMESPACE__.'\\', '', static::class);
        $cmdName = preg_replace('/cmd$/i', '', $className);
        $cmdName = preg_replace('/([A-Z])/', '-$1', $cmdName);
        $cmdName = strtolower(ltrim($cmdName, '-'));

        return $cmdName;
    }

    abstract function run(\Garden\Cli\Args $args);
}
