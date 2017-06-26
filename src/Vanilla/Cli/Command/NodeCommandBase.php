<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license http://www.opensource.org/licenses/gpl-2.0.php GNU GPL v2
 * @package Vanilla\Cli\Command
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Vanilla\Cli\CliUtil;

/**
 * Class NodeCommand.
 */
abstract class NodeCommandBase extends Command {

    const MINIMUM_NODE_VERSION = '6.0.0';

    /**
     * AddonCmdBase constructor.
     *
     * @param Cli $cli The CLI instance
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->opt('debug:d', 'Break node process on the first line to attatch a debugger');
    }

    /**
     * @inheritdoc
     */
    final public function run(Args $args) {
        $this->spawnNodeProcess($this->getScriptFilePath(), $args);
    }

    /**
     * Get the path of the node file to execute in the child process
     *
     * @return string The file path of the node script to execute
     */
    abstract protected function getScriptFilePath();

    /**
     * AddonCommandBase's execution function.
     *
     * @param string $nodeFilePath The absolute file path of the
     *
     * @return void
     */
    final protected function spawnNodeProcess($nodeFilePath, Args $args) {
        $serializedArgs = json_encode($args->getOpts());
        $debugArg = array_key_exists('debug', $args->getOpts()) ? '--inspect --debug-brk --nolazy' : '';
        $output = "node $debugArg '$nodeFilePath' --color --options '$serializedArgs'";
        echo $output;
        system($output);
    }

    /**
     * Verify that the minimum required version of node is installed and on the path
     *
     * @return void
     */
    final private function isValidNodeInstall() {
        // Drop the 'v' of the begining of the version string
        $nodeVersionString = `node --version`;
        $droppedFirstCharacter = mb_substr(
            $nodeVersionString,
            1,
            mb_strlen($nodeVersionString)
        );

        $comparisonResult = version_compare($droppedFirstCharacter, self::MINIMUM_NODE_VERSION);

    }

    final private function printInvalidNodeError() {

    }
}

