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
 * Class NodeCommandBase.
 */
abstract class NodeCommandBase extends Command {

    const MINIMUM_NODE_VERSION = '6.0.0';

    /**
     * NodeCommandBase constructor.
     *
     * @param Cli $cli The CLI instance
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->opt('debug:d', 'Break node process on the first line to attatch a debugger', false, 'bool');
    }

    /**
     * @inheritdoc
     */
    public function run(Args $args) {
        $validNode = $this->isValidNodeInstall();
        $this->doRun($args);
    }

    /**
     * The NodeCommand's execution function
     *
     * @param Args $args The CLI arguments
     *
     * @return void
     */
    abstract protected function doRun(Args $args);

    /**
     * Spawn the child node process.
     *
     * The node process will handle the rest of the work for this command.
     * The build tools can output so much to stdio that it is not worth
     * trying to parse any of it of from this side.
     *
     * @param string $nodeFilePath The absolute file path of the
     * @param Args $args The arguments passed from the command line
     *
     * @return void
     */
    final public function spawnNodeProcess(string $nodeFilePath, Args $args) {
        $serializedArgs = json_encode($args->getOpts());
        $debugArg = $args->getOpt('debug') ? '--inspect --debug-brk --nolazy' : '';
        $command = "node $debugArg '$nodeFilePath' --color --options '$serializedArgs'";
        system($command);
    }

    /**
     * Verify that the minimum required version of node is installed and on the path
     *
     * @return boolean
     */
    private function isValidNodeInstall() {
        $nodeExists = `which node`;
        $yarnExists = `which yarn`;

        if (empty($nodeExists) || empty($yarnExists)) {
            return false;
        }

        $nodeVersionString = `node --version`;

        // Drop the 'v' of the begining of the version string
        $droppedFirstCharacter = substr($nodeVersionString, 1);

        $comparisonResult = version_compare($droppedFirstCharacter, self::MINIMUM_NODE_VERSION);
        return $comparisonResult;
    }

    /**
     * Print an error message about node not being installed
     *
     * @return void
     */
    final protected function printInvalidNodeError() {
        CliUtil::error('Node and yarn are not installed correctly. Check http://github.com/vanilla/vanilla-cli for installation instructions.');
    }
}
