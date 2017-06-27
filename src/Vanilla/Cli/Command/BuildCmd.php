<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license http://www.opensource.org/licenses/gpl-2.0.php GNU GPL v2
 * @package Vanilla\Cli\Command
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Cli;

/**
 * Class BuildCmd.
 */
class BuildCmd extends NodeCommandBase {

    /**
     * BuildCmd constructor.
     *
     * @param Cli $cli The CLI instance
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Run the javascirpt build process.')
            ->opt('watch:w', 'Run the build process in watch mode. Best used with the livereload browsre extension.')
            ->opt('process:p', 'Which version of the build process to use. This will override the one specified in the addon.json')
            ->opt('verbose:v', 'Show detailed build process output');
        ;
    }

    /**
     * @inheritDoc
     */
    protected function getScriptFilePath() {
        return realpath(__DIR__.'/../../FrontendTools/index.js');
    }
}
