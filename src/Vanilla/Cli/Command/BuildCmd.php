<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license http://www.opensource.org/licenses/gpl-2.0.php GNU GPL v2
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Garden\Cli\CliUtil;
use \Vanilla\AddonManager;

/**
 * Class AddonCacheCmd
 *
 * @package Vanilla\Cli\Command
 */
class BuildCmd extends NodeCommandBase {

    /**
     * AddonCacheCmd constructor.
     *
     * @param Cli $cli
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Run the javascirpt build process.');
        ;
    }

    protected function getScriptFilePath() {
        return realpath(dirname(__FILE__) . '/../../FrontendTools/index.js');
    }
}
