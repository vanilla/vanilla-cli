<?php

namespace Vanilla\Cli\Cmd;

class AddonJson extends Cmd {

    public function __construct(\Garden\Cli\Cli $cli) {
        parent::__construct($cli);
        $cli->description('Convert addons\' info array to json.');
    }

    public function run(\Garden\Cli\Args $args) {

    }
}
