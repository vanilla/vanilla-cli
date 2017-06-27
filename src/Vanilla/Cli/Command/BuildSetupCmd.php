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
use \Vanilla\AddonManager;

/**
 * Class BuildSetupCommand.
 */
class BuildSetupCmd extends NodeCommandBase {

    /**
     * AddonCacheCmd constructor.
     *
     * @param Cli $cli The CLI instance
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Install dependancies for the javascript build process. Run this after every update');
    }

    /**
     * @inheritdoc
     */
    final public function run(Args $args) {
        $validNode = $this->isValidNodeInstall();

        if ($validNode) {
            $workingDirectory = getcwd();
            $this->installBaseNodeDeps();
            $this->installProcessNodeDeps();
            chdir($workingDirectory);
        } else {
            $this->printInvalidNodeError();
        }
    }

    /**
     * Install node dependancies for the top level build process
     *
     * @return void
     */
    final public function installBaseNodeDeps() {
        $basepath = realpath(__DIR__.'/../../FrontendTools');
        chdir($basepath);

        CliUtil::write("\nInstall dependancies for Build Process Core\n");
        system('yarn install --color');
    }

    /**
     * Install node dependancies in all process version subdirectories
     *
     * @return void
     */
    final public function installProcessNodeDeps() {
        $basepath = realpath(__DIR__.'/../../FrontendTools/versions');
        chdir($basepath);

        foreach (glob('*', GLOB_ONLYDIR) as $processVersion) {
            CliUtil::write("\nInstall dependancies for Build Process version $processVersion\n");

            chdir($basepath."/$processVersion");
            system('yarn install --color');
        }
    }
}
