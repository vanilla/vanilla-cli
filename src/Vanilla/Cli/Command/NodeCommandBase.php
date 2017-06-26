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
    public function run(Args $args) {
        $validNode = $this->isValidNodeInstall();

        if ($validNode) {
            $this->spawnNodeProcess($this->getScriptFilePath(), $args);
        } else {
            $this->printInvalidNodeError();
        }
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
     * @param Args $args The arguments passed from the command line
     *
     * @return void
     */
    final protected function spawnNodeProcess($nodeFilePath, Args $args) {
        $serializedArgs = json_encode($args->getOpts());
        $debugArg = array_key_exists('debug', $args->getOpts()) ? '--inspect --debug-brk --nolazy' : '';
        $command = "node $debugArg '$nodeFilePath' --color --options '$serializedArgs'";
        system($command);
    }

    /**
     * Verify that the minimum required version of node is installed and on the path
     *
     * @return boolean
     */
    final protected function isValidNodeInstall() {
        $nodeExists = shell_exec('which node');
        $yarnExists = shell_exec('which yarn');

        if (empty($nodeExists) || empty($yarnExists)) {
            return false;
        }

        $nodeVersionString = shell_exec('node --version');

        // Drop the 'v' of the begining of the version string
        $droppedFirstCharacter = mb_substr(
            $nodeVersionString,
            1,
            mb_strlen($nodeVersionString)
        );

        $comparisonResult = version_compare($droppedFirstCharacter, self::MINIMUM_NODE_VERSION);
        return $comparisonResult;
    }

    final protected function printInvalidNodeError() {
        CliUtil::error('Node and yarn are not installed correctly. Try running
    vanilla build-doctor

for assistance or check http://github.com/vanilla/vanilla-cli.');
    }
}
