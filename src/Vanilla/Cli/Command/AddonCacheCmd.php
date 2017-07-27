<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */

namespace Vanilla\Cli\Command;

use \Garden\Cli\Args;
use \Garden\Cli\Cli;
use \Vanilla\AddonManager;

/**
 * Class AddonCacheCmd
 *
 * @package Vanilla\Cli\Command
 */
class AddonCacheCmd extends AddonCommandBase {

    /**
     * AddonCacheCmd constructor.
     *
     * @param Cli $cli
     */
    public function __construct(Cli $cli) {
        parent::__construct($cli);
        $cli->description('Generate addons\'s cache files.')
            ->opt('regenerate:r', 'Regenerate the cache files.');
    }

    /**
     * @inheritdoc
     */
    protected function doRun(Args $args, AddonManager $addonManager) {
        if ($args->getOpt('regenerate', false) !== false) {
            $addonManager->clearCache();
        }

        foreach (array_keys($addonManager->getScanDirs()) as $addonType) {
            $addonManager->lookupAllByType($addonType);
        }
    }
}
