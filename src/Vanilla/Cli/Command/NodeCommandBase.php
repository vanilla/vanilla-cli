<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license http://www.opensource.org/licenses/gpl-2.0.php GNU GPL v2
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Vanilla\Cli\CliUtil;

/**
 * Class NodeCommand.
 *r
 * @package Vanilla\Cli\Command
 */
abstract class NodeCommandBase extends Command {

    /**
     * AddonCmdBase constructor.
     *
     * @param Cli $cli
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
    }

    /**
     * @inheritdoc
     */
    final public function run(Args $args) {
        $this->spawnNodeProcess($this->getScriptFilePath());
    }

    /**
     * Get the path of the node file to execute in the child process
     */
    abstract protected function getScriptFilePath();

    /**
     * AddonCommandBase's execution function.
     *
     * @param string $nodeFilePath The absolute file path of the
     */
    final protected function spawnNodeProcess($nodeFilePath) {
        system('node ' . $nodeFilePath . ' --color', $out);
    }
}
