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

    // We require node 8 because it is the latest LTS with support for async/await
    const MINIMUM_NODE_VERSION = '8.0.0';

    public $nodeVersion;

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
    final public function spawnNodeProcessFromFile(string $nodeFilePath, Args $args) {
        $serializedArgs = json_encode($args->getOpts());
        $debugArg = $args->getOpt('debug') ? '--inspect --inspect-brk --nolazy' : '';
        $command = "node $debugArg '$nodeFilePath' --color --options '$serializedArgs'";
        system($command);
    }

    final public function spawnNodeProcessFromPackageMain(string $directory, Args $args) {
        $serializedArgs = json_encode($args->getOpts());
        $debugArg = $args->getOpt('debug') ? '--inspect --inspect-brk --nolazy' : '';
        $packageJson = json_decode(file_get_contents($directory.'/package.json'), true);
        $command = $packageJson['main'] ?? false;
        $scriptPath = realpath("$directory/$command");

        if ($command && $scriptPath) {
            $runCommand = "node $debugArg $scriptPath --color --options '$serializedArgs'";
            system($runCommand);
        } else {
            CliUtil::error("Command not found");
        }
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
            CliUtil::error('Node and Yarn are not installed properly or are not visible on your path.
            \nCheck http://github.com/vanilla/vanilla-cli for installation instructions.');
            return false;
        }

        $nodeVersionString = `node --version`;

        // Drop the 'v' of the begining of the version string
        $droppedFirstCharacter = trim(substr($nodeVersionString, 1));

        $comparisonResult = version_compare($droppedFirstCharacter, self::MINIMUM_NODE_VERSION);
        if ($comparisonResult) {
            $this->nodeVersion = $droppedFirstCharacter;
        } else {
            CliUtil::error("Node.js version out of date. Minimum required version is ${self::MINIMUM_NODE_VERSION}
Check http://github.com/vanilla/vanilla-cli for installation instructions.");
        }
        return $comparisonResult;
    }
}
